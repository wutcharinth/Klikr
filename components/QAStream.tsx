"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Slide, ResponseRow, QAConfig } from "@/lib/types";
import { EmptyResponseState } from "./EmptyResponseState";

type Vote = { response_id: string; participant_id: string };

export function QAStream({ slide, responses }: { slide: Slide; responses: ResponseRow[] }) {
  const cfg = slide.config as QAConfig;
  const supabase = useMemo(() => createClient(), []);
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("question_votes")
        .select("response_id, participant_id")
        .in("response_id", responses.map((r) => r.id));
      if (!cancelled && data) setVotes(data as Vote[]);
    };
    load();
    const channel = supabase
      .channel(`qa-votes-${slide.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_votes" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, slide.id, responses]);

  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.response_id, (counts.get(v.response_id) ?? 0) + 1);

  // On stage: only show approved questions, with pinned floating to top.
  const visible = responses.filter((q) => (q.status ?? "approved") === "approved");
  const sorted = [...visible].sort((a, b) => {
    if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    const va = counts.get(a.id) ?? 0;
    const vb = counts.get(b.id) ?? 0;
    if (vb !== va) return vb - va;
    return a.created_at < b.created_at ? -1 : 1;
  });

  if (sorted.length === 0) {
    return (
      <EmptyResponseState
        title="Audience questions will appear here"
        body="The most upvoted question floats to the top so you always know what to answer next."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {sorted.map((q, i) => {
        const v = counts.get(q.id) ?? 0;
        const top = (q.pinned ?? false) || (i === 0 && v > 0);
        const answered = q.status === "answered";
        return (
          <li
            key={q.id}
            className="flex items-start gap-3 rounded-xl p-4 transition-all"
            style={{
              border: "1px solid " + (top ? "rgba(0,113,227,0.4)" : "var(--line)"),
              background: top ? "rgba(0,113,227,0.06)" : "rgba(255,255,255,0.02)",
              opacity: answered ? 0.6 : 1,
            }}
          >
            <div className="flex-1 text-base leading-snug">
              {q.pinned && <span className="mr-2 text-xs" style={{ color: "var(--blue)" }}>📌</span>}
              {answered && <span className="mr-2 text-xs" style={{ color: "var(--blue)" }}>✓</span>}
              {q.value_text}
            </div>
            {(cfg.upvotes ?? true) && (
              <div
                className="flex flex-col items-center justify-center rounded-lg px-3 py-1 text-xs"
                style={{
                  border: "1px solid var(--line)",
                  background: "rgba(255,255,255,0.04)",
                  minWidth: 48,
                }}
              >
                <span style={{ fontSize: 14 }}>▲</span>
                <span className="mono font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
