"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Slide, ResponseRow, QAConfig } from "@/lib/types";
import { isMissingRpc } from "@/lib/supabase/rpc";
import { EmptyResponseState } from "./EmptyResponseState";

const VOTE_REFRESH_MS = 750;

export const QAStream = memo(function QAStream({ slide, responses }: { slide: Slide; responses: ResponseRow[] }) {
  const cfg = slide.config as QAConfig;
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<Map<string, number>>(() => new Map());

  // Question ids live in a ref so a new question doesn't tear down and
  // re-create the realtime channel (it used to, on every single question).
  const idsRef = useRef<Set<string>>(new Set());
  const idsKey = responses.map((r) => r.id).join(",");
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    idsRef.current = new Set(responses.map((r) => r.id));
    refreshRef.current();
    // idsKey captures the id set; responses identity changes on every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;

    const load = async () => {
      const { data, error } = await supabase.rpc("get_qa_votes", { p_slide_id: slide.id });
      if (cancelled) return;
      if (!error && data) {
        setCounts(new Map((data as { response_id: string; votes: number }[]).map((r) => [r.response_id, r.votes])));
        return;
      }
      if (!isMissingRpc(error)) return;
      // Fallback until migration 0027 is applied.
      const ids = [...idsRef.current];
      if (ids.length === 0) return setCounts(new Map());
      const { data: votes } = await supabase.from("question_votes").select("response_id").in("response_id", ids);
      if (cancelled || !votes) return;
      const next = new Map<string, number>();
      for (const v of votes) next.set(v.response_id, (next.get(v.response_id) ?? 0) + 1);
      setCounts(next);
    };
    // Throttled: at most one refresh per VOTE_REFRESH_MS, trailing edge kept.
    const schedule = () => {
      if (timer) {
        pending = true;
        return;
      }
      void load();
      timer = setTimeout(() => {
        timer = null;
        if (pending) {
          pending = false;
          schedule();
        }
      }, VOTE_REFRESH_MS);
    };
    refreshRef.current = schedule;
    schedule();

    const channel = supabase
      .channel(`qa-votes-${slide.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_votes" },
        (p) => {
          const rid =
            (p.new as { response_id?: string } | null)?.response_id ??
            (p.old as { response_id?: string } | null)?.response_id;
          if (rid && !idsRef.current.has(rid)) return; // a vote on another session
          schedule();
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      refreshRef.current = () => {};
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, slide.id]);

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
});
