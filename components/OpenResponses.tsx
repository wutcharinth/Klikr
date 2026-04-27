"use client";

import type { ResponseRow } from "@/lib/types";

export function OpenResponses({ responses }: { responses: ResponseRow[] }) {
  if (responses.length === 0) {
    return <p className="text-center text-2xl muted-text">Waiting for responses…</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {responses
        .slice()
        .reverse()
        .map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-2xl leading-snug dark:border-slate-700 dark:bg-slate-800 sm:text-3xl"
          >
            {r.value_text}
          </li>
        ))}
    </ul>
  );
}
