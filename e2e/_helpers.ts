import { Client } from "pg";

// Minimal helper that talks directly to the Klikr Postgres for test setup
// and teardown. Reads POSTGRES_URL from env — `railway run -s Postgres
// npx playwright test` injects it. No service-role client / RLS games.

let client: Client | null = null;

export async function db() {
  if (client) return client;
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL not set. Run via `railway run -s Postgres`.");
  client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
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

export async function teardown(presentationId: string, ownerEmail: string) {
  const c = await db();
  // ON DELETE CASCADE handles slides/participants/responses.
  await c.query(`delete from presentations where id = $1`, [presentationId]);
  await c.query(`delete from auth.users where email = $1`, [ownerEmail]);
}
