"use client";

import type { ResponseRow } from "@/lib/types";

export function OpenResponses({ responses }: { responses: ResponseRow[] }) {
  if (responses.length === 0) {
    return <p className="text-center text-slate-400">Waiting for responses…</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {responses
        .slice()
        .reverse()
        .map((r) => (
          <li
            key={r.id}
            className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {r.value_text}
          </li>
        ))}
    </ul>
  );
}
