"use client";

import type { Slide, ResponseRow, RankingConfig } from "@/lib/types";

export function ResultsRanking({ slide, responses }: { slide: Slide; responses: ResponseRow[] }) {
  const cfg = slide.config as RankingConfig;
  const items = cfg.items ?? [];

  // For each item, average rank position. Lower = better. Ignore malformed responses.
  const sums = new Array(items.length).fill(0) as number[];
  const counts = new Array(items.length).fill(0) as number[];
  for (const r of responses) {
    if (!r.value_text) continue;
    let order: number[];
    try {
      order = JSON.parse(r.value_text);
    } catch {
      continue;
    }
    if (!Array.isArray(order) || order.length !== items.length) continue;
    order.forEach((itemIdx, position) => {
      if (typeof itemIdx === "number" && itemIdx >= 0 && itemIdx < items.length) {
        sums[itemIdx] += position + 1;
        counts[itemIdx]++;
      }
    });
  }

  const avg = items.map((_, i) => (counts[i] ? sums[i] / counts[i] : null));
  const sorted = items
    .map((label, i) => ({ label, avg: avg[i], i }))
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return a.avg - b.avg;
    });

  const total = responses.length;
  if (total === 0) {
    return <p className="text-center text-sm muted-text">Waiting for rankings…</p>;
  }

  // Bar length: shorter = better rank. Invert so the leader has the longest bar.
  const maxAvg = items.length;
  return (
    <div className="space-y-3">
      {sorted.map(({ label, avg, i }, position) => {
        const ratio = avg === null ? 0 : 1 - (avg - 1) / Math.max(1, maxAvg - 1);
        return (
          <div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: "32px 1fr 80px" }}>
            <span className="mono text-base font-semibold" style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
              #{position + 1}
            </span>
            <div className="h-9 overflow-hidden rounded-md" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}>
              <div
                className="flex h-full items-center px-3 text-sm"
                style={{
                  width: `${Math.max(8, ratio * 100)}%`,
                  background: "linear-gradient(90deg, var(--blue) 0%, #7c8aff 100%)",
                  color: "#fff",
                  transition: "width 700ms cubic-bezier(0.2,0.8,0.2,1)",
                }}
              >
                <span className="truncate">{label}</span>
              </div>
            </div>
            <span className="mono text-sm muted-text" style={{ fontVariantNumeric: "tabular-nums" }}>
              {avg === null ? "—" : `avg ${avg.toFixed(2)}`}
            </span>
          </div>
        );
      })}
      <div className="text-xs muted-text">
        <span className="mono">{total}</span> ranking{total === 1 ? "" : "s"}
      </div>
    </div>
  );
}
