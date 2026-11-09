"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";

// Medal accents for the top-3 — matches QuizPodium's COLORS so the in-game
// board and the final podium read as one design family.
const MEDALS = ["#FFD54F", "#B0BEC5", "#D7864D"];

export type LbRow = {
  id: string;
  nickname: string;
  score: number;
  rank: number;
  delta: number; // positive = climbed
  hadPrev: boolean;
  visualIndex: number; // position slot the row animates to
  /** Row just entered the board this round (slides/fades in). */
  entering?: boolean;
};

type Variant = "audience" | "presenter";

type Sizing = {
  rowH: number;
  gap: number;
  rankW: number;
  scoreW: number;
  pad: string;
  nameClass: string;
  scoreClass: string;
  rankClass: string;
  deltaIcon: string;
};

const SIZING: Record<Variant, Sizing> = {
  audience: {
    rowH: 56, gap: 8, rankW: 28, scoreW: 56, pad: "px-3",
    nameClass: "text-sm font-medium",
    scoreClass: "mono text-sm tabular-nums",
    rankClass: "mono text-sm muted-text",
    deltaIcon: "h-3 w-3",
  },
  presenter: {
    rowH: 76, gap: 10, rankW: 56, scoreW: 120, pad: "px-5",
    nameClass: "text-2xl font-semibold",
    scoreClass: "mono text-3xl font-bold tabular-nums",
    rankClass: "mono text-lg font-bold",
    deltaIcon: "h-5 w-5",
  },
};

export function LeaderboardRows({
  rows,
  variant,
  meId,
  podium = false,
}: {
  rows: LbRow[];
  variant: Variant;
  meId?: string;
  podium?: boolean;
}) {
  const cfg = SIZING[variant];
  const maxIdx = rows.reduce((m, r) => Math.max(m, r.visualIndex), 0);
  return (
    <div className="relative" style={{ height: rows.length ? (maxIdx + 1) * cfg.rowH : 0 }}>
      {rows.map((row) => (
        <LbRowView key={row.id} row={row} cfg={cfg} isMe={row.id === meId} podium={podium} />
      ))}
    </div>
  );
}

const LbRowView = memo(function LbRowView({
  row,
  cfg,
  isMe,
  podium,
}: {
  row: LbRow;
  cfg: Sizing;
  isMe: boolean;
  podium: boolean;
}) {
  const medal = podium && row.rank <= 3 ? MEDALS[row.rank - 1] : null;
  const radius = cfg.rowH >= 72 ? 16 : 12;
  const shownScore = useCountUp(row.score, { duration: 1100 });
  return (
    <div
      className={`absolute left-0 right-0 flex items-center gap-3 ${cfg.pad} ${row.entering ? "lb-row-enter" : ""} ${
        row.delta > 0 && row.hadPrev ? "lb-row-climb" : ""
      }`}
      style={{
        height: cfg.rowH - cfg.gap,
        top: cfg.gap / 2,
        borderRadius: radius,
        transform: `translateY(${row.visualIndex * cfg.rowH}px)`,
        transition: "transform 700ms cubic-bezier(0.34, 1.4, 0.64, 1), border-color 400ms ease, background 400ms ease",
        zIndex: row.delta > 0 ? 2 : 1,
        background: medal
          ? `${medal}22`
          : isMe
            ? "rgba(0,113,227,0.12)"
            : "var(--lb-row-bg, rgba(127,127,127,0.06))",
        border: "1px solid var(--line)",
        borderColor: medal ? `${medal}88` : isMe ? "rgba(0,113,227,0.45)" : "var(--line)",
      }}
    >
      <span
        className={cfg.rankClass}
        style={{
          width: cfg.rankW,
          flex: "none",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          ...(medal
            ? {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: cfg.rankW,
                borderRadius: 999,
                background: medal,
                color: "#1d1d1f",
              }
            : { color: "var(--neutral)" }),
        }}
      >
        {row.rank}
      </span>
      <span className={`min-w-0 flex-1 truncate ${cfg.nameClass}`}>
        {row.nickname}
        {isMe ? <span className="ml-1 text-xs muted-text">(you)</span> : null}
      </span>
      {row.hadPrev && row.delta !== 0 ? (
        <span
          key={`d${row.delta}`}
          className="rank-delta-pill inline-flex items-center gap-1 rounded-full px-1.5 text-xs font-semibold"
          style={{
            background: row.delta > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: row.delta > 0 ? "#16a34a" : "#dc2626",
          }}
        >
          {row.delta > 0 ? <TrendingUp className={cfg.deltaIcon} /> : <TrendingDown className={cfg.deltaIcon} />}
          {Math.abs(row.delta)}
        </span>
      ) : row.hadPrev ? (
        <span className="muted-text">
          <Minus className={cfg.deltaIcon} />
        </span>
      ) : null}
      <span
        className={cfg.scoreClass}
        style={{ minWidth: cfg.scoreW, textAlign: "right", color: medal ? "var(--ink)" : undefined }}
      >
        {shownScore.toLocaleString()}
      </span>
    </div>
  );
});

type RankedLike = { id: string; nickname: string; score: number; rank: number };

/**
 * Two-beat leaderboard reveal: first paint every row where it stood BEFORE
 * this round (previous rank + previous score), then after `delayMs` move to
 * the new standings — rows spring to their new slots, scores count up, and
 * climb/drop badges pop in. Rows new to the board slide in from below.
 * `prev` null/empty → no staging, just show the current board.
 */
export function useStagedRows(
  next: RankedLike[],
  prev: RankedLike[] | null | undefined,
  delayMs = 650,
): LbRow[] {
  const prevMap = useMemo(() => new Map((prev ?? []).map((r) => [r.id, r])), [prev]);
  const canStage = prevMap.size > 0;
  // Stage once per mount. Later updates (a late score landing) just animate
  // from wherever the rows are — never snap back to the old standings.
  const [settled, setSettled] = useState(!canStage);
  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => setSettled(true), delayMs);
    return () => clearTimeout(t);
  }, [settled, delayMs]);

  return useMemo(() => {
    if (settled) {
      return next.map((r) => {
        const p = prevMap.get(r.id);
        return {
          ...r,
          visualIndex: r.rank - 1,
          delta: p ? p.rank - r.rank : 0,
          hadPrev: !!p,
          entering: canStage && !p,
        };
      });
    }
    // Beat 1: previous standings. Newcomers wait just below the board.
    let below = next.length;
    return next.map((r) => {
      const p = prevMap.get(r.id);
      return {
        ...r,
        score: p ? p.score : r.score,
        rank: p ? p.rank : r.rank,
        visualIndex: p ? Math.min(p.rank - 1, next.length) : below++,
        delta: 0,
        hadPrev: false,
        entering: !p,
      };
    });
  }, [settled, next, prevMap, canStage]);
}

// Shared helper: sort participants, assign ranks, and annotate deltas against a
// previous-rank snapshot (mutated by the caller's ref). Keeps the rank/delta
// logic in one place for both the audience and presenter boards.
export function annotateRanks<T extends { id: string; score: number; created_at: string }>(
  data: T[],
  prevRank: Record<string, number>,
): Array<T & { rank: number; delta: number; hadPrev: boolean }> {
  const sorted = sortByScore(data);
  const newRank: Record<string, number> = {};
  sorted.forEach((p, i) => {
    newRank[p.id] = i + 1;
  });
  const annotated = sorted.map((p) => {
    const prev = prevRank[p.id];
    return {
      ...p,
      rank: newRank[p.id],
      delta: prev !== undefined ? prev - newRank[p.id] : 0,
      hadPrev: prev !== undefined,
    };
  });
  // Mutate the caller's snapshot in place so the next call diffs against this one.
  Object.keys(prevRank).forEach((k) => delete prevRank[k]);
  Object.assign(prevRank, newRank);
  return annotated;
}

/** Score desc, then join time asc, then id — same order as get_standing. */
export function sortByScore<T extends { id: string; score: number; created_at: string }>(data: T[]): T[] {
  return [...data].sort(
    (a, b) =>
      b.score - a.score ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
