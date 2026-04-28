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

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "this",
  "to",
  "we",
  "with",
]);

type WordGroup = {
  key: string;
  label: string;
  count: number;
  variants: Map<string, number>;
};

function normalizeWord(raw: string) {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .toLowerCase();
}

function stemWord(word: string) {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) return word.slice(0, -1);
  if (word.endsWith("ing") && word.length > 6) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("ly") && word.length > 5) return word.slice(0, -2);
  return word;
}

function editDistanceWithinOne(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function nearestGroupKey(groups: Map<string, WordGroup>, key: string) {
  if (groups.has(key)) return key;
  if (key.length < 5) return key;
  for (const existing of groups.keys()) {
    if (existing.length >= 5 && editDistanceWithinOne(existing, key)) return existing;
  }
  return key;
}

function bestLabel(variants: Map<string, number>) {
  return [...variants.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0].length !== b[0].length) return a[0].length - b[0].length;
    return a[0].localeCompare(b[0]);
  })[0]?.[0] ?? "";
}

function buildGroups(responses: ResponseRow[]) {
  const groups = new Map<string, WordGroup>();
  for (const r of responses) {
    if (!r.value_text) continue;
    for (const raw of r.value_text.split(/[\s,]+/)) {
      const word = normalizeWord(raw);
      if (!word || STOP_WORDS.has(word)) continue;
      const key = nearestGroupKey(groups, stemWord(word));
      const group = groups.get(key) ?? { key, label: word, count: 0, variants: new Map<string, number>() };
      group.count++;
      group.variants.set(word, (group.variants.get(word) ?? 0) + 1);
      group.label = bestLabel(group.variants);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

export function WordCloudView({ responses }: { responses: ResponseRow[] }) {
  const entries = buildGroups(responses);
  const max = Math.max(1, ...entries.map((entry) => entry.count));

  if (entries.length === 0) {
    return <p className="text-center text-sm muted-text">Waiting for responses…</p>;
  }

  return (
    <div className="flex min-h-[18rem] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 py-4">
      {entries.map((entry, i) => {
        const ratio = entry.count / max;
        const size = 22 + ratio * 70; // 22 → 92px
        const weight = ratio > 0.7 ? 700 : ratio > 0.35 ? 600 : 500;
        const color = colorFor(entry.key);
        const variants = [...entry.variants.keys()].filter((v) => v !== entry.label);
        const title = variants.length > 0
          ? `${entry.label} · ${entry.count} · grouped with ${variants.join(", ")}`
          : `${entry.label} · ${entry.count}`;
        return (
          <span
            key={entry.key}
            className="anim-pop inline-block leading-[1] tracking-[-0.02em] transition-transform"
            style={{
              fontSize: size,
              fontWeight: weight,
              color,
              animationDelay: `${i * 35}ms`,
            }}
            title={title}
          >
            {entry.label}
          </span>
        );
      })}
    </div>
  );
}
