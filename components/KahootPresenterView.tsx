"use client";

import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, Users } from "lucide-react";
import type { Slide, ResponseRow, QuizConfig } from "@/lib/types";
import { QUIZ_TILES, tileGradient } from "@/lib/quizTiles";
import { useQuizPhase, useSecondsLeft } from "@/lib/useQuizPhase";
import { useElapsed } from "./QuizTimers";
import { useCountUp } from "@/lib/useCountUp";
import { playPresenterClip } from "@/lib/audio";

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
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
  onExpired?: () => void;
  forceClosed?: boolean;
  questionNumber?: number;
  questionCount?: number;
  playerCount?: number;
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
            closed={closed}
            correct={cfg.correct_index === i}
            count={counts[i]}
            total={total}
          />
        ))}
      </div>

      {closed ? (
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
        <AnswersIn total={total} players={playerCount} />
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

const AnswerTile = memo(function AnswerTile({
  index,
  text,
  closed,
  correct,
  count,
  total,
}: {
  index: number;
  text: string;
  closed: boolean;
  correct: boolean;
  count: number;
  total: number;
}) {
  const tile = QUIZ_TILES[index];
  const pct = total > 0 ? (count / total) * 100 : 0;
  // Grow the vote fill from 0 a frame after the reveal starts.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!closed) return;
    const r = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(r);
  }, [closed]);
  const state = !closed ? "open" : correct ? "correct" : "wrong";
  return (
    <div
      className={`gs-tile gs-tile--${state} relative flex min-h-[170px] items-center gap-6 overflow-hidden rounded-3xl p-7 text-white sm:min-h-[210px] sm:gap-8 sm:p-9`}
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
