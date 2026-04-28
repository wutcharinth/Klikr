"use client";

import type { Slide, ResponseRow, RatingConfig } from "@/lib/types";
import { EmptyResponseState } from "./EmptyResponseState";

export function RatingDistribution({ slide, responses }: { slide: Slide; responses: ResponseRow[] }) {
  const cfg = slide.config as RatingConfig;
  const range = cfg.scale === 5 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const counts = range.map((n) => responses.filter((r) => r.value_index === n).length);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <EmptyResponseState
        title="Ratings will appear here"
        body="As people tap a number, the distribution and average update in real time."
      />
    );
  }
  const max = Math.max(1, ...counts);
  const sum = responses.reduce((s, r) => s + (r.value_index ?? 0), 0);
  const avg = total ? sum / total : 0;

  // For 0-10, classic NPS = % promoters (9-10) - % detractors (0-6).
  let nps: number | null = null;
  if (cfg.scale === 10 && total > 0) {
    const promoters = responses.filter((r) => (r.value_index ?? 0) >= 9).length;
    const detractors = responses.filter((r) => (r.value_index ?? 0) <= 6).length;
    nps = Math.round(((promoters - detractors) / total) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Average" value={total ? avg.toFixed(2) : "—"} />
        <Stat label="Responses" value={total.toString()} />
        {cfg.scale === 10 ? (
          <Stat label="NPS" value={nps === null ? "—" : nps.toString()} />
        ) : (
          <Stat label="Top score" value={(counts[counts.length - 1] || 0).toString()} />
        )}
      </div>

      <div className="space-y-2">
        {range.map((n, i) => {
          const c = counts[i];
          const pct = (c / max) * 100;
          return (
            <div key={n} className="grid items-center gap-3" style={{ gridTemplateColumns: "32px 1fr 40px" }}>
              <span className="mono text-sm muted-text" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n}</span>
              <div className="h-7 overflow-hidden rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, var(--blue) 0%, #7c8aff 100%)",
                    transitionDuration: "700ms",
                  }}
                />
              </div>
              <span className="mono text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs muted-text">
        <span>{cfg.min_label ?? (cfg.scale === 5 ? "Poor" : "Detractors")}</span>
        <span>{cfg.max_label ?? (cfg.scale === 5 ? "Great" : "Promoters")}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
      <div className="text-[10px] uppercase tracking-[0.18em] muted-text">{label}</div>
      <div className="mono mt-1 text-2xl font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
