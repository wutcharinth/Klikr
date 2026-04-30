import { expect, test } from "@playwright/test";
import { closeDb, insertParticipant, seedSession, teardown } from "./_helpers";

// Final-podium UI test. Hits the public /results/<id> page, which renders
// QuizPodium with everyone's score. Verifies top-3 ranks, nicknames, and
// scores all show up.

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await closeDb();
});

test("results page: top-3 podium renders with scores + ranks", async ({ page }) => {
  const code = `POD${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const seed = await seedSession({ code });

  // Three players with different scores so we have a clear 1/2/3.
  await insertParticipant({ presentationId: seed.presentationId, nickname: "Alice", score: 1500 });
  await insertParticipant({ presentationId: seed.presentationId, nickname: "Bob", score: 900 });
  await insertParticipant({ presentationId: seed.presentationId, nickname: "Cara", score: 600 });

  try {
    await page.goto(`/results/${seed.presentationId}`);

    const body = page.locator("body");
    // Header reads "Final results" with the player count.
    await expect(body).toContainText(/Final results/i);
    await expect(body).toContainText(/3 players/);

    // All three nicknames render.
    await expect(body).toContainText(/Alice/);
    await expect(body).toContainText(/Bob/);
    await expect(body).toContainText(/Cara/);

    // Scores formatted with comma thousands separators.
    await expect(body).toContainText(/1,500/);
    await expect(body).toContainText(/900/);
    await expect(body).toContainText(/600/);

    // Podium label is present.
    await expect(body).toContainText(/Final podium/i);
  } finally {
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
