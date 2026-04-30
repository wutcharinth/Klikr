import { expect, test } from "@playwright/test";
import { addSlide, closeDb, db, seedSession, startSlide, teardown } from "./_helpers";

// Reaction (emoji) flow. The audience taps an emoji button → server action
// inserts a reactions row → host's ReactionOverlay should pick it up via
// Supabase Realtime. We verify the row landed in the DB; the host-side
// rendering is harder to assert without a logged-in browser session.

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await closeDb();
});

test("audience taps an emoji, reactions row is inserted", async ({ page }) => {
  const code = `RX${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });
  // Need at least one non-quiz slide so the audience reaches the slide
  // view (where ReactionsBar is rendered).
  const slideId = await addSlide({
    presentationId: seed.presentationId,
    type: "open",
    question: "QA: react to this",
    config: {},
  });

  try {
    await page.goto(`/play/${code}`);
    await page.locator('input[placeholder*="nickname" i]').fill("RxBot");
    await page.getByRole("button", { name: /^join$/i }).click();
    await expect(page.locator('input[placeholder*="nickname" i]')).toBeHidden({ timeout: 10_000 });

    const c = await db();
    const { rows } = await c.query(
      `select id from participants where presentation_id = $1 and nickname = 'RxBot' order by created_at desc limit 1`,
      [seed.presentationId],
    );
    const participantId = rows[0]?.id as string | undefined;
    expect(participantId).toBeTruthy();

    await startSlide(seed.presentationId, slideId);
    await page.reload();

    // ReactionsBar renders 6 emoji buttons with aria-label="React 👏" etc.
    const fire = page.getByRole("button", { name: /react 🔥/i });
    await expect(fire).toBeVisible({ timeout: 10_000 });
    await fire.click();

    // Server action should land a row in `reactions`.
    await expect(async () => {
      const { rows: rx } = await c.query(
        `select id, emoji from reactions where presentation_id = $1 and participant_id = $2`,
        [seed.presentationId, participantId],
      );
      expect(rx.length).toBeGreaterThan(0);
      expect(rx[0].emoji).toBe("🔥");
    }).toPass({ timeout: 10_000 });
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
