import { Client } from "pg";

// Minimal helper that talks directly to the Klikr Postgres for test setup
// and teardown. Reads POSTGRES_URL from env — `railway run -s Postgres
// npx playwright test` injects it. No service-role client / RLS games.

let client: Client | null = null;

export async function db() {
  if (client) return client;
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL not set. Run via `railway run -s Postgres`.");
  const c = new Client({ connectionString: url, keepAlive: true });
  // Pooled connections (Supabase session pooler) can be reaped mid-run. Drop
  // the cached handle on error so the next db() reconnects instead of reusing
  // a dead client — otherwise one drop cascades "Connection terminated" into
  // every subsequent query and retry.
  c.on("error", () => {
    if (client === c) client = null;
  });
  await c.connect();
  client = c;
  return client;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}

// Seed an auth user + presentation with no slides. Use addSlide() to attach
// slides of any type. Returns ids the test needs.
export async function seedSession(opts: { code: string }) {
  const c = await db();
  const ownerEmail = `qa+${opts.code.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@klikr.test`;
  const existing = await c.query(`select id from auth.users where email = $1 limit 1`, [ownerEmail]);
  let ownerId: string;
  if (existing.rows.length > 0) {
    ownerId = existing.rows[0].id;
  } else {
    const { rows: userRows } = await c.query(
      `insert into auth.users (id, email, instance_id, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
       values (gen_random_uuid(), $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
       returning id`,
      [ownerEmail],
    );
    ownerId = userRows[0].id;
  }
  await c.query(`delete from presentations where code = $1`, [opts.code]);
  const { rows: presRows } = await c.query(
    `insert into presentations (id, owner_id, code, title, state, current_slide_id, created_at)
     values (gen_random_uuid(), $1, $2, 'QA test deck', 'lobby', null, now())
     returning id`,
    [ownerId, opts.code],
  );
  return { ownerId, ownerEmail, presentationId: presRows[0].id as string };
}

// Seed a complete test session: anon user + presentation + quiz slides.
// Returns ids needed by the tests.
export async function seedQuizSession(opts: { code: string }) {
  const c = await db();
  // Per-test unique email so parallel projects (desktop+mobile) don't race on
  // the same auth.users row. Uses opts.code as a stable prefix for cleanup.
  const ownerEmail = `qa+${opts.code.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@klikr.test`;
  // 1) Make sure we have an auth user we can attribute the presentation to.
  //    auth.users has no unique constraint on email — do a manual upsert.
  const existing = await c.query(`select id from auth.users where email = $1 limit 1`, [ownerEmail]);
  let ownerId: string;
  if (existing.rows.length > 0) {
    ownerId = existing.rows[0].id;
  } else {
    const { rows: userRows } = await c.query(
      `insert into auth.users (id, email, instance_id, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
       values (gen_random_uuid(), $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
       returning id`,
      [ownerEmail],
    );
    ownerId = userRows[0].id;
  }

  // Wipe any prior presentation with this code so re-runs are idempotent.
  await c.query(`delete from presentations where code = $1`, [opts.code]);

  const { rows: presRows } = await c.query(
    `insert into presentations (id, owner_id, code, title, state, current_slide_id, created_at)
     values (gen_random_uuid(), $1, $2, 'QA test deck', 'lobby', null, now())
     returning id`,
    [ownerId, opts.code],
  );
  const presentationId = presRows[0].id as string;

  // Two quiz slides. correct_index 0 on slide 1, correct_index 2 on slide 2.
  const slide1Cfg = { options: ["Right", "Wrong A", "Wrong B", "Wrong C"], correct_index: 0, time_limit_s: 20 };
  const slide2Cfg = { options: ["Wrong A", "Wrong B", "Right", "Wrong C"], correct_index: 2, time_limit_s: 20 };
  const { rows: s1 } = await c.query(
    `insert into slides (id, presentation_id, position, type, question, config, kahoot_mode, created_at)
     values (gen_random_uuid(), $1, 1, 'quiz', 'QA: pick the right one', $2::jsonb, true, now())
     returning id`,
    [presentationId, JSON.stringify(slide1Cfg)],
  );
  const { rows: s2 } = await c.query(
    `insert into slides (id, presentation_id, position, type, question, config, kahoot_mode, created_at)
     values (gen_random_uuid(), $1, 2, 'quiz', 'QA: pick the right one again', $2::jsonb, true, now())
     returning id`,
    [presentationId, JSON.stringify(slide2Cfg)],
  );

  return {
    ownerId,
    ownerEmail,
    presentationId,
    slide1Id: s1[0].id as string,
    slide2Id: s2[0].id as string,
  };
}

// Add a slide of an arbitrary type to an existing presentation. Returns the
// new slide id. Position auto-increments past whatever's already there.
export async function addSlide(opts: {
  presentationId: string;
  type: "mcq" | "wordcloud" | "open" | "qa" | "ranking" | "rating";
  question: string;
  config: Record<string, unknown>;
}) {
  const c = await db();
  const { rows: posRows } = await c.query(
    `select coalesce(max(position), 0) + 1 as next_pos from slides where presentation_id = $1`,
    [opts.presentationId],
  );
  const position = posRows[0].next_pos as number;
  const { rows } = await c.query(
    `insert into slides (id, presentation_id, position, type, question, config, kahoot_mode, created_at)
     values (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, false, now())
     returning id`,
    [opts.presentationId, position, opts.type, opts.question, JSON.stringify(opts.config)],
  );
  return rows[0].id as string;
}

// Mark a presentation as closed and stamp scores onto its participants. Used
// by the podium UI test — no need to drive the host through end-session.
export async function closePresentation(presentationId: string) {
  const c = await db();
  await c.query(`update presentations set state = 'closed' where id = $1`, [presentationId]);
}

export async function setParticipantScore(participantId: string, score: number) {
  const c = await db();
  await c.query(`update participants set score = $1 where id = $2`, [score, participantId]);
}

export async function insertParticipant(opts: { presentationId: string; nickname: string; score?: number }) {
  const c = await db();
  const { rows } = await c.query(
    `insert into participants (presentation_id, nickname, participant_token, score)
     values ($1, $2, gen_random_uuid()::text, $3)
     returning id`,
    [opts.presentationId, opts.nickname, opts.score ?? 0],
  );
  return rows[0].id as string;
}

export async function startSlide(presentationId: string, slideId: string) {
  const c = await db();
  await c.query(
    `update presentations
       set state = 'active',
           current_slide_id = $2,
           current_slide_started_at = now()
     where id = $1`,
    [presentationId, slideId],
  );
}

// Score the slide as the owner — we set the JWT claim so the function's
// `auth.uid()` check passes. Returns the count of participants whose score
// was updated.
export async function scoreSlideAsOwner(slideId: string, ownerId: string) {
  const c = await db();
  // SET LOCAL doesn't accept bind params, but set_config() does. Wrap in a
  // transaction so `local = true` actually scopes to it.
  await c.query("begin");
  try {
    await c.query(`select set_config('role', 'authenticated', true)`);
    await c.query(
      `select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: ownerId, role: "authenticated" })],
    );
    const { rows } = await c.query(`select score_quiz_slide($1::uuid) as updated`, [slideId]);
    await c.query("commit");
    return rows[0].updated as number;
  } catch (err) {
    await c.query("rollback");
    throw err;
  }
}

export async function getParticipant(participantId: string) {
  const c = await db();
  const { rows } = await c.query(
    `select id, nickname, score from participants where id = $1`,
    [participantId],
  );
  return rows[0] ?? null;
}

// The audience refetches its leaderboard whenever this counter changes, so a
// real scoring must bump it (and an idempotent re-score must not).
export async function getScoredRev(presentationId: string) {
  const c = await db();
  const { rows } = await c.query(
    `select scored_rev from presentations where id = $1`,
    [presentationId],
  );
  return (rows[0]?.scored_rev ?? 0) as number;
}

export async function teardown(presentationId: string, ownerEmail: string) {
  // Cleanup is best-effort: if the pooled connection was reaped, reconnect once
  // and retry, but never let a cleanup failure fail an otherwise-passing test.
  const run = async () => {
    const c = await db();
    // ON DELETE CASCADE handles slides/participants/responses.
    await c.query(`delete from presentations where id = $1`, [presentationId]);
    await c.query(`delete from auth.users where email = $1`, [ownerEmail]);
  };
  try {
    await run();
  } catch {
    client = null; // force reconnect
    try {
      await run();
    } catch {
      // leftover rows use a unique per-test code/email and are harmless.
    }
  }
}
