"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import type { Participant } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { AudienceAppFeedback } from "./AudienceAppFeedback";
import { encouragementFor } from "./QuizFeedback";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["#FFD54F", "#B0BEC5", "#D7864D"];

export function AudienceFinalResults({
  presentationId,
  participantId,
  nickname,
  hasAnyQuiz,
}: {
  presentationId: string;
  participantId: string;
  nickname: string;
  hasAnyQuiz: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[] | null>(null);

  useEffect(() => {
    if (!hasAnyQuiz) return;
    let cancelled = false;
    supabase
      .from("participants")
      .select("*")
      .eq("presentation_id", presentationId)
      .order("score", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setParticipants((data as Participant[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, presentationId, hasAnyQuiz]);

  if (!hasAnyQuiz) {
    return <PlainEnd nickname={nickname} />;
  }

  if (participants === null) {
    return (
      <Stage>
        <p className="muted-text text-sm">Tallying scores…</p>
      </Stage>
    );
  }

  if (participants.length === 0) {
    return <PlainEnd nickname={nickname} />;
  }

  return (
    <FinalResultsBody
      presentationId={presentationId}
      participantId={participantId}
      nickname={nickname}
      participants={participants}
    />
  );
}

function FinalResultsBody({
  participantId,
  nickname,
  participants,
}: {
  presentationId: string;
  participantId: string;
  nickname: string;
  participants: Participant[];
}) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const myIdx = sorted.findIndex((p) => p.id === participantId);
  const me = myIdx >= 0 ? sorted[myIdx] : null;
  const top3 = sorted.slice(0, 3);
  const total = sorted.length;
  const rank = myIdx >= 0 ? myIdx + 1 : null;

  // Reveal sequence: rank 3 → 2 → 1 (200ms → 1100ms → 2000ms), confetti on 1.
  const [revealed, setRevealed] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (top3.length === 0) return;
    if (reduced) {
      setRevealed(3);
      return;
    }
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeouts.push(setTimeout(() => setRevealed(1), 200));
    timeouts.push(setTimeout(() => setRevealed(2), 1100));
    timeouts.push(
      setTimeout(() => {
        setRevealed(3);
        confetti({ particleCount: 120, spread: 60, origin: { y: 0.4 } });
      }, 2000),
    );
    return () => timeouts.forEach(clearTimeout);
  }, [top3.length, reduced]);

  const isTop3 = rank !== null && rank <= 3;
  const pct = total > 0 ? (rank ?? total) / total : 1;
  const headline = me ? encouragementFor(pct, rank ?? total) : "Thanks for playing.";

  return (
    <Stage>
      <div className="flex flex-col items-center text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] muted-text">Session complete</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Nice run, {nickname}.</h2>

        {/* Personal tile */}
        <div className="anim-pop mt-6 flex flex-col items-center">
          {isTop3 ? (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-5xl"
              style={{ background: MEDAL_BG[(rank ?? 1) - 1] }}
              aria-label={`Rank ${rank}`}
            >
              {MEDAL[(rank ?? 1) - 1]}
            </div>
          ) : (
            <div
              className="flex h-24 w-24 flex-col items-center justify-center rounded-full"
              style={{ background: "rgba(0,113,227,0.10)", border: "1px solid rgba(0,113,227,0.3)" }}
              aria-label={`Rank ${rank} of ${total}`}
            >
              <span className="text-[10px] uppercase tracking-[0.18em] muted-text">Rank</span>
              <span className="text-3xl font-bold leading-none" style={{ color: "var(--blue)" }}>
                #{rank ?? "—"}
              </span>
              <span className="mt-0.5 text-[10px] muted-text">of {total}</span>
            </div>
          )}
          {me ? (
            <p className="mt-4 text-4xl font-bold tracking-tight" style={{ color: "var(--blue)" }}>
              <span className="count-bump inline-block">{me.score.toLocaleString()}</span>
            </p>
          ) : null}
          {me ? <p className="mt-1 text-xs muted-text uppercase tracking-[0.18em]">Final score</p> : null}
        </div>

        <p className="mt-5 text-sm font-medium">{headline}</p>
      </div>

      {/* Mini top-3 podium — vertical stacked rows, mobile-friendly. */}
      <div className="mt-8">
        <p className="text-[10px] uppercase tracking-[0.2em] muted-text">
          <Trophy className="-mt-0.5 mr-1.5 inline-block h-3 w-3" />
          Final podium
        </p>
        <ol className="mt-3 space-y-2">
          {/* Render in reveal order: rank 3 first, then 2, then 1 — but visually
              we want rank 1 on top. So we render top→bottom (1, 2, 3) and gate
              each on the reveal step. */}
          {top3.map((p, i) => {
            const r = i + 1;
            const visible = revealed >= 4 - r; // r=3 visible at revealed>=1, r=2 at >=2, r=1 at >=3
            const isMe = p.id === participantId;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-400"
                style={{
                  background: isMe ? "rgba(0,113,227,0.10)" : "rgba(0,0,0,0.03)",
                  border: "1px solid " + (isMe ? "rgba(0,113,227,0.4)" : "var(--line)"),
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{ background: MEDAL_BG[r - 1] }}
                  aria-hidden
                >
                  {MEDAL[r - 1]}
                </span>
                <span className="flex-1 truncate text-base font-medium">
                  {p.nickname}
                  {isMe ? <span className="ml-1.5 text-[10px] muted-text">(you)</span> : null}
                </span>
                <span className="mono tabular-nums text-sm muted-text">{p.score.toLocaleString()}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8">
        <AudienceAppFeedback />
      </div>
    </Stage>
  );
}

function PlainEnd({ nickname }: { nickname: string }) {
  return (
    <Stage>
      <h2 className="text-2xl font-semibold">Session ended</h2>
      <p className="mt-2 text-slate-500">Thanks for playing, {nickname}!</p>
      <AudienceAppFeedback />
    </Stage>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blue)" }}>
        Klikr
      </h1>
      <div className="panel p-6">{children}</div>
    </main>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
