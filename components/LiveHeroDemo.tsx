"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Scene =
  | "intro"
  | "valueprop"
  | "mcq"
  | "wordcloud"
  | "quiz"
  | "rating"
  | "qa"
  | "ranking"
  | "leaderboard";

const SCENES: Scene[] = [
  "intro",
  "mcq",
  "wordcloud",
  "quiz",
  "valueprop",
  "rating",
  "qa",
  "ranking",
  "leaderboard",
];
const SCENE_DURATION_MS = 4200;
const MORPH_MS = 700;

export function LiveHeroDemo() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  // Cycle scenes; on each transition, hold the outgoing scene on top of the
  // new one for MORPH_MS so the two cross-fade like PowerPoint Morph.
  useEffect(() => {
    const id = setInterval(() => {
      setSceneIdx((i) => {
        setPrevIdx(i);
        return (i + 1) % SCENES.length;
      });
    }, SCENE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  // After the morph animation completes, drop the outgoing scene.
  useEffect(() => {
    if (prevIdx === null) return;
    const id = setTimeout(() => setPrevIdx(null), MORPH_MS);
    return () => clearTimeout(id);
  }, [prevIdx, sceneIdx]);

  // Per-scene tick drives incremental animations within the active scene.
  useEffect(() => {
    setTick(0);
    const id = setInterval(() => setTick((t) => t + 1), 700);
    return () => clearInterval(id);
  }, [sceneIdx]);

  return (
    <div className="hero-breathe panel relative w-full max-w-md overflow-hidden p-5 sm:p-6">
      <div className="orb orb-1" style={{ width: "70%", height: "70%", top: "-20%", right: "-20%", opacity: 0.3 }} />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot pulse-ring" /> live
        </div>
        <div className="flex items-center gap-1">
          {SCENES.map((s, i) => (
            <span
              key={s}
              className="block h-1 rounded-full transition-all duration-500"
              style={{
                width: i === sceneIdx ? 14 : 4,
                background: i === sceneIdx ? "var(--blue)" : "var(--line-strong)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-4 min-h-[260px]">
        {prevIdx !== null && (
          <div key={`prev-${prevIdx}`} className="morph-out absolute inset-0">
            <SceneBody scene={SCENES[prevIdx]} tick={tick} />
          </div>
        )}
        <div key={`cur-${sceneIdx}`} className="morph-in">
          <SceneBody scene={SCENES[sceneIdx]} tick={tick} />
        </div>
      </div>
    </div>
  );
}

function SceneBody({ scene, tick }: { scene: Scene; tick: number }) {
  switch (scene) {
    case "intro": return <IntroScene />;
    case "valueprop": return <ValuePropScene />;
    case "mcq": return <MCQScene tick={tick} />;
    case "wordcloud": return <WordCloudScene tick={tick} />;
    case "quiz": return <QuizScene tick={tick} />;
    case "rating": return <RatingScene tick={tick} />;
    case "qa": return <QAScene tick={tick} />;
    case "ranking": return <RankingScene />;
    case "leaderboard": return <LeaderboardScene tick={tick} />;
  }
}

function MCQScene({ tick }: { tick: number }) {
  const baseTotals = [12, 28, 7, 19];
  const totals = baseTotals.map((b, i) => b + Math.min(tick, 5) * (1 + (i % 2)));
  const sum = totals.reduce((a, b) => a + b, 0);
  const labels = ["Excellent", "Good", "Meh", "Loved it"];

  // Start bars at 0 then transition to real width on next frame, so each
  // entry uses the smooth `transition: width` rather than a keyframe restart.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Multiple choice</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">How was the workshop?</h3>
      <div className="mt-4 space-y-2.5">
        {labels.map((label, i) => {
          const pct = Math.round((totals[i] / sum) * 100);
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs">
                <span>{label}</span>
                <span className="muted-text">{pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                <div
                  className="bar-fill h-full rounded-full"
                  style={{
                    width: `${mounted ? pct : 0}%`,
                    transitionDelay: `${i * 80}ms`,
                    background: i === 1 || i === 3 ? "var(--blue)" : "var(--ink)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] muted-text">
        <span className="mono" style={{ color: "var(--ink)" }}>{sum}</span> responses
      </p>
    </>
  );
}

const WORDS = [
  { t: "engaging", w: 7 },
  { t: "fun", w: 5 },
  { t: "real-time", w: 6 },
  { t: "fast", w: 4 },
  { t: "smooth", w: 4 },
  { t: "interactive", w: 6 },
  { t: "easy", w: 5 },
  { t: "love it", w: 7 },
  { t: "polished", w: 4 },
  { t: "wow", w: 5 },
];

function WordCloudScene({ tick }: { tick: number }) {
  // Track which words have already mounted in this scene's lifetime so
  // existing words don't re-animate when new ones appear.
  const seenRef = useRef<Set<string>>(new Set());
  const visible = Math.min(WORDS.length, 3 + tick * 2);
  const slice = WORDS.slice(0, visible);

  // Lock in newly visible words; subsequent renders won't re-animate them.
  for (const w of slice) {
    if (!seenRef.current.has(w.t)) seenRef.current.add(w.t);
  }

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Word cloud</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">One word for today?</h3>
      <div className="mt-5 flex h-[170px] flex-wrap content-center items-center justify-center gap-x-3 gap-y-1 text-center">
        {slice.map((w, i) => {
          // Words that were already on screen at the previous tick keep
          // a static class — only freshly-added words run the fly-in.
          const isNew = !wasSeenBefore(seenRef.current, w.t, slice);
          return (
            <span
              key={w.t}
              className={isNew ? "word-fly" : ""}
              style={{
                fontSize: `${0.85 + w.w * 0.12}rem`,
                fontWeight: w.w > 5 ? 700 : 500,
                color: w.w > 5 ? "var(--blue)" : "var(--ink)",
                animationDelay: isNew ? `${i * 70}ms` : "0ms",
              }}
            >
              {w.t}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] muted-text">
        <span className="mono" style={{ color: "var(--ink)" }}>{visible * 4 + 8}</span> responses
      </p>
    </>
  );
}

// A word is "new this tick" if the stored Set didn't contain it before this
// render appended it. Since we mutate above, we approximate by treating the
// last two entries of `slice` as the freshly-added ones — they're appended in
// order and `tick * 2` controls the growth, so the suffix is always new.
function wasSeenBefore(_seen: Set<string>, word: string, slice: { t: string }[]): boolean {
  const idx = slice.findIndex((s) => s.t === word);
  return idx < slice.length - 2;
}

// ---------- Promo intro scenes ----------

function IntroScene() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="anim-fade-up text-xs uppercase tracking-[0.18em] muted-text">A live audience tool</p>
      <h3 className="anim-fade-up delay-200 mt-3 text-4xl font-semibold tracking-tight">
        <span className="headline-shine">Klikr</span>
      </h3>
      <p className="anim-fade-up delay-400 mt-3 max-w-[16rem] text-sm muted-text">
        Polls, word clouds, quizzes, Q&amp;A — running on any phone, no app required.
      </p>
      <div className="anim-pop delay-500 mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]"
        style={{ background: "rgba(0,113,227,0.10)", color: "var(--blue)", border: "1px solid rgba(0,113,227,0.25)" }}>
        Free to start
      </div>
    </div>
  );
}

function ValuePropScene() {
  const stats = [
    { big: "0", small: "Apps to install" },
    { big: "6", small: "Letter join code" },
    { big: "<200ms", small: "Live result latency" },
  ];
  return (
    <div className="flex h-full flex-col">
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Why Klikr</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">Built for the room</h3>
      <div className="mt-5 grid flex-1 grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div
            key={s.small}
            className="anim-pop flex flex-col items-center justify-center rounded-xl p-3 text-center"
            style={{
              background: "rgba(0,113,227,0.06)",
              border: "1px solid rgba(0,113,227,0.20)",
              animationDelay: `${i * 120}ms`,
            }}
          >
            <span className="mono text-2xl font-bold" style={{ color: "var(--blue)" }}>{s.big}</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.15em] muted-text">{s.small}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Feature showcase scenes ----------

function QuizScene({ tick }: { tick: number }) {
  // 0..4: countdown + bars growing. 5+: reveal correct answer in green.
  const baseTotals = [3, 9, 14, 5];
  const totals = baseTotals.map((b, i) => b + Math.min(tick, 4) * (1 + (i % 2)));
  const sum = totals.reduce((a, b) => a + b, 0);
  const labels = ["1981", "1991", "2001", "2011"];
  const correctIdx = 1;
  const reveal = tick >= 4;
  const timer = Math.max(0, 18 - tick * 4);

  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] muted-text">Quiz · Kahoot mode</p>
        <span className="mono text-[11px]" style={{ color: reveal ? "var(--blue)" : "var(--ink)" }}>
          {reveal ? "✓ revealed" : `${timer}s`}
        </span>
      </div>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">When did the web go public?</h3>
      <div className="mt-4 space-y-2.5">
        {labels.map((label, i) => {
          const pct = Math.round((totals[i] / sum) * 100);
          const isCorrect = reveal && i === correctIdx;
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs">
                <span className={isCorrect ? "font-semibold" : ""} style={isCorrect ? { color: "#22c55e" } : undefined}>
                  {label} {isCorrect && "✓"}
                </span>
                <span className="muted-text">{pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                <div
                  className="bar-fill h-full rounded-full"
                  style={{
                    width: `${mounted ? pct : 0}%`,
                    transitionDelay: `${i * 80}ms`,
                    background: isCorrect ? "#22c55e" : "var(--blue)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function RatingScene({ tick }: { tick: number }) {
  // NPS-style 0–10 distribution that grows in.
  const base = [1, 0, 1, 2, 3, 4, 6, 8, 11, 9, 5];
  const dist = base.map((b, i) => b + Math.min(tick, 4) * (i > 7 ? 2 : 1));
  const max = Math.max(...dist);
  const total = dist.reduce((a, b) => a + b, 0);
  const detractors = dist.slice(0, 7).reduce((a, b) => a + b, 0);
  const promoters = dist.slice(9).reduce((a, b) => a + b, 0);
  const nps = Math.round(((promoters - detractors) / total) * 100);
  const npsColor = nps >= 50 ? "#22c55e" : nps >= 0 ? "#eab308" : "#ef4444";

  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] muted-text">NPS · 0–10</p>
        <span
          className="mono inline-flex items-baseline gap-1 rounded-full px-2 py-0.5 text-[11px]"
          style={{
            background: `${npsColor}1a`,
            color: npsColor,
            border: `1px solid ${npsColor}40`,
          }}
        >
          NPS <span className="text-sm font-bold">{nps > 0 ? `+${nps}` : nps}</span>
        </span>
      </div>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">How likely to recommend?</h3>
      <div className="mt-6 flex h-[140px] items-end justify-between gap-1.5">
        {dist.map((v, i) => {
          const pct = Math.round((v / max) * 100);
          const color = i <= 6 ? "#ef4444" : i <= 8 ? "#eab308" : "#22c55e";
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end">
                <div
                  className="bar-fill w-full rounded-t-md"
                  style={{
                    height: `${mounted ? pct : 0}%`,
                    transitionDelay: `${i * 50}ms`,
                    background: color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="mono text-[9px] muted-text">{i}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] muted-text">
        <span className="mono" style={{ color: "var(--ink)" }}>{dist.reduce((a, b) => a + b, 0)}</span> ratings
      </p>
    </>
  );
}

const QA_QUESTIONS = [
  { q: "Will the slides be shared after?", v: 23 },
  { q: "How does pricing scale for a 200-person workshop?", v: 17 },
  { q: "Can we white-label the join page?", v: 12 },
  { q: "Is data stored in the EU?", v: 9 },
  { q: "What about offline mode?", v: 6 },
];

function QAScene({ tick }: { tick: number }) {
  const seenRef = useRef<Set<number>>(new Set());
  const visible = Math.min(QA_QUESTIONS.length, 2 + tick);
  for (let i = 0; i < visible; i++) seenRef.current.add(i);

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Q&amp;A · upvoted</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">Audience questions</h3>
      <ul className="mt-4 space-y-2">
        {QA_QUESTIONS.slice(0, visible).map((qq, i) => {
          const isNew = i >= visible - 1;
          return (
            <li
              key={qq.q}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${isNew ? "row-enter" : ""}`}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--line)",
                animationDelay: isNew ? "0ms" : undefined,
              }}
            >
              <span className="mono mt-0.5 inline-flex min-w-[28px] flex-col items-center rounded-md px-1 py-0.5 text-[10px]"
                style={{ background: "rgba(0,113,227,0.08)", color: "var(--blue)" }}>
                ▲ {qq.v + tick * (i + 1)}
              </span>
              <span className="flex-1 leading-snug">{qq.q}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function RankingScene() {
  const items = [
    { t: "Better onboarding", color: "var(--blue)" },
    { t: "Mobile app", color: "var(--ink)" },
    { t: "More integrations", color: "var(--ink)" },
    { t: "Dark mode polish", color: "var(--ink)" },
  ];
  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Ranking</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">Drag to prioritize</h3>
      <ol className="mt-4 space-y-2">
        {items.map((it, i) => (
          <li
            key={it.t}
            className="row-enter flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
            style={{
              background: i === 0 ? "rgba(0,113,227,0.08)" : "rgba(255,255,255,0.02)",
              border: "1px solid var(--line)",
              animationDelay: `${i * 80}ms`,
            }}
          >
            <span className="flex items-center gap-3">
              <span className="mono text-xs" style={{ color: i === 0 ? "var(--blue)" : "var(--muted)" }}>
                #{i + 1}
              </span>
              <span className={i === 0 ? "font-semibold" : ""} style={{ color: it.color }}>{it.t}</span>
            </span>
            <span className="muted-text text-[11px]" style={{ letterSpacing: "0.1em" }}>⋮⋮</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function LeaderboardScene({ tick }: { tick: number }) {
  const baseRows = [
    { n: "Maya", s: 4200 },
    { n: "Jin", s: 3850 },
    { n: "Sara", s: 3600 },
    { n: "Leo", s: 3120 },
    { n: "Ari", s: 2980 },
  ];
  // Re-sort slightly each tick so positions shuffle.
  const rows = [...baseRows]
    .map((r, i) => ({ ...r, s: r.s + (tick * 73 * (i + 1)) % 400 }))
    .sort((a, b) => b.s - a.s);

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Live leaderboard</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">Top players</h3>
      <ol className="mt-4 space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={r.n}
            className="row-enter flex items-center justify-between rounded-lg px-3 py-2 text-sm"
            style={{
              background: i === 0 ? "rgba(0,113,227,0.08)" : "rgba(255,255,255,0.02)",
              border: "1px solid var(--line)",
              animationDelay: `${i * 60}ms`,
            }}
          >
            <span className="flex items-center gap-3">
              <span
                className="mono w-4 text-xs"
                style={{ color: i === 0 ? "var(--blue)" : "var(--muted)" }}
              >
                {i + 1}
              </span>
              <span className={i === 0 ? "font-semibold" : ""}>{r.n}</span>
            </span>
            <span className="mono text-xs" style={{ color: i === 0 ? "var(--blue)" : "var(--ink)" }}>
              {r.s.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
