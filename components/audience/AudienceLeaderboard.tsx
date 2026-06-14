"use client";

import { useEffect, useRef, useState } from "react";
import type { Participant } from "@/lib/types";
import { getParticipantScores } from "@/app/play/[code]/actions";
import { LeaderboardRows, annotateRanks, type LbRow } from "../LeaderboardRows";

const TOP_N = 5;
// How long to hold the "calculating scores…" beat before showing the board
// anyway, if the scored_rev confirmation never arrives (e.g. migration 0026 not
// applied). Tuned to sit just under the reveal/takeover (~1.8s) so the board is
// ready as the takeover lifts — seamless — while still giving the host's score
// write (~0.5–1s after time's up) time to land. With the signal it's instant.
const STAGING_MS = 1500;

type AnnotatedRow = Participant & { rank: number; delta: number; hadPrev: boolean };

export function AudienceLeaderboard({
  presentationId,
  participantId,
  participantToken,
  scoredRev,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
  // Bumped by the host (via the presentations row) whenever a quiz slide is
  // scored. Used as a refetch trigger so the board reflects the new totals the
  // instant scoring lands, instead of waiting up to POLL_MS for the next poll.
  scoredRev: number;
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
    // The board only mounts once this round is scored (see StagedLeaderboard),
    // so the mount fetch already reflects the new totals. The short burst is
    // just resilience for clock skew (board revealed a beat before scoring
    // landed); after that the scores are final until the next slide, so we
    // stop — no idle polling. scored_rev re-runs this effect if the realtime
    // signal arrives later.
    const burst = [400, 1000, 2000].map((d) => setTimeout(fetchAll, d));
    return () => {
      cancelled = true;
      burst.forEach(clearTimeout);
    };
  }, [presentationId, participantId, participantToken, scoredRev]);

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

// Staging gate: don't show the scoreboard until THIS round has actually been
// scored, so it never flashes the previous round's totals. "Scored" = the
// scored_rev signal bumped past its value when the reveal began (migration
// 0026 → instant), or STAGING_MS elapsed as the migration-free fallback. This
// is the deliberate "calculating scores…" beat between the answer reveal and
// the scoreboard, mirroring Kahoot.
export function StagedLeaderboard({
  presentationId,
  participantId,
  participantToken,
  scoredRev,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
  scoredRev: number;
}) {
  const baselineRev = useRef(scoredRev);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (scoredRev > baselineRev.current) {
      setReady(true);
      return;
    }
    const t = setTimeout(() => setReady(true), STAGING_MS);
    return () => clearTimeout(t);
  }, [scoredRev]);

  if (!ready) {
    return (
      <div className="anim-fade-up flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2"
          style={{ borderColor: "var(--line)", borderTopColor: "var(--blue)" }}
          aria-hidden
        />
        <p className="text-sm font-medium muted-text">Calculating scores…</p>
      </div>
    );
  }
  return (
    <AudienceLeaderboard
      presentationId={presentationId}
      participantId={participantId}
      participantToken={participantToken}
      scoredRev={scoredRev}
    />
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
