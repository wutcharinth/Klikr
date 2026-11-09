"use client";

import { LeaderboardRows, useStagedRows } from "../LeaderboardRows";
import { useCountUp } from "@/lib/useCountUp";
import type { Standing } from "@/lib/types";
import { useStandings } from "./StandingsContext";

const TOP_N = 5;

// Post-question board on the phone. Waits for this round's scores to land
// (StandingsContext.settled — instant via the scored_rev signal, with a
// fallback timeout), then reveals in two beats: previous standings first,
// then rows spring to their new places while scores count up.
export function StagedLeaderboard() {
  const { standing, baseline, settled } = useStandings();
  if (!settled || !standing) {
    return (
      <div className="anim-fade-up flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="calc-orbit" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="text-sm font-medium muted-text">
          Calculating scores<span className="loading-dots" aria-hidden />
        </p>
      </div>
    );
  }
  return <AudienceBoard standing={standing} baseline={baseline} />;
}

function AudienceBoard({ standing, baseline }: { standing: Standing; baseline: Standing | null }) {
  const { me, total, ahead } = standing;
  const top = standing.top.slice(0, TOP_N);
  const prevTop = baseline && baseline.scoredRev < standing.scoredRev ? baseline.top.slice(0, TOP_N + 3) : null;
  const rows = useStagedRows(top, prevTop);
  const meInTop = top.some((r) => r.id === me.id);

  return (
    <div className="anim-fade-up space-y-4 py-2">
      <YouCard
        nickname={me.nickname}
        score={me.score}
        fromScore={baseline?.me.score ?? me.score}
        rank={me.rank}
        total={total}
        ahead={ahead}
      />

      <div>
        <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] muted-text">
          Top {Math.min(TOP_N, total)}
        </p>
        <LeaderboardRows rows={rows} variant="audience" meId={me.id} podium />
      </div>

      {!meInTop ? (
        <div>
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] muted-text">You</p>
          <LeaderboardRows
            rows={[
              {
                id: me.id,
                nickname: me.nickname,
                score: me.score,
                rank: me.rank,
                visualIndex: 0,
                delta: baseline ? baseline.me.rank - me.rank : 0,
                hadPrev: !!baseline,
              },
            ]}
            variant="audience"
            meId={me.id}
          />
        </div>
      ) : null}
    </div>
  );
}

function YouCard({
  nickname,
  score,
  fromScore,
  rank,
  total,
  ahead,
}: {
  nickname: string;
  score: number;
  fromScore: number;
  rank: number;
  total: number;
  ahead: Standing["ahead"];
}) {
  const shown = useCountUp(score, { from: fromScore, duration: 1100, delay: 350 });
  const gap = ahead ? ahead.score - score : 0;
  return (
    <div className="you-card rounded-2xl p-5 text-center text-white">
      <p className="text-[10px] uppercase tracking-[0.18em] opacity-90">{nickname}</p>
      <p className="mt-1 text-4xl font-bold tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
        {shown.toLocaleString()}
      </p>
      <p className="mt-1 text-xs opacity-90">
        Rank #{rank} of {total}
      </p>
      {total > 1 ? (
        <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
          {ahead
            ? gap > 0
              ? `${gap.toLocaleString()} pts to catch ${ahead.nickname}`
              : `Tied with ${ahead.nickname}`
            : "👑 You're in the lead"}
        </p>
      ) : null}
    </div>
  );
}
