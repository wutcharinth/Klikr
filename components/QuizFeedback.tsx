"use client";

import { useMemo } from "react";

// Pure-CSS confetti burst — 18 particles fly outward via CSS variables. Mounts
// once and animates to completion (parent should remount via React key if
// repeating). Contained to its position:relative parent.
export function MiniConfettiBurst({ count = 18 }: { count?: number }) {
  const particles = useMemo(() => {
    const palette = ["#22c55e", "#0071e3", "#facc15", "#ef4444", "#a855f7", "#fb923c"];
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 60 + Math.random() * 40;
      return {
        id: i,
        bx: `${Math.cos(angle) * dist}px`,
        by: `${Math.sin(angle) * dist}px`,
        color: palette[i % palette.length],
        delay: Math.random() * 0.08,
        size: 6 + Math.random() * 6,
      };
    });
  }, [count]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p) => (
        <span
          key={p.id}
          className="burst-particle"
          style={
            {
              "--bx": p.bx,
              "--by": p.by,
              background: p.color,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function encouragementFor(pct: number, rank: number): string {
  if (rank === 1) return "🏆 Top of the leaderboard. Don't let go.";
  if (pct <= 0.1) return "🔥 Top 10% — you're on fire.";
  if (pct <= 0.25) return "💪 Top quarter. Keep climbing.";
  if (pct <= 0.5) return "👍 Solid run. Few more to break the top half.";
  if (pct <= 0.75) return "🚀 Plenty of room to move up. Lock in the next one.";
  return "🌱 Every round is a fresh shot. You've got this.";
}
