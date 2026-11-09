"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Slide, ResponseRow, MCQConfig, QuizConfig } from "@/lib/types";
import { useQuizPhase } from "@/lib/useQuizPhase";
import { TimeBar, TimeLeftPill } from "./QuizTimers";
import { playPresenterClip } from "@/lib/audio";

export const ResultsBarChart = memo(function ResultsBarChart({
  slide,
  responses,
  highlightCorrect,
  fill,
}: {
  slide: Slide;
  responses: ResponseRow[];
  highlightCorrect?: boolean;
  fill?: boolean;
}) {
  const cfg = slide.config as MCQConfig | QuizConfig;
  const correctIdx = (cfg as QuizConfig).correct_index;
  const isMulti = (cfg as MCQConfig).multi ?? false;

  // Multi-MCQ stores picks as JSON in value_text; single uses value_index.
  // Quiz never multi-selects, so the regular path covers it. One pass over
  // the responses (was one pass per option, re-parsing JSON each time).
  const counts = useMemo(() => {
    const n = cfg.options.length;
    const tally = Array.from({ length: n }, () => 0);
    for (const r of responses) {
      if (isMulti) {
        if (!r.value_text) continue;
        try {
          const picks = JSON.parse(r.value_text) as number[];
          if (Array.isArray(picks)) for (const i of new Set(picks)) if (i >= 0 && i < n) tally[i]++;
        } catch {}
      } else if (r.value_index != null && r.value_index >= 0 && r.value_index < n) {
        tally[r.value_index]++;
      }
    }
    return cfg.options.map((label, i) => ({ label, count: tally[i], correct: highlightCorrect && i === correctIdx }));
  }, [responses, cfg.options, isMulti, highlightCorrect, correctIdx]);

  // Denominator: for multi we use total responses (each respondent counts once);
  // for single we use sum of votes (same as total when one vote per response).
  const totalResp = isMulti
    ? responses.length
    : counts.reduce((a, b) => a + b.count, 0);
  const max = Math.max(1, ...counts.map((c) => c.count));

  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <div className={fill ? "flex w-full min-h-0 flex-1 flex-col justify-center" : "w-full"}>
      <ul className="space-y-4">
        {counts.map((c, i) => {
          const pct = totalResp > 0 ? Math.round((c.count / totalResp) * 100) : 0;
          const widthPct = (c.count / max) * 100;
          const color = c.correct ? "var(--success, #22c55e)" : "var(--blue)";
          return (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-4 text-base sm:text-lg">
                <span
                  className={c.correct ? "font-semibold" : "font-medium"}
                  style={c.correct ? { color } : undefined}
                >
                  {c.label} {c.correct && <span aria-hidden>✓</span>}
                </span>
                <span className="mono shrink-0 text-sm muted-text">
                  {c.count} <span className="text-xs">· {pct}%</span>
                </span>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full"
                style={{ background: "var(--line)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${mounted ? widthPct : 0}%`,
                    background: color,
                    transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

// Used by quiz slides (non-Kahoot) to mirror Kahoot UX: hide vote tallies and
// the correct answer until the timer runs out, then reveal results.
export function QuizCountdown({
  slide,
  responses,
  startedAt,
  onExpired,
  forceClosed = false,
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
  onExpired?: () => void;
  forceClosed?: boolean;
}) {
  const cfg = slide.config as QuizConfig;
  const limit = cfg.time_limit_s ?? 20;
  const total = responses.length;
  // Phase changes are one-shot timers on the server clock; only the small
  // countdown leaves tick.
  const timing = useQuizPhase(startedAt, limit, { forceClosed });
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  });
  const firedRef = useRef(false);
  useEffect(() => {
    if (timing.phase !== "closed" || firedRef.current) return;
    firedRef.current = true;
    playPresenterClip("reveal");
    onExpiredRef.current?.();
  }, [timing.phase]);

  if (timing.phase === "intro") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] muted-text">Get ready</p>
        <div className="w-full max-w-xl">
          <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
            <div className="intro-bar h-full rounded-full" style={{ animationDuration: `${timing.introMs || 3000}ms` }} />
          </div>
        </div>
      </div>
    );
  }

  if (timing.phase === "closed") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <ResultsBarChart slide={slide} responses={responses} highlightCorrect fill />
        {cfg.explanation && cfg.explanation.trim().length > 0 && (
          <div
            className="rounded-xl p-4 text-sm anim-fade-up"
            style={{
              background: "rgba(34, 197, 94, 0.10)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#22c55e" }}>
              Why
            </p>
            <p className="mt-1 leading-snug">{cfg.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4">
        <p className="mono text-sm muted-text">
          <span key={total} className="count-bump" style={{ color: "var(--ink, var(--fg))" }}>{total}</span>{" "}
          {total === 1 ? "answer" : "answers"} in
        </p>
        <TimeLeftPill closeAt={timing.closeAt} />
      </div>
      <div className="mt-3">
        <TimeBar closeAt={timing.closeAt} limit={limit} />
      </div>
      <ul className="mt-6 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {cfg.options.map((opt, i) => (
          <li
            key={i}
            className="anim-fade-up flex items-center gap-3 rounded-xl px-4 py-3 text-base sm:text-lg"
            style={{
              animationDelay: `${i * 70}ms`,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span
              className="mono inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "rgba(0,113,227,0.10)", color: "var(--blue)" }}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1">{opt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
