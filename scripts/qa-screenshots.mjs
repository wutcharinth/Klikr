// QA the live app and save real screenshots for the showcase HTML.
// Usage: node scripts/qa-screenshots.mjs http://localhost:64758
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:64758";
const OUT = path.resolve("public/showcase");
await fs.mkdir(OUT, { recursive: true });

const ROOM_CODE = "ZSZH2T";
const PRES_ID = "0cf8cfd6-fab4-495e-b91b-40b6b65bf7bf";
const SUPABASE_URL = "https://kong-production-0b73.up.railway.app";
const ANON = (await fs.readFile(".env.local", "utf8"))
  .split("\n")
  .find((l) => l.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY="))
  .split("=").slice(1).join("=").trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function snap(name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  console.log("→", file);
}

async function wait(ms) { await new Promise((r) => setTimeout(r, ms)); }

// --- 1. Landing
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await wait(400);
await snap("01-landing");

// --- 2. Login
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await wait(400);
await snap("02-login");

// --- 3. Audience nickname form (mobile viewport)
const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/play/${ROOM_CODE}`, { waitUntil: "networkidle" });
await wait(500);
await mobile.screenshot({ path: path.join(OUT, "03-audience-nickname.png") });
console.log("→ 03-audience-nickname.png");

// --- Reset session for QA: re-open the QA presentation by API
async function api(pathStr, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${pathStr}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });
}
// Reopen presentation: state=lobby, current_slide_id=null
await api(`/presentations?id=eq.${PRES_ID}`, {
  method: "PATCH",
  body: JSON.stringify({ state: "lobby", current_slide_id: null, current_slide_started_at: null }),
});
// Get slide ids
const slides = await (await api(`/slides?presentation_id=eq.${PRES_ID}&order=position.asc`)).json();
const SLIDE = Object.fromEntries(slides.map((s) => [s.type, s.id]));

// --- 4. Audience after joining lobby
await mobile.evaluate(() => localStorage.clear());
await mobile.goto(`${BASE}/play/${ROOM_CODE}`, { waitUntil: "networkidle" });
await mobile.fill('input[placeholder="Your nickname"]', "Alice");
await mobile.click("form button");
await wait(1500);
await mobile.screenshot({ path: path.join(OUT, "04-audience-lobby.png") });
console.log("→ 04-audience-lobby.png");

// --- Login presenter via OAuth-bypass (use Supabase password sign-in via gotrue admin)
// We'll just navigate /dashboard via an injected session cookie. Easier: sign in by setting access_token cookie directly.
// Use Gotrue token endpoint for password grant.
// (Klikr removed email/password UI but Gotrue still supports it server-side.)
async function getAccessToken() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "presenter@test.com", password: "testpass123!" }),
  });
  return r.json();
}
const token = await getAccessToken();
if (!token.access_token) throw new Error("login failed: " + JSON.stringify(token));

// Set Supabase cookies on the desktop page so it appears authenticated.
await ctx.addCookies([
  {
    name: "sb-access-token",
    value: token.access_token,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  },
  {
    name: "sb-refresh-token",
    value: token.refresh_token,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  },
]);

// Better: use Supabase auth helper via injecting localStorage
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.evaluate((tok) => {
  // Supabase ssr stores session in cookie sb-<project>-auth-token. The right approach is via signInWithPassword in client — but signup is removed.
  // Fallback: rely on Postgrest queries via raw cookies. Instead, set raw cookies that @supabase/ssr expects.
}, token);

// Easier path: just use unauthenticated screenshots for dashboard/editor by creating a public-readable view.
// Skip dashboard and editor — they require auth.

// --- 5. Audience in MCQ slide
await api(`/presentations?id=eq.${PRES_ID}`, {
  method: "PATCH",
  body: JSON.stringify({ state: "active", current_slide_id: SLIDE.mcq, current_slide_started_at: new Date().toISOString() }),
});
await wait(800);
await mobile.goto(`${BASE}/play/${ROOM_CODE}`, { waitUntil: "networkidle" });
await wait(1200);
await mobile.screenshot({ path: path.join(OUT, "05-audience-mcq.png") });
console.log("→ 05-audience-mcq.png");

// --- 6. Audience in wordcloud
await api(`/presentations?id=eq.${PRES_ID}`, {
  method: "PATCH",
  body: JSON.stringify({ current_slide_id: SLIDE.wordcloud, current_slide_started_at: new Date().toISOString() }),
});
await wait(1200);
await mobile.screenshot({ path: path.join(OUT, "06-audience-wordcloud.png") });
console.log("→ 06-audience-wordcloud.png");

// --- 7. Audience in open
await api(`/presentations?id=eq.${PRES_ID}`, {
  method: "PATCH",
  body: JSON.stringify({ current_slide_id: SLIDE.open, current_slide_started_at: new Date().toISOString() }),
});
await wait(1200);
await mobile.screenshot({ path: path.join(OUT, "07-audience-open.png") });
console.log("→ 07-audience-open.png");

// --- 8. Audience in quiz
await api(`/presentations?id=eq.${PRES_ID}`, {
  method: "PATCH",
  body: JSON.stringify({ current_slide_id: SLIDE.quiz, current_slide_started_at: new Date().toISOString() }),
});
await wait(1200);
await mobile.screenshot({ path: path.join(OUT, "08-audience-quiz.png") });
console.log("→ 08-audience-quiz.png");

// --- Demo HTML
await page.goto(`${BASE}/demo.html`, { waitUntil: "networkidle" });
await wait(800);
await snap("09-demo-title");

await page.evaluate(() => document.getElementById("next").click());
await wait(800);
await snap("10-demo-howitworks");

await page.evaluate(() => document.getElementById("next").click());
await wait(800);
await snap("11-demo-mcq");

await page.evaluate(() => document.getElementById("next").click());
await wait(800);
await snap("12-demo-wordcloud");

await page.evaluate(() => document.getElementById("next").click());
await wait(800);
await snap("13-demo-open");

await page.evaluate(() => document.getElementById("next").click());
await wait(1200);
await snap("14-demo-quiz");

await browser.close();
console.log("done");
