import { expect, test } from "@playwright/test";
import { closeDb, db, getParticipant, getScoredRev, scoreSlideAsOwner, seedQuizSession, startSlide, teardown } from "./_helpers";

// DB-level QA of the score_quiz_slide RPC. Verifies the bug we fixed: a
// correct answer must net non-zero points, even when response_ms is null
// (which used to collapse the formula to 0 + filter the row out).

test.describe.configure({ mode: "serial" });

// Per-project + per-run unique code so parallel desktop/mobile projects
// don't wipe each other's seed data via `delete from presentations where code = ...`.
const CODE = `QAS${(process.env.PWPROJECT ?? Math.random().toString(36).slice(2, 5)).toUpperCase()}`;

test.afterAll(async () => {
  await closeDb();
});

test("scoring: correct fast answer earns ~max points", async () => {
  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);

    const c = await db();
    const { rows } = await c.query(
      `insert into participants (presentation_id, nickname, participant_token)
       values ($1, 'Fast', gen_random_uuid()::text)
       returning id`,
      [seed.presentationId],
    );
    const pid = rows[0].id as string;

    // Correct answer, ~1s response time.
    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms)
       values ($1, $2, 0, 1000)`,
      [seed.slide1Id, pid],
    );

    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const p = await getParticipant(pid);

    // Base 500 + ~475 speed bonus (1000ms / 20000ms time used).
    expect(p.score).toBeGreaterThan(900);
    expect(p.score).toBeLessThanOrEqual(1000);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("scoring: correct slow answer still earns the base 500", async () => {
  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);

    const c = await db();
    const { rows } = await c.query(
      `insert into participants (presentation_id, nickname, participant_token)
       values ($1, 'Slow', gen_random_uuid()::text)
       returning id`,
      [seed.presentationId],
    );
    const pid = rows[0].id as string;

    // Correct answer at the very last moment (response_ms == limit).
    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms)
       values ($1, $2, 0, 20000)`,
      [seed.slide1Id, pid],
    );

    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const p = await getParticipant(pid);

    expect(p.score).toBe(500);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("scoring: null response_ms is treated as fast (regression: was 0)", async () => {
  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);

    const c = await db();
    const { rows } = await c.query(
      `insert into participants (presentation_id, nickname, participant_token)
       values ($1, 'NullMs', gen_random_uuid()::text)
       returning id`,
      [seed.presentationId],
    );
    const pid = rows[0].id as string;

    // Correct answer with no timing — old formula awarded 0.
    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms)
       values ($1, $2, 0, null)`,
      [seed.slide1Id, pid],
    );

    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const p = await getParticipant(pid);

    expect(p.score).toBe(1000);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("scoring: wrong answer earns nothing", async () => {
  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);

    const c = await db();
    const { rows } = await c.query(
      `insert into participants (presentation_id, nickname, participant_token)
       values ($1, 'Wrong', gen_random_uuid()::text)
       returning id`,
      [seed.presentationId],
    );
    const pid = rows[0].id as string;

    // Wrong answer.
    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms)
       values ($1, $2, 1, 1000)`,
      [seed.slide1Id, pid],
    );

    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const p = await getParticipant(pid);

    expect(p.score).toBe(0);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("scoring: idempotent — scoring twice does not double-count", async () => {
  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);

    const c = await db();
    const { rows } = await c.query(
      `insert into participants (presentation_id, nickname, participant_token)
       values ($1, 'Twice', gen_random_uuid()::text)
       returning id`,
      [seed.presentationId],
    );
    const pid = rows[0].id as string;

    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms)
       values ($1, $2, 0, 1000)`,
      [seed.slide1Id, pid],
    );

    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const first = await getParticipant(pid);
    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const second = await getParticipant(pid);

    expect(first.score).toBeGreaterThan(0);
    expect(second.score).toBe(first.score);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("scoring: bumps scored_rev on a real scoring, not on an idempotent re-score", async () => {
  // Skip gracefully if migration 0026 hasn't been applied to this DB yet, so a
  // push doesn't red CI before the column exists. Once applied, this asserts.
  const probe = await db();
  const col = await probe.query(
    `select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'presentations' and column_name = 'scored_rev'`,
  );
  test.skip(col.rows.length === 0, "scored_rev absent — apply migration 0026_scored_rev_signal.sql");

  const seed = await seedQuizSession({ code: CODE });
  try {
    await startSlide(seed.presentationId, seed.slide1Id);

    const c = await db();
    const { rows } = await c.query(
      `insert into participants (presentation_id, nickname, participant_token)
       values ($1, 'Rev', gen_random_uuid()::text)
       returning id`,
      [seed.presentationId],
    );
    const pid = rows[0].id as string;

    await c.query(
      `insert into responses (slide_id, participant_id, value_index, response_ms)
       values ($1, $2, 0, 1000)`,
      [seed.slide1Id, pid],
    );

    // A real scoring (rows inserted) signals the audience to refetch.
    const revBefore = await getScoredRev(seed.presentationId);
    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    const revAfter = await getScoredRev(seed.presentationId);
    expect(revAfter).toBe(revBefore + 1);

    // Re-scoring inserts nothing (on conflict do nothing), so it must NOT bump
    // again — no needless audience refetch.
    await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
    expect(await getScoredRev(seed.presentationId)).toBe(revAfter);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
