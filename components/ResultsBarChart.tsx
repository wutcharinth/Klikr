"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { Slide, ResponseRow, MCQConfig, QuizConfig } from "@/lib/types";

export function ResultsBarChart({
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
  // Quiz never multi-selects, so the regular path covers it.
  const counts = cfg.options.map((label, i) => {
    let count = 0;
    if (isMulti) {
      for (const r of responses) {
        if (!r.value_text) continue;
        try {
          const picks = JSON.parse(r.value_text) as number[];
          if (Array.isArray(picks) && picks.includes(i)) count++;
        } catch {}
      }
    } else {
      count = responses.filter((r) => r.value_index === i).length;
    }
    return { label, count, correct: highlightCorrect && i === correctIdx };
  });

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
}

// Used by quiz slides (non-Kahoot) to mirror Kahoot UX: hide vote tallies and
// the correct answer until the timer runs out, then reveal results.
export function QuizCountdown({
  slide,
  responses,
  startedAt,
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
}) {
  const cfg = slide.config as QuizConfig;
  const limit = cfg.time_limit_s ?? 20;
  const start = startedAt ? new Date(startedAt).getTime() : Date.now();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, (now - start) / 1000);
  const remaining = Math.max(0, limit - elapsed);
  const expired = remaining <= 0;
  const total = responses.length;

  if (expired) {
    return (
      <ResultsBarChart slide={slide} responses={responses} highlightCorrect fill />
    );
  }

  const ringColor =
    remaining > limit / 2 ? "#22c55e" : remaining > limit / 4 ? "#eab308" : "#ef4444";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between">
        <p className="mono text-sm muted-text">
          <span style={{ color: "var(--ink, var(--fg))" }}>{total}</span>{" "}
          {total === 1 ? "answer" : "answers"} in
        </p>
        <div
          className="mono inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-sm"
          style={{
            background: `${ringColor}1a`,
            color: ringColor,
            border: `1px solid ${ringColor}40`,
          }}
        >
          <span className="text-xl font-bold">{Math.ceil(remaining)}</span>s
        </div>
      </div>
      <ul className="mt-6 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {cfg.options.map((opt, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-4 text-lg sm:text-xl"
            style={{
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span
              className="mono inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
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
