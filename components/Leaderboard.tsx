"use client";

import type { Participant } from "@/lib/types";

export function Leaderboard({ participants }: { participants: Participant[] }) {
  const sorted = [...participants]
    .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 10);
  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.18em] muted-text">Leaderboard</h3>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot" /> live
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm muted-text">No participants yet.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all"
              style={{
                background: i === 0
                  ? "rgba(0, 113, 227, 0.08)"
                  : "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--line)",
                borderColor: i === 0 ? "rgba(0, 113, 227, 0.3)" : "var(--line)",
                transitionProperty: "transform, background, border-color",
                transitionDuration: "400ms",
              }}
            >
              <span className="flex items-center gap-3">
                <span className="mono muted-text" style={{ width: 22, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{p.nickname}</span>
                {i === 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                        style={{ background: "rgba(0,113,227,0.15)", color: "var(--blue)" }}>
                    1st
                  </span>
                )}
              </span>
              <span className="mono font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {p.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
