"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

type Summary = {
  themes?: { label: string; count: number; example?: string }[];
  sentiment?: "positive" | "mixed" | "negative" | "neutral";
  flags?: string[];
};

export default function AIThemeSummary({ slideId, sample }: { slideId: string; sample: string[] }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [shown, setShown] = useState(false);

  function load(refresh = false) {
    setError(null);
    setShown(true);
    start(async () => {
      try {
        const res = await fetch("/api/ai/summarize-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide_id: slideId, refresh }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "AI failed");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  if (!shown) {
    return (
      <div className="mt-3 flex items-center justify-between rounded-lg p-3 text-sm" style={{ background: "var(--pale)" }}>
        <div>
          <p className="muted-text text-xs">Sample responses</p>
          {sample.length > 0 && (
            <ul className="mt-1 text-sm">
              {sample.slice(0, 3).map((s, i) => <li key={i} className="truncate">• {s}</li>)}
            </ul>
          )}
        </div>
        <button onClick={() => load(false)} className="btn-ghost text-xs" style={{ color: "var(--blue)" }}>
          <Sparkles className="h-3 w-3" /> Summarise with AI
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg p-4" style={{ background: "var(--pale)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium muted-text inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" style={{ color: "var(--blue)" }} /> AI summary
          {data?.sentiment && <span className="ml-2 capitalize muted-text">· {data.sentiment}</span>}
        </p>
        <button onClick={() => load(true)} disabled={pending} className="btn-ghost text-xs muted-text">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </button>
      </div>

      {pending && !data && <p className="mt-2 text-sm muted-text">Summarising…</p>}
      {error && <p className="mt-2 text-xs" style={{ color: "#b91c1c" }}>{error}</p>}

      {data?.themes && data.themes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {data.themes.map((t, i) => (
            <li key={i} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                {t.example && <p className="mt-0.5 text-xs muted-text">"{t.example}"</p>}
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "var(--white)", border: "1px solid var(--line)" }}
              >
                {t.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data?.flags && data.flags.length > 0 && (
        <div className="mt-3 rounded p-2 text-xs" style={{ background: "#fff3e0", color: "#7a4a00" }}>
          ⚠️ Moderation: {data.flags.join(", ")}
        </div>
      )}
    </div>
  );
}
