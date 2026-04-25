"use client";

import type { ResponseRow } from "@/lib/types";

// Curated palette — bright but harmonious, distinguishable from each other
// at small AND large sizes. Mix of blue family + warm accents.
const PALETTE = [
  "#0071e3", // apple blue
  "#5856d6", // indigo
  "#ff375f", // pink-red
  "#ff9f0a", // orange
  "#30d158", // green
  "#bf5af2", // purple
  "#0a84ff", // bright blue
  "#ff6482", // rose
  "#64d2ff", // cyan
  "#ffd60a", // yellow
  "#ac8fff", // lavender
  "#ff453a", // red
];

// Stable color picker keyed by word, so the same word always lands on the
// same color across re-renders.
function colorFor(word: string) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function WordCloudView({ responses }: { responses: ResponseRow[] }) {
  const counts = new Map<string, number>();
  for (const r of responses) {
    if (!r.value_text) continue;
    for (const word of r.value_text.split(/[\s,]+/)) {
      const w = word.trim().toLowerCase();
      if (!w) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...counts.values());

  if (entries.length === 0) {
    return <p className="text-center text-sm muted-text">Waiting for responses…</p>;
  }

  return (
    <div className="flex min-h-[18rem] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 py-4">
      {entries.map(([word, count], i) => {
        const ratio = count / max;
        const size = 22 + ratio * 70; // 22 → 92px
        const weight = ratio > 0.7 ? 700 : ratio > 0.35 ? 600 : 500;
        const color = colorFor(word);
        return (
          <span
            key={word}
            className="anim-pop inline-block leading-[1] tracking-[-0.02em] transition-transform"
            style={{
              fontSize: size,
              fontWeight: weight,
              color,
              animationDelay: `${i * 35}ms`,
            }}
            title={`${word} · ${count}`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
