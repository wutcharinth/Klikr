"use client";

import { useEffect, useRef, useState } from "react";
import type { Participant } from "@/lib/types";
import { getParticipantScores } from "@/app/play/[code]/actions";
import { LeaderboardRows, annotateRanks, type LbRow } from "../LeaderboardRows";

const TOP_N = 5;
const POLL_MS = 1500;

type AnnotatedRow = Participant & { rank: number; delta: number; hadPrev: boolean };

export function AudienceLeaderboard({
  presentationId,
  participantId,
  participantToken,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
}) {
  const [rows, setRows] = useState<AnnotatedRow[]>([]);
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
      setRows(annotateRanks(data, prevRankRef.current));
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
  const top: LbRow[] = rows.slice(0, TOP_N).map((r) => ({ ...r, visualIndex: r.rank - 1 }));
  const meOutsideTop = me && me.rank > TOP_N;

  return (
    <div className="anim-fade-up space-y-4 py-2">
      {me ? <YouCard nickname={me.nickname} score={me.score} rank={me.rank} total={total} /> : null}

      <div>
        <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] muted-text">
          Top {Math.min(TOP_N, total)}
        </p>
        <LeaderboardRows rows={top} variant="audience" meId={participantId} />
      </div>

      {meOutsideTop && me ? (
        <div>
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] muted-text">You</p>
          <LeaderboardRows rows={[{ ...me, visualIndex: 0 }]} variant="audience" meId={participantId} />
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
