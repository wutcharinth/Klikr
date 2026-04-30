import { expect, test } from "@playwright/test";
import { closeDb, db, getParticipant, scoreSlideAsOwner, seedQuizSession, startSlide, teardown } from "./_helpers";

// End-to-end audience flow: open /play/<code>, pick a nickname, land in the
// lobby, host moves to a quiz slide, audience taps the right tile, host
// scores the slide, leaderboard reflects the points.

test.describe.configure({ mode: "serial" });

// Random per-run code so parallel projects (desktop+mobile) and re-runs
// don't fight over the same presentation row.
const CODE = `QAF${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

let seed: Awaited<ReturnType<typeof seedQuizSession>>;

test.beforeAll(async () => {
  seed = await seedQuizSession({ code: CODE });
});

test.afterAll(async () => {
  if (seed) await teardown(seed.presentationId, seed.ownerEmail);
  await closeDb();
});

test("audience can join with a nickname", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(`/play/${CODE}`);
  const nameInput = page.locator('input[placeholder*="nickname" i]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill("QABot");
  await page.getByRole("button", { name: /^join$/i }).click();

  // Wait for the form to disappear OR for any error to surface.
  try {
    await expect(nameInput).toBeHidden({ timeout: 10_000 });
  } catch (err) {
    if (consoleErrors.length > 0) {
      throw new Error(`join did not complete. Console errors:\n${consoleErrors.join("\n")}`);
    }
    throw err;
  }
  // Diagnostics: dump the body text once the form is hidden so we can
  // see exactly what state the audience view rendered in.
  const bodyText = (await page.locator("body").innerText()).slice(0, 500);
  expect(bodyText.length).toBeGreaterThan(0);
  // The lobby view says "Hi <name>! Waiting for the presenter to start…"
  // We look for any of those signals — the screen between join and the
  // first slide can also be a brief "Up next…".
  expect(
    bodyText,
    `Post-join body text was: ${bodyText}`,
  ).toMatch(/QABot|waiting|up next/i);
});

test("audience answers a Kahoot quiz and earns points", async ({ page }) => {
  // Each test starts with a fresh browser context (no shared localStorage),
  // so this test joins fresh, then answers.
  await page.goto(`/play/${CODE}`);
  const nameInput = page.locator('input[placeholder*="nickname" i]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill("QuizBot");
  await page.getByRole("button", { name: /^join$/i }).click();
  await expect(nameInput).toBeHidden({ timeout: 10_000 });

  // Capture this participant's id so we can read their score later.
  const c = await db();
  const { rows } = await c.query(
    `select id from participants where presentation_id = $1 and nickname = 'QuizBot' order by created_at desc limit 1`,
    [seed.presentationId],
  );
  const participantId = rows[0]?.id as string | undefined;
  expect(participantId).toBeTruthy();

  // Host starts slide 1 (correct_index=0). The audience view subscribes
  // to presentation updates over Supabase Realtime, but raw SQL UPDATEs
  // don't always trigger a broadcast in this env. Reload to be safe.
  await startSlide(seed.presentationId, seed.slide1Id);
  await page.reload();

  const tile = page.getByRole("button", { name: /option a/i });
  await expect(tile).toBeVisible({ timeout: 15_000 });
  await tile.click();
  // Either the locked-in waiting screen OR the post-expiry reveal screen
  // is acceptable — both confirm the click was registered.
  await expect(async () => {
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/locked in|hold tight|your answer|correct answer|right/i);
  }).toPass({ timeout: 12_000 });

  // Wait for the response row to be persisted before scoring — the click
  // handler awaits the server action, but realtime echo back to the
  // server-side test harness is decoupled.
  await expect(async () => {
    const c2 = await db();
    const { rows: r } = await c2.query(
      `select id from responses where slide_id = $1 and participant_id = $2`,
      [seed.slide1Id, participantId],
    );
    expect(r.length).toBeGreaterThan(0);
  }).toPass({ timeout: 10_000 });

  // Host triggers scoring (simulates timer expiry).
  const updated = await scoreSlideAsOwner(seed.slide1Id, seed.ownerId);
  expect(updated).toBeGreaterThanOrEqual(1);

  const p = await getParticipant(participantId!);
  expect(p.score).toBeGreaterThan(500);
});
