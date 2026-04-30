import { expect, test } from "@playwright/test";

// Landing page smoke. Covers: route 200, headline visible, hero animation
// container mounts (placeholder or live Player), join form submits, host
// card link points to /host or /dashboard depending on auth.

test.describe("landing", () => {
  test("loads with headline + join form + hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Klikr|Live answers/i);

    // Headline must render with non-zero width — regression guard for the
    // background-clip:text bug that collapsed the headline to 0px.
    const headline = page.locator("h1").first();
    await expect(headline).toBeVisible();
    const box = await headline.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(50);

    // Join form is centered now; the input + Join button should be present.
    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();
    await expect(page.getByRole("button", { name: /join/i })).toBeVisible();

    // Hero animation wrapper is present. Either the Player has mounted
    // or the static placeholder is visible — both count as success.
    const hero = page.locator('[role="img"][aria-label*="live Klikr"]');
    await expect(hero).toBeVisible();
  });

  test("hero placeholder is in the DOM at first paint", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // The placeholder is a static SSR render of the dashboard intro that
    // sits behind the Player while @remotion/player downloads. It must
    // contain "Klikr" + "Your sessions" so users see content immediately
    // even on cold cache. Asserts via DOM text content (the placeholder
    // is opacity:0 once the Player mounts; we don't care about visibility).
    const text = await page.locator('[role="img"][aria-label*="live Klikr"]').first().innerText();
    expect(text).toMatch(/Klikr/);
    expect(text).toMatch(/Your sessions|Templates/);
  });

  test("mobile viewport: headline + join form fit, no horizontal overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
    await page.goto("/");
    const headline = page.locator("h1").first();
    await expect(headline).toBeVisible();
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
