"use client";

import { TagCloud } from "react-tagcloud";
import type { ResponseRow } from "@/lib/types";

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
  const tags = Array.from(counts.entries()).map(([value, count]) => ({ value, count }));

  if (tags.length === 0) {
    return <p className="text-center text-slate-400">Waiting for responses…</p>;
  }

  return (
    <div className="flex min-h-[18rem] items-center justify-center">
      <TagCloud
        minSize={16}
        maxSize={64}
        tags={tags}
        colorOptions={{ luminosity: "dark", hue: "blue" }}
      />
    </div>
  );
}
