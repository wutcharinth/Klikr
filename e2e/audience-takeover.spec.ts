import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { addSlide, closeDb, db, seedSession, startSlide, teardown } from "./_helpers";

// Coverage for the audience engagement takeover layer:
//  - non-quiz one-and-done slides fire the full-screen `submitted` variant
//  - multi-submit slides fire a small bottom toast (and accept a second submit)
//  - quiz slides fire the full reveal on local timer expiry
//  - RevealMedal / ScoreCard are no longer imported anywhere

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await closeDb();
});

async function joinAndAdvance(opts: {
  page: import("@playwright/test").Page;
  code: string;
  presentationId: string;
  slideId: string;
  nickname: string;
}) {
  await opts.page.goto(`/play/${opts.code}`);
  const nameInput = opts.page.locator('input[placeholder*="nickname" i]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill(opts.nickname);
  await opts.page.getByRole("button", { name: /^join$/i }).click();
  await expect(nameInput).toBeHidden({ timeout: 10_000 });

  const c = await db();
  const { rows } = await c.query(
    `select id from participants where presentation_id = $1 and nickname = $2 order by created_at desc limit 1`,
    [opts.presentationId, opts.nickname],
  );
  const participantId = rows[0]?.id as string | undefined;
  expect(participantId, "participant insert").toBeTruthy();

  await startSlide(opts.presentationId, opts.slideId);
  await opts.page.reload();
  return participantId!;
}

test("MCQ submit fires the submitted takeover with ordinal text", async ({ page }) => {
  const code = `TKMCQ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "mcq",
    question: "QA: pick anything",
    config: { options: ["Cats", "Dogs", "Birds"] },
  });
  try {
    await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "TakeoverBot" });
    await page.getByRole("button", { name: /dogs/i }).click();
    // Full-screen takeover overlay with the "submitted" gradient class.
    await expect(page.locator(".takeover-bg-submit")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/1st in!/i)).toBeVisible();
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("Wordcloud submit fires the toast and a second submit is not blocked", async ({ page }) => {
  const code = `TKWC${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "wordcloud",
    question: "QA: send a word",
    config: { max_words_per_participant: 3 },
  });
  try {
    await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "ToastBot" });
    const input = page.locator('input[placeholder*="word" i]').first();
    await input.fill("alpha");
    await page.getByRole("button", { name: /add/i }).click();
    await expect(page.locator(".takeover-toast")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/word in/i)).toBeVisible();
    // Toast is non-blocking — second submit should land while the toast is up.
    await input.fill("beta");
    await page.getByRole("button", { name: /add/i }).click();
    // Toast may have re-mounted with the new submit; word should be in DB.
    await expect(async () => {
      const c = await db();
      const { rows } = await c.query(
        `select value_text from responses where slide_id = $1`,
        [slideId],
      );
      const joined = rows.map((r) => r.value_text).join(" ");
      expect(joined).toMatch(/beta/);
    }).toPass({ timeout: 5_000 });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("Quiz reveal fires the correct takeover when the timer expires", async ({ page }) => {
  const code = `TKQZ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "mcq",
    question: "placeholder, replaced below",
    config: {},
  });
  // addSlide() forces type to one of the audience-driven ones; rewrite as quiz with a short limit.
  const c = await db();
  await c.query(
    `update slides set type = 'quiz', kahoot_mode = false,
       config = $2::jsonb, question = 'QA: 2+2'
     where id = $1`,
    [
      slideId,
      JSON.stringify({ options: ["3", "4", "5"], correct_index: 1, time_limit_s: 2 }),
    ],
  );

  try {
    await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "QuizBot" });
    await page.getByRole("button", { name: /^4$/ }).click();
    await expect(page.getByText(/locked in/i)).toBeVisible();
    // Timer expires after 2s — full takeover with the "correct" gradient.
    await expect(page.locator(".takeover-bg-correct")).toBeVisible({ timeout: 6_000 });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("CI guard: no remaining RevealMedal / ScoreCard references outside QuizFeedback.tsx", () => {
  const out = execSync(
    "grep -rn 'RevealMedal\\|ScoreCard' --include='*.ts' --include='*.tsx' app components lib || true",
  ).toString();
  const offending = out
    .split("\n")
    .filter(Boolean)
    .filter((l) => !l.startsWith("components/QuizFeedback.tsx:"));
  expect(offending, `Stray RevealMedal/ScoreCard usage:\n${offending.join("\n")}`).toEqual([]);
});
