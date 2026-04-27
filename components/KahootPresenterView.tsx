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
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
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
          return (
            <div
              key={i}
              className="relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white transition-all"
              style={{
                background: tile.color,
                opacity: isWrong ? 0.4 : 1,
                transform: isCorrect ? "scale(1.02)" : "scale(1)",
                boxShadow: isCorrect ? "0 0 0 4px rgba(255,255,255,0.6)" : "none",
              }}
            >
              <tile.Icon className="h-8 w-8 flex-none" />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold">{opt}</p>
                <p className="mt-1 text-xs opacity-80">{counts[i]} vote{counts[i] === 1 ? "" : "s"}</p>
              </div>
              {expired && isCorrect && (
                <>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">Correct</span>
                  <ConfettiBurst />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm muted-text">
        <span>{total} {total === 1 ? "answer" : "answers"} in</span>
        {expired && <span>Time's up — {counts[cfg.correct_index]} got it right</span>}
      </div>
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
