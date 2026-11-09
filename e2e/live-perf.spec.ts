import { expect, test } from "@playwright/test";
import { addSlide, closeDb, db, getScoredRev, insertParticipant, seedQuizSession, startSlide, teardown } from "./_helpers";

// Coverage for migration 0027 (get_standing / get_qa_votes / move_slide) and
// the quiz "get ready" intro. DB-level tests skip themselves when the
// migration hasn't been applied to the test database yet.

test.describe.configure({ mode: "serial" });

const CODE = `LVP${(process.env.PWPROJECT ?? Math.random().toString(36).slice(2, 5)).toUpperCase()}`;

test.afterAll(async () => {
  await closeDb();
});

async function hasFunction(name: string) {
  const c = await db();
  const { rows } = await c.query(`select 1 from pg_proc where proname = $1`, [name]);
  return rows.length > 0;
}

// Call a security-definer RPC as the presentation owner (auth.uid() = owner).
async function asOwner<T>(ownerId: string, sql: string, params: unknown[]): Promise<T> {
  const c = await db();
  await c.query("begin");
  try {
    await c.query(`select set_config('role', 'authenticated', true)`);
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: ownerId, role: "authenticated" }),
    ]);
    const { rows } = await c.query(sql, params);
    await c.query("commit");
    return rows[0] as T;
  } catch (err) {
    await c.query("rollback");
    throw err;
  }
}

test("get_standing: rank, player ahead, top-N, token check", async () => {
  test.skip(!(await hasFunction("get_standing")), "apply migration 0027_live_perf.sql");
  const seed = await seedQuizSession({ code: CODE });
  try {
    const a = await insertParticipant({ presentationId: seed.presentationId, nickname: "Ann", score: 1200 });
    const b = await insertParticipant({ presentationId: seed.presentationId, nickname: "Bo", score: 800 });
    await insertParticipant({ presentationId: seed.presentationId, nickname: "Cy", score: 400 });
    const c = await db();
    const { rows: tok } = await c.query(`select participant_token from participants where id = $1`, [b]);

    const { rows } = await c.query(`select get_standing($1, $2, 2) as s`, [b, tok[0].participant_token]);
    const s = rows[0].s;
    expect(s.me.rank).toBe(2);
    expect(s.total).toBe(3);
    expect(s.ahead).toEqual({ nickname: "Ann", score: 1200 });
    expect(s.top.map((r: { id: string }) => r.id)).toEqual([a, b]);
    expect(s.presentation_id).toBe(seed.presentationId);

    await expect(c.query(`select get_standing($1, 'wrong-token', 5)`, [b])).rejects.toThrow(/invalid participant session/);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("get_qa_votes: per-question totals and my votes", async () => {
  test.skip(!(await hasFunction("get_qa_votes")), "apply migration 0027_live_perf.sql");
  const seed = await seedQuizSession({ code: CODE });
  try {
    const qa = await addSlide({ presentationId: seed.presentationId, type: "qa", question: "Ask", config: {} });
    const p1 = await insertParticipant({ presentationId: seed.presentationId, nickname: "P1" });
    const p2 = await insertParticipant({ presentationId: seed.presentationId, nickname: "P2" });
    const c = await db();
    const { rows: q } = await c.query(
      `insert into responses (slide_id, participant_id, value_text) values ($1, $2, 'Why?') returning id`,
      [qa, p1],
    );
    await c.query(`insert into question_votes (response_id, participant_id) values ($1, $2), ($1, $3)`, [q[0].id, p1, p2]);

    const { rows } = await c.query(`select * from get_qa_votes($1, $2)`, [qa, p2]);
    expect(rows).toEqual([{ response_id: q[0].id, votes: 2, mine: true }]);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("move_slide: scores the quiz it leaves, intro on quiz targets, edges + permissions", async () => {
  test.skip(!(await hasFunction("move_slide")), "apply migration 0027_live_perf.sql");
  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);
    const pid = await insertParticipant({ presentationId: seed.presentationId, nickname: "Mover" });
    const c = await db();
    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms) values ($1, $2, 0, 1000)`,
      [seed.slide1Id, pid],
    );
    const revBefore = await getScoredRev(seed.presentationId);

    const moved = await asOwner<{ r: { moved: boolean; current_slide_id: string } }>(
      seed.ownerId,
      `select move_slide($1, 'next', 3000) as r`,
      [seed.presentationId],
    );
    expect(moved.r.moved).toBe(true);
    expect(moved.r.current_slide_id).toBe(seed.slide2Id);

    const { rows } = await c.query(
      `select p.score, pr.scored_rev,
              extract(epoch from pr.current_slide_started_at - now()) as lead_s
         from participants p, presentations pr
        where p.id = $1 and pr.id = $2`,
      [pid, seed.presentationId],
    );
    expect(rows[0].score).toBeGreaterThan(900); // scored on the way out
    expect(rows[0].scored_rev).toBe(revBefore + 1);
    // Quiz target: answer window opens ~3s in the future.
    expect(Number(rows[0].lead_s)).toBeGreaterThan(2);
    expect(Number(rows[0].lead_s)).toBeLessThan(4);

    // Edge: nothing after the last slide.
    const edge = await asOwner<{ r: { moved: boolean } }>(seed.ownerId, `select move_slide($1, 'next', 3000) as r`, [
      seed.presentationId,
    ]);
    expect(edge.r.moved).toBe(false);

    // Strangers can't drive someone else's deck.
    await expect(
      asOwner(
        "00000000-0000-0000-0000-000000000000",
        `select move_slide($1, 'prev', 0) as r`,
        [seed.presentationId],
      ),
    ).rejects.toThrow(/not allowed/);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("quiz intro: phone shows 'Get ready', then the answer tiles", async ({ page }) => {
  const seed = await seedQuizSession({ code: CODE });
  try {
    await page.goto(`/play/${CODE}`);
    const nameInput = page.locator('input[placeholder*="nickname" i]');
    await nameInput.fill("Ready");
    await page.getByRole("button", { name: /^join$/i }).click();
    await expect(nameInput).toBeHidden({ timeout: 10_000 });

    // Open the answer window 4s from now (as move_slide would with an intro).
    const c = await db();
    await c.query(
      `update presentations
          set state = 'active', current_slide_id = $2,
              current_slide_started_at = now() + interval '4 seconds'
        where id = $1`,
      [seed.presentationId, seed.slide1Id],
    );
    await page.reload();

    await expect(page.getByText(/get ready/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /Option A: Right/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Option A: Right/ })).toBeVisible({ timeout: 8_000 });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
