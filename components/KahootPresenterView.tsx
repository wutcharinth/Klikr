"use client";

import { useEffect, useState } from "react";
import { Triangle, Diamond, Circle, Square } from "lucide-react";
import type { Slide, ResponseRow, QuizConfig } from "@/lib/types";

const TILES = [
  { color: "#E21B3C", Icon: Triangle, label: "Triangle" },
  { color: "#1368CE", Icon: Diamond, label: "Diamond" },
  { color: "#FFA602", Icon: Circle, label: "Circle" },
  { color: "#26890C", Icon: Square, label: "Square" },
];

export function KahootPresenterView({
  slide,
  responses,
  startedAt,
  onExpired,
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
  onExpired?: () => void;
}) {
  const cfg = slide.config as QuizConfig;
  const opts = cfg.options.slice(0, 4);
  const limit = cfg.time_limit_s ?? 20;

  const start = startedAt ? new Date(startedAt).getTime() : Date.now();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, (now - start) / 1000);
  const remaining = Math.max(0, limit - elapsed);
  const progress = Math.min(1, elapsed / limit);
  const expired = remaining <= 0;
  const ringColor = remaining > limit / 2 ? "#26890C" : remaining > limit / 4 ? "#FFA602" : "#E21B3C";

  useEffect(() => {
    if (expired) onExpired?.();
  }, [expired, onExpired]);

  const counts = opts.map((_, i) => responses.filter((r) => r.value_index === i).length);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider muted-text">Quiz</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{slide.question}</h2>
        </div>
        <div className="flex items-center gap-3">
          <TimerRing remaining={remaining} progress={progress} color={ringColor} expired={expired} />
        </div>
      </div>

      {slide.image_url && (
        <div>
          <img src={slide.image_url} alt="" className="max-h-72 w-full rounded-xl object-cover" style={{ border: "1px solid var(--line)" }} />
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

      <div className="grid grid-cols-2 gap-3">
        {opts.map((opt, i) => {
          const isCorrect = expired && cfg.correct_index === i;
          const isWrong = expired && cfg.correct_index !== i;
          const tile = TILES[i];
          // Reveal-time tile colours: green for correct, red for wrong, ignore
          // the original Kahoot palette so the right answer is unmistakable.
          const revealBg = isCorrect ? "#22c55e" : isWrong ? "#ef4444" : tile.color;
          const pct = total > 0 ? (counts[i] / total) * 100 : 0;
          return (
            <div
              key={i}
              className="relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white transition-all"
              style={{
                background: revealBg,
                opacity: isWrong ? 0.55 : 1,
                transform: isCorrect ? "scale(1.02)" : "scale(1)",
                boxShadow: isCorrect ? "0 0 0 4px rgba(255,255,255,0.65)" : "none",
              }}
            >
              {/* Vote-share fill that grows in once the answer is revealed. */}
              {expired && (
                <span
                  className="absolute inset-y-0 left-0 z-0"
                  style={{
                    width: `${pct}%`,
                    background: "rgba(255,255,255,0.32)",
                    transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  aria-hidden
                />
              )}
              <tile.Icon className="relative z-10 h-8 w-8 flex-none" />
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p className="text-xl font-semibold">{opt}</p>
                  {expired && total > 0 && (
                    <span
                      className="mono text-2xl font-bold leading-none"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs opacity-90">
                  {counts[i]} vote{counts[i] === 1 ? "" : "s"}
                </p>
              </div>
              {expired && isCorrect && (
                <>
                  <span className="relative z-10 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ color: "#16a34a" }}>
                    ✓ Correct
                  </span>
                  <ConfettiBurst />
                </>
              )}
            </div>
          );
        })}
      </div>

      {expired && cfg.explanation && cfg.explanation.trim().length > 0 && (
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

      {expired ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl panel-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
              aria-hidden
            >
              <span className="text-lg font-bold">✓</span>
            </div>
            <div className="leading-tight">
              <p className="text-2xl font-bold tracking-tight">
                <span className="mono count-bump inline-block" style={{ fontVariantNumeric: "tabular-nums", color: "#22c55e" }}>
                  {counts[cfg.correct_index]}
                </span>
                <span className="muted-text"> / {total}</span>
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] muted-text">got it right</p>
            </div>
          </div>
          <div className="leading-tight text-right">
            <p className="mono text-xl font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
              {total > 0 ? `${Math.round((counts[cfg.correct_index] / total) * 100)}%` : "0%"}
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] muted-text">accuracy</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-sm muted-text">
          <span>
            <span className="mono count-bump inline-block" style={{ fontVariantNumeric: "tabular-nums" }}>{total}</span>{" "}
            {total === 1 ? "answer" : "answers"} in
          </span>
        </div>
      )}
    </div>
  );
}


// Lightweight confetti — 18 colored particles fan out from the centre of the
// correct tile. CSS-only so we can run dozens of these without hurting perf.
function ConfettiBurst() {
  const colors = ["#FFD166", "#06D6A0", "#118AB2", "#EF476F", "#F4A261", "#A8DADC"];
  const particles = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 60 + Math.random() * 70;
    return {
      bx: Math.cos(angle) * dist,
      by: Math.sin(angle) * dist,
      color: colors[i % colors.length],
      delay: Math.random() * 80,
      size: 6 + Math.random() * 6,
    };
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
            // CSS custom properties consumed by the burstFly keyframe.
            ["--bx" as string]: `${p.bx}px`,
            ["--by" as string]: `${p.by}px`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

function TimerRing({ remaining, progress, color, expired }: { remaining: number; progress: number; color: string; expired: boolean }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={48} cy={48} r={r} fill="none" stroke="var(--line)" strokeWidth={8} />
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * progress}
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.5s ease" }}
      />
      <text x={48} y={56} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)">
        {expired ? "✓" : Math.ceil(remaining)}
      </text>
    </svg>
  );
}
