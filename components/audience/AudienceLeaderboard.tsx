"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Participant } from "@/lib/types";
import { getParticipantScores } from "@/app/play/[code]/actions";

const ROW_HEIGHT = 56;
const TOP_N = 5;
const POLL_MS = 1500;

type Row = Participant & { rank: number; delta: number; hadPrev: boolean };

export function AudienceLeaderboard({
  presentationId,
  participantId,
  participantToken,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
}) {
  // Compute the annotated row list inside the polling effect so we never have
  // to read a ref during render — the previous rank snapshot is captured in
  // a ref but only mutated and consumed inside the effect.
  const [rows, setRows] = useState<Row[]>([]);
  const prevRankRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      let data: Participant[];
      try {
        data = await getParticipantScores({ presentationId, participantId, participantToken });
      } catch {
        return; // keep last known list rather than blanking
      }
      if (cancelled) return;
      const sorted = [...data].sort(
        (a, b) =>
          b.score - a.score ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const newRank: Record<string, number> = {};
      sorted.forEach((p, i) => {
        newRank[p.id] = i + 1;
      });
      const annotated: Row[] = sorted.map((p) => {
        const prev = prevRankRef.current[p.id];
        return {
          ...p,
          rank: newRank[p.id],
          delta: prev !== undefined ? prev - newRank[p.id] : 0,
          hadPrev: prev !== undefined,
        };
      });
      prevRankRef.current = newRank;
      setRows(annotated);
    };
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [presentationId, participantId, participantToken]);

  const me = rows.find((r) => r.id === participantId) ?? null;
  const total = rows.length;
  const top = rows.slice(0, TOP_N);
  const meOutsideTop = me && me.rank > TOP_N;

  return (
    <div className="anim-fade-up space-y-4 py-2">
      {me ? <YouCard nickname={me.nickname} score={me.score} rank={me.rank} total={total} /> : null}

      <div>
        <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] muted-text">
          Top {Math.min(TOP_N, total)}
        </p>
        <div className="relative" style={{ height: top.length * ROW_HEIGHT }}>
          {top.map((row) => (
            <RowView
              key={row.id}
              row={row}
              isMe={row.id === participantId}
              indexOverride={undefined}
            />
          ))}
        </div>
      </div>

      {meOutsideTop && me ? (
        <div>
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] muted-text">You</p>
          <div className="relative" style={{ height: ROW_HEIGHT }}>
            <RowView row={me} isMe indexOverride={0} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function YouCard({
  nickname,
  score,
  rank,
  total,
}: {
  nickname: string;
  score: number;
  rank: number;
  total: number;
}) {
  return (
    <div
      className="rounded-2xl p-5 text-center text-white"
      style={{ background: "linear-gradient(135deg, var(--blue), #00C2FF)" }}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] opacity-90">{nickname}</p>
      <p key={score} className="count-bump mt-1 text-4xl font-bold tracking-tight">
        {score.toLocaleString()}
      </p>
      <p className="mt-1 text-xs opacity-90">
        Rank #{rank} of {total}
      </p>
    </div>
  );
}

function RowView({
  row,
  isMe,
  indexOverride,
}: {
  row: Row;
  isMe: boolean;
  indexOverride: number | undefined;
}) {
  const visualIndex = indexOverride ?? row.rank - 1;
  return (
    <div
      className="absolute left-0 right-0 flex items-center gap-3 rounded-xl px-3"
      style={{
        height: ROW_HEIGHT - 8,
        top: 4,
        transform: `translateY(${visualIndex * ROW_HEIGHT}px)`,
        transition: "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        background: isMe ? "rgba(0,113,227,0.12)" : "rgba(255,255,255,0.03)",
        border: "1px solid var(--line)",
        borderColor: isMe ? "rgba(0,113,227,0.45)" : "var(--line)",
      }}
    >
      <span
        className="mono text-sm muted-text"
        style={{ width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
      >
        #{row.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {row.nickname}
        {isMe ? <span className="ml-1 text-xs muted-text">(you)</span> : null}
      </span>
      {row.hadPrev && row.delta !== 0 ? (
        <span
          className="rank-delta-pill inline-flex items-center gap-1 rounded-full px-1.5 text-xs font-semibold"
          style={{
            background: row.delta > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: row.delta > 0 ? "#16a34a" : "#dc2626",
          }}
        >
          {row.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(row.delta)}
        </span>
      ) : row.hadPrev ? (
        <span className="muted-text">
          <Minus className="h-3 w-3" />
        </span>
      ) : null}
      <span
        key={row.score}
        className="count-bump mono text-sm tabular-nums"
        style={{ minWidth: 56, textAlign: "right" }}
      >
        {row.score.toLocaleString()}
      </span>
    </div>
  );
}
