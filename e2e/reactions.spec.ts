import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { addSlide, closeDb, seedSession, startSlide, teardown } from "./_helpers";

// Reaction (emoji) flow. The audience taps an emoji button → the phone sends
// it over Realtime Broadcast on `reactions:<presentationId>` (no DB row per
// tap) → the host's ReactionOverlay floats it. We listen on the same channel
// with a second client and assert the emoji arrives.

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await closeDb();
});

test("audience taps an emoji, it is broadcast to the presenter channel", async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  test.skip(!url || !anon, "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set");

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

  const listener = createClient(url!, anon!, { auth: { persistSession: false } });
  const received: string[] = [];
  const channel = listener
    .channel(`reactions:${seed.presentationId}`)
    .on("broadcast", { event: "reaction" }, ({ payload }) => {
      received.push((payload as { e?: string })?.e ?? "");
    });

  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("listener did not subscribe")), 15_000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(t);
          resolve();
        }
      });
    });

    await page.goto(`/play/${code}`);
    await page.locator('input[placeholder*="nickname" i]').fill("RxBot");
    await page.getByRole("button", { name: /^join$/i }).click();
    await expect(page.locator('input[placeholder*="nickname" i]')).toBeHidden({ timeout: 10_000 });

    await startSlide(seed.presentationId, slideId);
    await page.reload();

    // ReactionsBar renders 6 emoji buttons with aria-label="React 👏" etc.
    const fire = page.getByRole("button", { name: /react 🔥/i });
    await expect(fire).toBeVisible({ timeout: 10_000 });
    await fire.click();

    await expect.poll(() => received, { timeout: 10_000 }).toContain("🔥");
  } finally {
    await listener.removeChannel(channel);
    await teardown(seed.presentationId, seed.ownerEmail);
  }
});
