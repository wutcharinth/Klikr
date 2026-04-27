"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { Participant } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// Big animated badge — green tick + ring on correct, red X + shake on wrong,
// neutral hourglass when they didn't answer in time.
export function RevealMedal({
  correct,
  skipped,
  confetti = false,
}: {
  correct: boolean;
  skipped: boolean;
  confetti?: boolean;
}) {
  const color = skipped ? "#94a3b8" : correct ? "#22c55e" : "#ef4444";
  const Icon = skipped ? CheckCircle : correct ? CheckCircle : XCircle;
  const label = skipped ? "Time's up" : correct ? "Correct!" : "Not quite";
  const tagline = skipped
    ? "No answer in time — catch the next one."
    : correct
      ? "🔥 Nailed it. Points heading your way."
      : "🤝 Tough one. Bring it on next round.";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: `${color}33`,
            animation: correct ? "rippleOut 1.4s ease-out infinite" : undefined,
          }}
        />
        <div
          className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white ${
            correct ? "anim-pop" : !skipped ? "shake-once" : "anim-fade-up"
          }`}
          style={{ background: color }}
        >
          <Icon className="h-14 w-14" strokeWidth={2.4} />
          {confetti && correct ? <MiniConfettiBurst /> : null}
        </div>
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-sm muted-text">{tagline}</p>
    </div>
  );
}

// Pure-CSS confetti burst — 18 particles fly outward via CSS variables. Mounts
// once and animates to completion (parent should remount via React key if
// repeating). Contained to its position:relative parent.
export function MiniConfettiBurst({ count = 18 }: { count?: number }) {
  const particles = useMemo(() => {
    const palette = ["#22c55e", "#0071e3", "#facc15", "#ef4444", "#a855f7", "#fb923c"];
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 60 + Math.random() * 40;
      return {
        id: i,
        bx: `${Math.cos(angle) * dist}px`,
        by: `${Math.sin(angle) * dist}px`,
        color: palette[i % palette.length],
        delay: Math.random() * 0.08,
        size: 6 + Math.random() * 6,
      };
    });
  }, [count]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p) => (
        <span
          key={p.id}
          className="burst-particle"
          style={
            {
              "--bx": p.bx,
              "--by": p.by,
              background: p.color,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function ScoreCard({
  presentationId,
  participantId,
  correct,
}: {
  presentationId: string;
  participantId: string;
  slideId?: string;
  correct?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const prevScore = useRef<number | null>(null);
  const prevRank = useRef<number | null>(null);
  const [scoreBumpKey, setScoreBumpKey] = useState(0);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  const [rankDelta, setRankDelta] = useState<{ value: number; key: number } | null>(null);
  const [showBurst, setShowBurst] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = () =>
      supabase
        .from("participants")
        .select("*")
        .eq("presentation_id", presentationId)
        .order("score", { ascending: false })
        .then(({ data }) => {
          if (!cancelled && data) setParticipants(data as Participant[]);
        });
    fetchAll();
    const channel = supabase
      .channel(`audience-pts-${presentationId}-${participantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `presentation_id=eq.${presentationId}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, presentationId, participantId]);

  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const myIdx = sorted.findIndex((p) => p.id === participantId);
  const me = myIdx >= 0 ? sorted[myIdx] : null;
  const ahead = myIdx > 0 ? sorted[myIdx - 1] : null;
  const behind = myIdx >= 0 && myIdx < sorted.length - 1 ? sorted[myIdx + 1] : null;
  const total = sorted.length;
  const rank = myIdx >= 0 ? myIdx + 1 : null;

  // Bump animation + delta float when our score actually changes (host advancing
  // slide triggers scoring on the server).
  useEffect(() => {
    if (!me) return;
    if (prevScore.current !== null && prevScore.current !== me.score) {
      setScoreBumpKey((k) => k + 1);
      const d = me.score - prevScore.current;
      if (d > 0) {
        const key = Date.now();
        setDelta({ value: d, key });
        if (correct) setShowBurst(key);
      }
    }
    prevScore.current = me.score;
  }, [me, correct]);

  // Rank-change pill.
  useEffect(() => {
    if (rank === null) return;
    if (prevRank.current !== null && prevRank.current !== rank) {
      const change = prevRank.current - rank; // positive = improved
      if (change !== 0) setRankDelta({ value: change, key: Date.now() });
    }
    prevRank.current = rank;
  }, [rank]);

  // Auto-clear delta + rank pill so they don't linger.
  useEffect(() => {
    if (!delta) return;
    const t = setTimeout(() => setDelta(null), 1200);
    return () => clearTimeout(t);
  }, [delta]);
  useEffect(() => {
    if (!rankDelta) return;
    const t = setTimeout(() => setRankDelta(null), 3000);
    return () => clearTimeout(t);
  }, [rankDelta]);

  if (!me) return null;

  const pct = total > 0 ? (rank ?? total) / total : 1;
  const encouragement = encouragementFor(pct, rank ?? total);

  return (
    <div
      className="relative w-full max-w-sm overflow-visible rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-800"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] muted-text">Your score</p>
      <div className="relative mt-1 inline-block">
        <p className="text-4xl font-bold tracking-tight" style={{ color: "var(--blue)" }}>
          <span key={scoreBumpKey} className="count-bump inline-block">
            {me.score.toLocaleString()}
          </span>
        </p>
        {delta ? (
          <span
            key={delta.key}
            className="points-float pointer-events-none absolute left-1/2 -top-1 text-base font-bold"
            style={{ color: "#22c55e", transform: "translate(-50%, 0)" }}
          >
            +{delta.value.toLocaleString()} pts
          </span>
        ) : null}
        {showBurst && correct ? (
          <span key={`burst-${showBurst}`} className="pointer-events-none absolute inset-0">
            <MiniConfettiBurst count={14} />
          </span>
        ) : null}
      </div>
      {rank !== null && (
        <p className="mt-2 flex items-center justify-center gap-2 text-base">
          <span>
            Rank <span className="font-semibold">#{rank}</span>{" "}
            <span className="muted-text">of {total}</span>
          </span>
          {rankDelta ? (
            <span
              key={rankDelta.key}
              className="rank-delta-pill mono inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: rankDelta.value > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: rankDelta.value > 0 ? "#16a34a" : "#dc2626",
              }}
            >
              {rankDelta.value > 0 ? "↑" : "↓"} {Math.abs(rankDelta.value)}
            </span>
          ) : null}
        </p>
      )}

      <div className="mt-4 space-y-2 text-sm">
        {ahead ? (
          <p className="muted-text">
            <span className="font-medium" style={{ color: "var(--ink, var(--fg))" }}>
              {ahead.nickname}
            </span>{" "}
            is {ahead.score - me.score} pts ahead
          </p>
        ) : (
          <p className="font-medium" style={{ color: "#22c55e" }}>
            👑 You're in the lead!
          </p>
        )}
        {behind && (
          <p className="muted-text">
            <span className="font-medium" style={{ color: "var(--ink, var(--fg))" }}>
              {behind.nickname}
            </span>{" "}
            is {me.score - behind.score} pts behind
          </p>
        )}
      </div>

      <p className="mt-5 text-sm font-medium">{encouragement}</p>
    </div>
  );
}

export function encouragementFor(pct: number, rank: number): string {
  if (rank === 1) return "🏆 Top of the leaderboard. Don't let go.";
  if (pct <= 0.1) return "🔥 Top 10% — you're on fire.";
  if (pct <= 0.25) return "💪 Top quarter. Keep climbing.";
  if (pct <= 0.5) return "👍 Solid run. Few more to break the top half.";
  if (pct <= 0.75) return "🚀 Plenty of room to move up. Lock in the next one.";
  return "🌱 Every round is a fresh shot. You've got this.";
}
