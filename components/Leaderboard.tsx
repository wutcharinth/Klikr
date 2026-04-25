"use client";

import type { Participant } from "@/lib/types";

export function Leaderboard({ participants }: { participants: Participant[] }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score).slice(0, 10);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Leaderboard</h3>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No participants yet.</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {sorted.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>
                <span className="mr-2 inline-block w-6 text-right font-mono text-slate-400">
                  {i + 1}.
                </span>
                {p.nickname}
              </span>
              <span className="font-mono font-semibold">{p.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
