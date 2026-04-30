import { expect, test } from "@playwright/test";
import { addSlide, closeDb, db, seedSession, startSlide, teardown } from "./_helpers";

// Smoke for each non-quiz slide type. Each test seeds a fresh presentation
// with exactly one slide of the target type, drives the audience through
// submitting a response, and asserts a row landed in the responses table.

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

  // Look up the participant we just inserted.
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

async function expectResponse(slideId: string, participantId: string, opts?: {
  valueText?: RegExp;
  valueIndex?: number;
}) {
  await expect(async () => {
    const c = await db();
    const { rows } = await c.query(
      `select value_text, value_index from responses where slide_id = $1 and participant_id = $2`,
      [slideId, participantId],
    );
    expect(rows.length, "response row").toBeGreaterThan(0);
    if (opts?.valueText) expect(rows[0].value_text).toMatch(opts.valueText);
    if (opts?.valueIndex !== undefined) expect(rows[0].value_index).toBe(opts.valueIndex);
  }).toPass({ timeout: 10_000 });
}

test("MCQ: tap an option, response stored with value_index", async ({ page }) => {
  const code = `MCQ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "mcq",
    question: "QA: pick anything",
    config: { options: ["Cats", "Dogs", "Birds"] },
  });
  try {
    const participantId = await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "MCQBot" });
    await page.getByRole("button", { name: /dogs/i }).click();
    await expectResponse(slideId, participantId, { valueIndex: 1 });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("Wordcloud: type a word, response stored as value_text", async ({ page }) => {
  const code = `WC${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "wordcloud",
    question: "QA: send a word",
    config: { max_words_per_participant: 3 },
  });
  try {
    const participantId = await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "WCBot" });
    const input = page.locator('input[placeholder*="word" i]').first();
    await input.fill("kangaroo");
    await page.getByRole("button", { name: /add/i }).click();
    await expectResponse(slideId, participantId, { valueText: /kangaroo/ });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("Open text: submit free-form response", async ({ page }) => {
  const code = `OPN${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "open",
    question: "QA: anything to share",
    config: {},
  });
  try {
    const participantId = await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "OpenBot" });
    // Open input is a textarea/input followed by a submit/send button.
    const field = page.locator('textarea, input[type="text"]').first();
    await field.fill("This is my open answer");
    await page.getByRole("button", { name: /send|submit/i }).click();
    await expectResponse(slideId, participantId, { valueText: /open answer/ });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("Q&A: submit a question, response row inserted", async ({ page }) => {
  const code = `QA${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "qa",
    question: "QA: ask anything",
    config: { upvotes: true, moderation: "off" },
  });
  try {
    const participantId = await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "QABot" });
    const field = page.locator('textarea, input[type="text"]').first();
    await field.fill("Will testing ever end?");
    await page.getByRole("button", { name: /send|ask|submit/i }).first().click();
    await expectResponse(slideId, participantId, { valueText: /testing ever end/ });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});

test("Rating: tap a number, response stored as value_index", async ({ page }) => {
  const code = `RT${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "rating",
    question: "QA: rate this",
    config: { scale: 5, min_label: "Bad", max_label: "Good" },
  });
  try {
    const participantId = await joinAndAdvance({ page, code, presentationId: seed.presentationId, slideId, nickname: "RTBot" });
    // Rating buttons are labelled with the numeric value.
    await page.getByRole("button", { name: /^4$/ }).first().click();
    await expectResponse(slideId, participantId, { valueIndex: 4 });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
