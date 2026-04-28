"use client";

import { useEffect, useLayoutEffect, useState } from "react";

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
    <div
      className="hero-breathe scene-dark relative w-full max-w-md overflow-hidden rounded-[28px] p-4 shadow-2xl sm:p-5"
      style={{
        background: "linear-gradient(180deg, #252527 0%, #1d1d1f 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 30px 80px -45px rgba(0, 113, 227, 0.65)",
      }}
    >
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot pulse-ring" /> Klikr live
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

      <div className="relative mt-4 min-h-[290px]">
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
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] muted-text">Slide 01 of 06 · mcq</p>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot" /> live
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">How was the workshop?</h3>
      <div className="mt-5 space-y-3">
        {labels.map((label, i) => {
          const pct = Math.round((totals[i] / sum) * 100);
          return (
            <div key={label} className="rounded-2xl p-3" style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="mono muted-text">{pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="bar-fill h-full rounded-full"
                  style={{
                    width: `${mounted ? pct : 0}%`,
                    transitionDelay: `${i * 80}ms`,
                    background: i === 1 || i === 3 ? "var(--blue)" : "rgba(255,255,255,0.55)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] muted-text">
        <span className="mono text-[var(--fg)]">{sum}</span> responses
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
  const visible = Math.min(WORDS.length, 3 + tick * 2);
  const slice = WORDS.slice(0, visible);

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] muted-text">Word cloud</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">One word for today?</h3>
      <div className="mt-5 flex h-[170px] flex-wrap content-center items-center justify-center gap-x-3 gap-y-1 text-center">
        {slice.map((w, i) => {
          const isNew = i >= Math.max(0, visible - 2);
          return (
            <span
              key={w.t}
              className={isNew ? "word-fly" : ""}
              style={{
                fontSize: `${0.85 + w.w * 0.12}rem`,
                fontWeight: w.w > 5 ? 700 : 500,
                color: w.w > 5 ? "var(--blue)" : "var(--fg)",
                animationDelay: isNew ? `${i * 70}ms` : "0ms",
              }}
            >
              {w.t}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] muted-text">
        <span className="mono text-[var(--fg)]">{visible * 4 + 8}</span> responses
      </p>
    </>
  );
}

// ---------- Promo intro scenes ----------

function IntroScene() {
  return (
    <div className="flex h-full flex-col text-center">
      <div className="anim-fade-up pill mx-auto"><span className="live-dot pulse-ring" /> Lobby</div>
      <p className="anim-fade-up delay-200 mt-7 text-sm muted-text">Audience joins at</p>
      <p className="anim-fade-up delay-200 mt-1 text-sm break-all">
        <span className="muted-text">klikrapp.com / </span>
        <span className="mono">7RUC66</span>
      </p>
      <div className="anim-scale-in delay-300 mx-auto mt-8 grid h-36 w-36 place-items-center rounded-2xl bg-white p-4 shadow-xl">
        <div
          className="h-full w-full rounded-lg"
          style={{
            background:
              "linear-gradient(90deg,#111 10px,transparent 10px 18px,#111 18px 28px,transparent 28px),linear-gradient(#111 10px,transparent 10px 18px,#111 18px 28px,transparent 28px)",
            backgroundSize: "38px 38px",
          }}
        />
      </div>
      <p className="anim-fade-up delay-400 mt-4 text-[10px] uppercase tracking-[0.18em] muted-text">Scan to join</p>
      <p className="anim-fade-up delay-500 mono mt-2 text-4xl font-bold tracking-[0.22em]" style={{ color: "var(--blue)" }}>
        7RUC66
      </p>
      <div className="anim-pop delay-700 mx-auto mt-6 rounded-full px-4 py-2 text-sm font-medium"
        style={{ background: "rgba(0,113,227,0.22)", color: "#fff", boxShadow: "0 14px 34px -16px rgba(0,113,227,.8)" }}>
        Maya joined
      </div>
    </div>
  );
}

function ValuePropScene() {
  const stats = [
    { big: "14", small: "people joined" },
    { big: "06", small: "slides ready" },
    { big: "LIVE", small: "present mode" },
  ];
  return (
    <div className="flex h-full flex-col">
      <p className="text-[10px] uppercase tracking-[0.18em] muted-text">Presenter view</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">Start when the room is ready.</h3>
      <div className="mt-6 grid flex-1 grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div
            key={s.small}
            className="anim-pop flex flex-col items-center justify-center rounded-2xl p-3 text-center"
            style={{
              background: i === 0 ? "rgba(0,113,227,0.14)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "1px solid rgba(0,113,227,0.32)" : "1px solid var(--line)",
              animationDelay: `${i * 120}ms`,
            }}
          >
            <span className="mono text-2xl font-bold" style={{ color: "var(--blue)" }}>{s.big}</span>
            <span className="mt-2 text-[10px] uppercase tracking-[0.15em] muted-text">{s.small}</span>
          </div>
        ))}
      </div>
      <button className="btn-primary anim-fade-up delay-400 mt-5 w-full" style={{ height: 46 }}>
        Start presentation
      </button>
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
        <p className="text-[10px] uppercase tracking-[0.18em] muted-text">Slide 03 of 06 · quiz</p>
        <span className="mono rounded-full px-2.5 py-1 text-xs" style={{ color: reveal ? "#86efac" : "var(--fg)", border: "1px solid var(--line)" }}>
          {reveal ? "results" : `${timer}s`}
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">When did the web go public?</h3>
      <div className="mt-5 space-y-3">
        {labels.map((label, i) => {
          const pct = Math.round((totals[i] / sum) * 100);
          const isCorrect = reveal && i === correctIdx;
          return (
            <div key={label} className="rounded-2xl p-3" style={{ border: `1px solid ${isCorrect ? "rgba(48,209,88,.55)" : "var(--line)"}`, background: isCorrect ? "rgba(48,209,88,.10)" : "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center justify-between text-sm">
                <span className={isCorrect ? "font-semibold" : ""} style={isCorrect ? { color: "#22c55e" } : undefined}>
                  {label} {isCorrect && "✓"}
                </span>
                <span className="mono muted-text">{pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
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
        <span className="mono text-[var(--fg)]">{dist.reduce((a, b) => a + b, 0)}</span> ratings
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
  const visible = Math.min(QA_QUESTIONS.length, 2 + tick);

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
    { t: "Better onboarding" },
    { t: "Mobile app" },
    { t: "More integrations" },
    { t: "Dark mode polish" },
  ];
  return (
    <>
      <p className="text-[10px] uppercase tracking-[0.18em] muted-text">Audience · ranking</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">Drag to prioritize</h3>
      <ol className="relative mt-5 space-y-2">
        {items.map((it, i) => (
          <li
            key={it.t}
            className={`row-enter flex items-center justify-between rounded-2xl px-3 py-3 text-sm ${i === 0 ? "ranking-lift" : ""}`}
            style={{
              background: i === 0 ? "rgba(0,113,227,0.18)" : "rgba(255,255,255,0.04)",
              border: i === 0 ? "1px solid rgba(0,113,227,0.48)" : "1px solid var(--line)",
              animationDelay: `${i * 80}ms`,
            }}
          >
            <span className="flex items-center gap-3">
              <span className="mono text-xs" style={{ color: i === 0 ? "var(--blue)" : "var(--muted)" }}>
                #{i + 1}
              </span>
              <span className={i === 0 ? "font-semibold text-[var(--blue)]" : ""}>{it.t}</span>
            </span>
            <span className="muted-text text-[11px]" style={{ letterSpacing: "0.1em" }}>⋮⋮</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] muted-text"><span className="mono text-[var(--fg)]">18</span> rankings submitted</p>
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
            <span className="mono text-xs" style={{ color: i === 0 ? "var(--blue)" : "var(--fg)" }}>
              {r.s.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
