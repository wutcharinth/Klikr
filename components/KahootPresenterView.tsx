"use client";

import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, Users, Zap } from "lucide-react";
import type { Slide, ResponseRow, QuizConfig } from "@/lib/types";
import { QUIZ_TILES, tileGradient } from "@/lib/quizTiles";
import { useQuizPhase, useSecondsLeft } from "@/lib/useQuizPhase";
import { useElapsed } from "./QuizTimers";
import { useCountUp } from "@/lib/useCountUp";
import { playPresenterClip } from "@/lib/audio";
import { correctRevealMs, knockoutOrder, KNOCKOUT_START_MS, KNOCKOUT_STEP_MS } from "@/lib/quizReveal";

// Big-screen game-show quiz. Three beats, all on the server clock:
//   intro   — "Question 3 of 10", the question alone, a get-ready bar
//   open    — answer tiles spring in, timer ring drains, live answer counter
//   closed  — reveal: correct tile glows, the rest dim, vote fills grow,
//             counts tick up, "X / Y got it", optional explanation
// The component re-renders only on phase changes and new answers; every
// per-frame visual (ring, bars) is a CSS animation, and the ticking digits
// live in tiny leaf components.
export const KahootPresenterView = memo(function KahootPresenterView({
  slide,
  responses,
  startedAt,
  onExpired,
  forceClosed = false,
  questionNumber,
  questionCount,
  playerCount = 0,
  nicknames,
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
  onExpired?: () => void;
  forceClosed?: boolean;
  questionNumber?: number;
  questionCount?: number;
  playerCount?: number;
  /** participant id → nickname, for the "locked in" ticker and fastest shout-out. */
  nicknames?: ReadonlyMap<string, string>;
}) {
  const cfg = slide.config as QuizConfig;
  const limit = cfg.time_limit_s ?? 20;
  const timing = useQuizPhase(startedAt, limit, { forceClosed });
  const optCount = Math.min(4, cfg.options.length);

  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  });
  const firedRef = useRef(false);
  const prevPhaseRef = useRef(timing.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = timing.phase;
    if (timing.phase === "open" && prev === "intro") playPresenterClip("go");
    if (timing.phase === "closed" && !firedRef.current) {
      firedRef.current = true;
      if (prev !== "closed") playPresenterClip("reveal");
      onExpiredRef.current?.();
    }
  }, [timing.phase]);

  const counts = useMemo(() => {
    const c = Array.from({ length: optCount }, () => 0);
    for (const r of responses) {
      if (r.value_index != null && r.value_index >= 0 && r.value_index < optCount) c[r.value_index]++;
    }
    return c;
  }, [responses, optCount]);
  const total = counts.reduce((a, b) => a + b, 0);
  const label = questionNumber && questionCount ? `Question ${questionNumber} of ${questionCount}` : "Quiz";

  // Knockout reveal (lib/quizReveal.ts): at time's up the vote split fills
  // in, wrong answers are knocked out least-picked first, then the survivor
  // lights up as correct. Phones flip to their result on the same schedule.
  const countsRef = useRef(counts);
  useEffect(() => {
    countsRef.current = counts;
  });
  const [knocked, setKnocked] = useState<number[]>([]);
  const [correctShown, setCorrectShown] = useState(false);
  const isClosed = timing.phase === "closed";
  useEffect(() => {
    if (!isClosed) return;
    const order = knockoutOrder(countsRef.current, cfg.correct_index);
    const timers = order.map((idx, k) =>
      setTimeout(() => {
        setKnocked((prev) => [...prev, idx]);
        playPresenterClip("thump");
      }, KNOCKOUT_START_MS + k * KNOCKOUT_STEP_MS),
    );
    timers.push(
      setTimeout(() => {
        setCorrectShown(true);
        playPresenterClip("correct");
      }, correctRevealMs(optCount)),
    );
    return () => timers.forEach(clearTimeout);
  }, [isClosed, cfg.correct_index, optCount]);

  if (timing.phase === "intro") {
    return (
      <PresenterIntro
        label={label}
        question={slide.question}
        imageUrl={slide.image_url}
        openAt={timing.openAt}
        introMs={timing.introMs}
      />
    );
  }

  const closed = timing.phase === "closed";
  const correctCount = counts[cfg.correct_index] ?? 0;
  const fastest = closed ? fastestCorrect(responses, cfg.correct_index, nicknames) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:gap-8">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          <p className="gs-label text-sm font-semibold uppercase tracking-[0.18em] muted-text">{label}</p>
          <h2 className="gs-question mt-3 text-5xl font-bold leading-[1.05] tracking-tight break-words sm:text-6xl lg:text-7xl">
            {slide.question}
          </h2>
        </div>
        <div className="flex flex-none items-center">
          {closed ? <TimesUpBadge /> : <TimerRing closeAt={timing.closeAt} limit={limit} />}
        </div>
      </div>

      {!closed && <UrgencyBar closeAt={timing.closeAt} limit={limit} />}

      {slide.image_url && !closed && (
        <div className="anim-fade-up">
          <img src={slide.image_url} alt="" className="max-h-56 w-full rounded-xl object-cover" style={{ border: "1px solid var(--line)" }} />
          {slide.image_credit && (
            <p className="mt-1 text-[10px] muted-text">
              Photo by{" "}
              <a href={slide.image_credit.photographer_url} target="_blank" rel="noopener noreferrer">
                {slide.image_credit.photographer}
              </a>{" "}
              on{" "}
              <a href="https://unsplash.com/?utm_source=klikr&utm_medium=referral" target="_blank" rel="noopener noreferrer">
                Unsplash
              </a>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 sm:gap-6">
        {cfg.options.slice(0, optCount).map((opt, i) => (
          <AnswerTile
            key={i}
            index={i}
            text={opt}
            state={
              !closed
                ? "open"
                : correctShown && cfg.correct_index === i
                  ? "correct"
                  : knocked.includes(i)
                    ? "out"
                    : "counting"
            }
            count={counts[i]}
            total={total}
          />
        ))}
      </div>

      {closed && !correctShown ? (
        <p className="gs-knockout-hint text-center text-xl font-semibold uppercase tracking-[0.2em] muted-text">
          Time&apos;s up — which answer survives?
        </p>
      ) : closed ? (
        <div className="gs-reveal-footer flex flex-wrap items-center justify-between gap-4 rounded-2xl panel-soft px-8 py-6">
          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
              aria-hidden
            >
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <div className="leading-tight">
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                <CountUpNumber value={correctCount} delay={500} className="mono" style={{ color: "#22c55e" }} />
                <span className="muted-text"> / {total}</span>
              </p>
              <p className="mt-1 text-sm uppercase tracking-[0.18em] muted-text">got it right</p>
            </div>
          </div>
          <RevealShoutout
            fastest={fastest}
            correctCount={correctCount}
            total={total}
            counts={counts}
            correctIndex={cfg.correct_index}
            options={cfg.options}
            loneWolf={correctCount === 1 ? loneWolfName(responses, cfg.correct_index, nicknames) : null}
          />
          <div className="text-right leading-tight">
            <p className="mono text-3xl font-semibold sm:text-4xl" style={{ fontVariantNumeric: "tabular-nums" }}>
              <CountUpNumber value={total > 0 ? Math.round((correctCount / total) * 100) : 0} delay={500} />%
            </p>
            <p className="mt-1 text-sm uppercase tracking-[0.18em] muted-text">accuracy</p>
          </div>
          {cfg.explanation && cfg.explanation.trim().length > 0 && (
            <div
              className="gs-explain w-full rounded-xl p-4 text-base"
              style={{ background: "rgba(34, 197, 94, 0.10)", border: "1px solid rgba(34, 197, 94, 0.3)" }}
            >
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#22c55e" }}>
                Why
              </p>
              <p className="mt-1 leading-snug">{cfg.explanation}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <AnswersIn total={total} players={playerCount} />
          {nicknames && <LockedInTicker responses={responses} nicknames={nicknames} />}
        </div>
      )}
    </div>
  );
});

function PresenterIntro({
  label,
  question,
  imageUrl,
  openAt,
  introMs,
}: {
  label: string;
  question: string;
  imageUrl: string | null;
  openAt: number;
  introMs: number;
}) {
  const total = Math.max(1, introMs || 3000);
  const elapsed = useElapsed(openAt, total);
  const words = question.split(/\s+/).filter(Boolean);
  return (
    <div className="gs-intro flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center">
      <span className="gs-intro-pill">{label}</span>
      <h2 className="max-w-5xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-7xl lg:text-8xl">
        {words.map((w, i) => (
          // The space sits OUTSIDE the inline-block span — inside it, the
          // trailing whitespace collapses and the words run together.
          <Fragment key={i}>
            <span className="gs-word" style={{ animationDelay: `${120 + i * 55}ms` }}>
              {w}
            </span>{" "}
          </Fragment>
        ))}
      </h2>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="gs-intro-img max-h-60 rounded-2xl object-cover" style={{ border: "1px solid var(--line)" }} />
      ) : null}
      <div className="w-full max-w-xl">
        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
          {elapsed != null ? (
            <div
              className="intro-bar h-full rounded-full"
              style={{ animationDuration: `${total}ms`, animationDelay: `-${elapsed}ms` }}
            />
          ) : null}
        </div>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] muted-text">Get ready</p>
      </div>
    </div>
  );
}

type TileState = "open" | "counting" | "out" | "correct";

const AnswerTile = memo(function AnswerTile({
  index,
  text,
  state,
  count,
  total,
}: {
  index: number;
  text: string;
  state: TileState;
  count: number;
  total: number;
}) {
  const closed = state !== "open";
  const tile = QUIZ_TILES[index];
  const pct = total > 0 ? (count / total) * 100 : 0;
  // Grow the vote fill from 0 a frame after the reveal starts.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!closed) return;
    const r = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(r);
  }, [closed]);
  return (
    <div
      className={`gs-tile gs-tile--${state} relative flex items-center gap-6 overflow-hidden rounded-3xl text-white sm:gap-8 ${
        closed ? "min-h-[120px] p-6 sm:min-h-[150px] sm:p-7" : "min-h-[170px] p-7 sm:min-h-[210px] sm:p-9"
      }`}
      style={{
        background: tileGradient(tile),
        boxShadow: state === "correct" ? `0 0 0 6px rgba(255,255,255,0.85), 0 24px 60px -20px ${tile.glow}` : `0 18px 40px -24px ${tile.glow}`,
        animationDelay: closed ? "0ms" : `${index * 90}ms`,
      }}
    >
      {closed && (
        <span
          className="absolute inset-y-0 left-0 z-0"
          style={{
            width: `${grown ? pct : 0}%`,
            background: "rgba(255,255,255,0.28)",
            transition: "width 1100ms cubic-bezier(0.22, 1, 0.36, 1) 250ms",
          }}
          aria-hidden
        />
      )}
      <tile.Icon className="relative z-10 h-14 w-14 flex-none sm:h-20 sm:w-20" fill="currentColor" strokeWidth={2} />
      <div className="relative z-10 min-w-0 flex-1">
        <p className="text-3xl font-bold leading-tight break-words sm:text-4xl lg:text-5xl">{text}</p>
        {closed && (
          <p className="mt-2 flex items-baseline gap-3 text-lg font-semibold opacity-95">
            <span className="mono text-4xl font-bold leading-none sm:text-5xl" style={{ fontVariantNumeric: "tabular-nums" }}>
              <CountUpNumber value={Math.round(pct)} delay={250} />%
            </span>
            <span>
              <CountUpNumber value={count} delay={250} /> vote{count === 1 ? "" : "s"}
            </span>
          </p>
        )}
      </div>
      {state === "out" && (
        <span className="gs-ko-stamp" aria-label="Knocked out">
          ✕
        </span>
      )}
      {state === "correct" && (
        <>
          <span className="gs-correct-badge relative z-10 rounded-full bg-white px-5 py-2 text-base font-bold uppercase tracking-wider sm:text-lg" style={{ color: "#16a34a" }}>
            ✓ Correct
          </span>
          <ConfettiBurst />
        </>
      )}
    </div>
  );
});

function CountUpNumber({
  value,
  delay = 0,
  className,
  style,
}: {
  value: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const shown = useCountUp(value, { from: 0, duration: 1000, delay });
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {shown.toLocaleString()}
    </span>
  );
}

// Newest answerers pop in as name chips while the question is open. Shows who
// has locked in — never what they picked — so the room can see the momentum
// (and who's still thinking).
const TICKER_MAX = 6;
function LockedInTicker({ responses, nicknames }: { responses: ResponseRow[]; nicknames: ReadonlyMap<string, string> }) {
  const recent = useMemo(
    () =>
      [...responses]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
        .filter((r) => nicknames.has(r.participant_id)),
    [responses, nicknames],
  );
  if (recent.length === 0) return null;
  const shown = recent.slice(0, TICKER_MAX);
  const more = recent.length - shown.length;
  return (
    <ul className="gs-ticker flex max-w-2xl flex-wrap items-center gap-2" aria-label="Players who have answered">
      {shown.map((r) => (
        <li key={r.id} className="gs-ticker-chip">
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          <span className="truncate">{nicknames.get(r.participant_id)}</span>
        </li>
      ))}
      {more > 0 && <li className="gs-ticker-chip gs-ticker-more">+{more}</li>}
    </ul>
  );
}

type Fastest = { nickname: string; ms: number };

function fastestCorrect(
  responses: ResponseRow[],
  correctIndex: number,
  nicknames: ReadonlyMap<string, string> | undefined,
): Fastest | null {
  if (!nicknames) return null;
  let best: Fastest | null = null;
  for (const r of responses) {
    if (r.value_index !== correctIndex || r.response_ms == null || r.response_ms < 0) continue;
    const nickname = nicknames.get(r.participant_id);
    if (!nickname) continue;
    if (!best || r.response_ms < best.ms) best = { nickname, ms: r.response_ms };
  }
  return best;
}

// Middle of the reveal footer: celebrate the quickest correct answer, or call
// out a clean sweep / a question that stumped the whole room.
function loneWolfName(responses: ResponseRow[], correctIndex: number, nicknames: ReadonlyMap<string, string> | undefined) {
  if (!nicknames) return null;
  const r = responses.find((x) => x.value_index === correctIndex);
  return r ? (nicknames.get(r.participant_id) ?? null) : null;
}

function RevealShoutout({
  fastest,
  correctCount,
  total,
  counts,
  correctIndex,
  options,
  loneWolf,
}: {
  fastest: Fastest | null;
  correctCount: number;
  total: number;
  counts: number[];
  correctIndex: number;
  options: string[];
  loneWolf: string | null;
}) {
  if (total === 0) return null;
  // Lone wolf: exactly one person in a real crowd got it.
  if (loneWolf && correctCount === 1 && total >= 3) {
    return (
      <p className="gs-shoutout" style={{ animationDelay: "300ms" }}>
        <span aria-hidden>🐺</span>
        <span>
          Lone wolf! Only <strong>{loneWolf}</strong> knew this
        </span>
      </p>
    );
  }
  // Trick question: the crowd's favourite answer was wrong.
  let top = -1;
  counts.forEach((c, i) => {
    if (top < 0 || c > counts[top]) top = i;
  });
  const trick = total >= 3 && top >= 0 && top !== correctIndex && counts[top] > (counts[correctIndex] ?? 0);
  if (correctCount === 0) {
    return (
      <p className="gs-shoutout" style={{ animationDelay: "900ms" }}>
        <span aria-hidden>🤯</span> This one stumped everyone
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      {trick && (
        <p className="gs-shoutout gs-shoutout--trick" style={{ animationDelay: "300ms" }}>
          <span aria-hidden>🪤</span>
          <span>
            Trick question — most of you said <strong>“{options[top]}”</strong>
          </span>
        </p>
      )}
      {fastest && (
        <p className="gs-shoutout" style={{ animationDelay: "900ms" }}>
          <Zap className="h-5 w-5" style={{ color: "#facc15", fill: "#facc15" }} aria-hidden />
          <span>
            Fastest: <strong>{fastest.nickname}</strong>
          </span>
          <span className="mono muted-text">{(fastest.ms / 1000).toFixed(1)}s</span>
        </p>
      )}
      {correctCount === total && total > 1 && (
        <p className="gs-shoutout gs-shoutout--soft" style={{ animationDelay: "1200ms" }}>
          <span aria-hidden>🎉</span> Everyone got it!
        </p>
      )}
    </div>
  );
}

function AnswersIn({ total, players }: { total: number; players: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = players > 0 ? Math.min(1, total / players) : 0;
  return (
    <div className="flex items-center justify-center gap-6 py-1">
      <svg width={84} height={84} viewBox="0 0 84 84" aria-hidden>
        <circle cx={42} cy={42} r={r} fill="none" stroke="var(--line)" strokeWidth={8} />
        <circle
          cx={42}
          cy={42}
          r={r}
          fill="none"
          stroke="var(--blue)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 42 42)"
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="flex flex-col items-start leading-none">
        <span key={total} className="mono count-bump text-7xl font-bold sm:text-8xl" style={{ fontVariantNumeric: "tabular-nums" }}>
          {total}
        </span>
        <span className="mt-2 flex items-center gap-2 text-base uppercase tracking-[0.18em] muted-text">
          {total === 1 ? "answer in" : "answers in"}
          {players > 0 ? (
            <>
              <span aria-hidden>·</span>
              <Users className="h-4 w-4" aria-hidden /> {players}
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}

// Timer ring: the drain + colour shift is one CSS animation for the whole
// question (anchored with a negative delay); only the digits tick, once a
// second, in this leaf.
function TimerRing({ closeAt, limit }: { closeAt: number; limit: number }) {
  const r = 70;
  const size = 176;
  const c = 2 * Math.PI * r;
  const totalMs = Math.max(1, limit) * 1000;
  const elapsed = useElapsed(closeAt, totalMs);
  const secs = useSecondsLeft(closeAt);
  const urgent = secs <= 5;
  useEffect(() => {
    if (secs > 0 && secs <= 5) playPresenterClip("tick");
  }, [secs]);
  return (
    <div className={urgent ? "gs-timer gs-timer--urgent" : "gs-timer"}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={12} />
        <circle
          className="gs-timer-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          stroke="#22c55e"
          style={
            elapsed == null
              ? undefined
              : ({
                  "--arc": `${c}px`,
                  animationName: "arcDrain",
                  animationDuration: `${totalMs}ms`,
                  animationDelay: `-${elapsed}ms`,
                } as React.CSSProperties)
          }
        />
        <text
          suppressHydrationWarning
          key={secs}
          className={urgent ? "gs-timer-digit gs-timer-digit--urgent" : "gs-timer-digit"}
          x={size / 2}
          y={size / 2 + 20}
          textAnchor="middle"
          fontSize="58"
          fontWeight="700"
          fill="var(--ink)"
        >
          {secs}
        </text>
      </svg>
    </div>
  );
}

function TimesUpBadge() {
  return (
    <div className="gs-timesup flex h-[176px] w-[176px] flex-col items-center justify-center rounded-full" aria-label="Time's up">
      <Check className="h-14 w-14" strokeWidth={3} />
      <span className="mt-1 text-xs font-bold uppercase tracking-[0.2em]">Time&apos;s up</span>
    </div>
  );
}

function UrgencyBar({ closeAt, limit }: { closeAt: number; limit: number }) {
  const totalMs = Math.max(1, limit) * 1000;
  const elapsed = useElapsed(closeAt, totalMs);
  return (
    <div className="h-3 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
      {elapsed == null ? (
        <div className="h-full rounded-full" style={{ background: "#22c55e" }} />
      ) : (
        <div className="time-bar h-full rounded-full" style={{ animationDuration: `${totalMs}ms`, animationDelay: `-${elapsed}ms` }} />
      )}
    </div>
  );
}

// Lightweight confetti — colored particles fan out from the centre of the
// correct tile. CSS-only; particle layout is fixed per mount.
function ConfettiBurst() {
  const [particles] = useState(() => {
    const colors = ["#FFD166", "#06D6A0", "#7C5CFF", "#E5484D", "#0071E3", "#ffffff"];
    return Array.from({ length: 26 }, (_, i) => {
      const angle = (i / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 80 + Math.random() * 110;
      return {
        bx: Math.cos(angle) * dist,
        by: Math.sin(angle) * dist,
        color: colors[i % colors.length],
        delay: 150 + Math.random() * 120,
        size: 7 + Math.random() * 7,
      };
    });
  });
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className="burst-particle"
          style={{
            background: p.color,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}ms`,
            ["--bx" as string]: `${p.bx}px`,
            ["--by" as string]: `${p.by}px`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
