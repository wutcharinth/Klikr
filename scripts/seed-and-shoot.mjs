// Seed engaging content into the QA presentation, then take rich screenshots.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:64758";
const ROOM_CODE = "ZSZH2T";
const PRES_ID = "0cf8cfd6-fab4-495e-b91b-40b6b65bf7bf";
const SUPA = "https://kong-production-0b73.up.railway.app";
const ANON = (await fs.readFile(".env.local", "utf8"))
  .split("\n").find((l) => l.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY="))
  .split("=").slice(1).join("=").trim();
const SROLE = (await fs.readFile("/tmp/klikr-secrets.env", "utf8"))
  .split("\n").find((l) => l.startsWith("SERVICE_ROLE_KEY="))
  .split("=").slice(1).join("=").trim();

const OUT = path.resolve("public/showcase");
await fs.mkdir(OUT, { recursive: true });

async function api(p, init = {}) {
  // Use service role for admin actions (presentation state, slide patches)
  const useService = init.method && init.method !== "GET";
  const key = useService ? SROLE : ANON;
  return fetch(`${SUPA}/rest/v1${p}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
}

// 1) Reset participants/responses
await api(`/responses?slide_id=in.(select id from slides where presentation_id=eq.${PRES_ID})`, { method: "DELETE" });
await api(`/participants?presentation_id=eq.${PRES_ID}`, { method: "DELETE" });

// 2) Find slide ids
const slides = await (await api(`/slides?presentation_id=eq.${PRES_ID}&order=position.asc`)).json();
const SLIDE = Object.fromEntries(slides.map((s) => [s.type, s]));

// 3) Update slide content with interesting questions
async function patchSlide(id, body) {
  return api(`/slides?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

await patchSlide(SLIDE.mcq.id, {
  question: "Which AI assistant do you reach for first?",
  config: { options: ["ChatGPT", "Claude", "Gemini", "Perplexity"] },
});

await patchSlide(SLIDE.wordcloud.id, {
  question: "Describe your team in one word.",
  config: { max_words_per_participant: 2 },
});

await patchSlide(SLIDE.open.id, {
  question: "What's the most useful thing AI helped you with this week?",
  config: {},
});

await patchSlide(SLIDE.quiz.id, {
  question: "When was the Bitcoin whitepaper published?",
  config: { options: ["2007", "2008", "2009", "2010"], correct_index: 1, time_limit_s: 20 },
});

// 4) Create participants
const NAMES = ["Avery","Riley","Sam","Jordan","Taylor","Morgan","Casey","Quinn","Drew","Reese","Sky","Logan"];
const participants = [];
for (const n of NAMES) {
  const r = await (await api(`/participants`, {
    method: "POST",
    body: JSON.stringify({ presentation_id: PRES_ID, nickname: n }),
  })).json();
  participants.push(r[0]);
}

// 5) Submit MCQ responses (Claude leads)
const MCQ_DIST = [3, 6, 1, 2]; // ChatGPT, Claude, Gemini, Perplexity
let pi = 0;
for (let i = 0; i < MCQ_DIST.length; i++) {
  for (let n = 0; n < MCQ_DIST[i]; n++) {
    await api(`/responses`, {
      method: "POST",
      body: JSON.stringify({
        slide_id: SLIDE.mcq.id, participant_id: participants[pi].id, value_index: i,
      }),
    });
    pi++;
  }
}

// 6) Submit wordcloud responses
const WC_WORDS = [
  "curious","kind","ambitious","fast","kind","curious","resilient","focused",
  "creative","curious","kind","playful","kind","fast","ambitious","creative",
  "resilient","curious","focused","kind","playful","fast",
];
for (let i = 0; i < participants.length; i++) {
  const a = WC_WORDS[i*2 % WC_WORDS.length];
  const b = WC_WORDS[(i*2+1) % WC_WORDS.length];
  await api(`/responses`, {
    method: "POST",
    body: JSON.stringify({
      slide_id: SLIDE.wordcloud.id, participant_id: participants[i].id, value_text: `${a} ${b}`,
    }),
  });
}

// 7) Open responses
const OPEN = [
  "Drafted a tough Slack message I'd been avoiding",
  "Refactored 800 lines of legacy auth code",
  "Wrote a SQL window function I would have googled for an hour",
  "Generated test fixtures from a CSV in 3 seconds",
  "Untangled a regex I'd been stuck on for two days",
  "Translated my Notion notes into a press release",
];
for (let i = 0; i < OPEN.length; i++) {
  await api(`/responses`, {
    method: "POST",
    body: JSON.stringify({
      slide_id: SLIDE.open.id, participant_id: participants[i].id, value_text: OPEN[i],
    }),
  });
}

// 8) Quiz responses (correct = 2008, index 1) with realistic ms times
const QUIZ_ANSWERS = [
  {i: 1, ms: 1800}, {i: 1, ms: 2500}, {i: 1, ms: 3300}, {i: 1, ms: 4900},
  {i: 1, ms: 6700}, {i: 1, ms: 9100}, {i: 1, ms: 11500},
  {i: 0, ms: 4000}, {i: 2, ms: 5500}, {i: 2, ms: 8000}, {i: 3, ms: 6500},
];
for (let i = 0; i < QUIZ_ANSWERS.length && i < participants.length; i++) {
  const a = QUIZ_ANSWERS[i];
  await api(`/responses`, {
    method: "POST",
    body: JSON.stringify({
      slide_id: SLIDE.quiz.id, participant_id: participants[i].id, value_index: a.i, response_ms: a.ms,
    }),
  });
}

// 9) Compute scores client-side & set them so leaderboard shows nicely
for (let i = 0; i < QUIZ_ANSWERS.length && i < participants.length; i++) {
  const a = QUIZ_ANSWERS[i];
  const points = a.i === 1 ? Math.max(0, Math.round(1000 * (1 - a.ms / 20000))) : 0;
  if (points > 0) {
    await api(`/participants?id=eq.${participants[i].id}`, {
      method: "PATCH", body: JSON.stringify({ score: points }),
    });
  }
}

// 10) Set presentation to lobby first for nice waiting screen, then to active per slide
async function setSlide(id) {
  await api(`/presentations?id=eq.${PRES_ID}`, {
    method: "PATCH",
    body: JSON.stringify({
      state: "active", current_slide_id: id,
      current_slide_started_at: new Date(Date.now() - 6000).toISOString(),
    }),
  });
}

// --- Screenshots
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const desk = await ctx.newPage();
const phone = await ctx.newPage();
await phone.setViewportSize({ width: 390, height: 844 });

async function shoot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage });
  console.log("→", name);
}
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Landing & login
await desk.goto(`${BASE}/`); await wait(700);
await shoot(desk, "01-landing");
await desk.goto(`${BASE}/login`); await wait(700);
await shoot(desk, "02-login");

// Audience: nickname
await api(`/presentations?id=eq.${PRES_ID}`, {
  method: "PATCH", body: JSON.stringify({ state: "lobby", current_slide_id: null }),
});
await phone.goto(`${BASE}/play/${ROOM_CODE}`); await wait(500);
await phone.evaluate(() => { try { localStorage.clear(); } catch {} });
await phone.goto(`${BASE}/play/${ROOM_CODE}`); await wait(900);
await shoot(phone, "03-audience-nickname");

// Audience joined waiting
await phone.fill('input[placeholder="Your nickname"]', "Avery");
await phone.click("form button");
await wait(1500);
await shoot(phone, "04-audience-lobby");

// Audience MCQ (with prior answer state)
await setSlide(SLIDE.mcq.id);
await wait(800);
await phone.goto(`${BASE}/play/${ROOM_CODE}`); await wait(1200);
await shoot(phone, "05-audience-mcq");

// Audience wordcloud
await setSlide(SLIDE.wordcloud.id);
await wait(900);
await phone.goto(`${BASE}/play/${ROOM_CODE}`); await wait(1400);
try {
  await phone.fill('input[placeholder*="word"]', "curious", { timeout: 4000 });
  await phone.click("form button");
  await wait(500);
  await phone.fill('input[placeholder*="word"]', "kind", { timeout: 4000 });
  await phone.click("form button");
  await wait(500);
} catch (e) { console.log("wc fill skipped:", e.message); }
await shoot(phone, "06-audience-wordcloud");

// Audience open
await setSlide(SLIDE.open.id);
await wait(900);
await phone.goto(`${BASE}/play/${ROOM_CODE}`); await wait(1400);
try {
  await phone.fill("textarea", "Wrote a SQL window function I would have googled for an hour", { timeout: 4000 });
  await wait(400);
} catch (e) { console.log("open fill skipped:", e.message); }
await shoot(phone, "07-audience-open");

// Audience quiz
await setSlide(SLIDE.quiz.id);
await wait(900);
await phone.goto(`${BASE}/play/${ROOM_CODE}`); await wait(1500);
await shoot(phone, "08-audience-quiz");

// Demo HTML
await desk.goto(`${BASE}/demo.html`); await wait(1000);
await shoot(desk, "09-demo-title");
await desk.evaluate(() => document.getElementById('next').click()); await wait(900);
await shoot(desk, "10-demo-howitworks");
await desk.evaluate(() => document.getElementById('next').click()); await wait(900);
// Click MCQ option to populate chart
await desk.evaluate(() => document.querySelector('.mcq-opt[data-i="1"]')?.click());
await wait(2500);
await shoot(desk, "11-demo-mcq");
await desk.evaluate(() => document.getElementById('next').click()); await wait(900);
// Submit a wordcloud word
await desk.fill('#wc-input', "claude");
await desk.evaluate(() => document.getElementById('wc-form').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true})));
await wait(2500);
await shoot(desk, "12-demo-wordcloud");
await desk.evaluate(() => document.getElementById('next').click()); await wait(900);
await desk.fill('#open-input', "Klikr feels like Apple-quality realtime.");
await desk.evaluate(() => document.getElementById('open-form').dispatchEvent(new Event('submit', {bubbles:true, cancelable:true})));
await wait(2500);
await shoot(desk, "13-demo-open");
await desk.evaluate(() => document.getElementById('next').click()); await wait(900);
await desk.evaluate(() => document.querySelector('.quiz-opt[data-i="1"]')?.click());
await wait(900);
await shoot(desk, "14-demo-quiz");

await browser.close();
console.log("done");
