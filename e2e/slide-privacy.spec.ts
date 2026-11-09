import { expect, test } from "@playwright/test";
import { closeDb, db, seedQuizSession, startSlide, teardown } from "./_helpers";

// DB-level check of migration 0028. Players hold the public anon key, so RLS
// must not let them read `slides`: slides.config carries every quiz's
// correct_index. The audience page loads slides with the service role
// instead; owners keep access through "owners manage slides".

test.describe.configure({ mode: "serial" });

const CODE = `QAP${(process.env.PWPROJECT ?? Math.random().toString(36).slice(2, 5)).toUpperCase()}`;

test.afterAll(async () => {
  await closeDb();
});

/** Count a presentation's slides as `role`, the way PostgREST would run the
 *  query (same set_config approach as scoreSlideAsOwner). Rolled back. */
async function countSlidesAs(presentationId: string, role: "anon" | "authenticated", sub?: string) {
  const c = await db();
  await c.query("begin");
  try {
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(sub ? { sub, role } : { role })]);
    await c.query(`select set_config('role', $1, true)`, [role]);
    const { rows } = await c.query(`select count(*)::int as n from slides where presentation_id = $1`, [presentationId]);
    return rows[0].n as number;
  } finally {
    await c.query("rollback");
  }
}

test("RLS: the anon key can't read a live session's slides (quiz answers)", async () => {
  const c = await db();
  const { rows: oldPolicy } = await c.query(
    `select 1 from pg_policies
      where schemaname = 'public' and tablename = 'slides'
        and policyname = 'public read slides for active presentations'`,
  );
  test.skip(oldPolicy.length > 0, "migration 0028 has not been applied to this database yet");

  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);
    expect(await countSlidesAs(seed.presentationId, "anon")).toBe(0);
    expect(await countSlidesAs(seed.presentationId, "authenticated", seed.ownerId)).toBe(2);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
