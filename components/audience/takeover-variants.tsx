"use client";

import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { MiniConfettiBurst } from "../QuizFeedback";
import { useCountUp } from "@/lib/useCountUp";
import { useStandingsOptional } from "./StandingsContext";

export function QuizCorrectVariant({
  points,
  streak,
}: {
  slideId?: string;
  points?: number;
  streak?: number;
}) {
  // Counts up from 0 once the real points arrive (they can land a beat after
  // the reveal when the host's scoring is still in flight).
  const shown = useCountUp(points ?? 0, { from: 0, duration: 900, delay: 250 });
  return (
    <div className="takeover-content">
      <div className="takeover-icon">
        <span className="takeover-ring" aria-hidden />
        <span className="takeover-ring takeover-ring--late" aria-hidden />
        <MiniConfettiBurst count={24} />
        <CheckCircle className="relative h-20 w-20" strokeWidth={2.4} />
      </div>
      <div className="takeover-title">Correct!</div>
      {points !== undefined ? (
        <div className="takeover-points" aria-label={`Plus ${points} points`}>
          +{shown.toLocaleString()}
          <span className="ml-1 text-base font-semibold opacity-90">pts</span>
        </div>
      ) : (
        <div className="takeover-points" aria-live="polite">
          <span className="text-base font-semibold opacity-90">
            Scoring<span className="loading-dots" aria-hidden />
          </span>
        </div>
      )}
      {streak && streak >= 2 ? (
        <div className="streak-pill" style={{ animationDelay: "0.55s" }}>
          <span className="streak-flame" aria-hidden>🔥</span> {streak} in a row!
        </div>
      ) : null}
      <RankChip />
    </div>
  );
}

export function QuizWrongVariant({ correctText }: { correctText?: string }) {
  return (
    <div className="takeover-content">
      <div className="shake-burst">
        <XCircle className="h-20 w-20" strokeWidth={2.4} />
      </div>
      <div className="takeover-title">Not quite</div>
      {correctText ? <CorrectAnswerLine text={correctText} /> : null}
      <RankChip />
    </div>
  );
}

export function QuizSkippedVariant({ correctText }: { correctText?: string }) {
  return (
    <div className="takeover-content">
      <Clock className="tick-wobble h-20 w-20" strokeWidth={2.4} />
      <div className="takeover-title">Time&apos;s up</div>
      {correctText ? <CorrectAnswerLine text={correctText} /> : null}
      <RankChip />
    </div>
  );
}

function CorrectAnswerLine({ text }: { text: string }) {
  return (
    <div className="answer-line max-w-[18rem] rounded-xl bg-white/15 px-4 py-2 text-center">
      <span className="text-[10px] uppercase tracking-widest opacity-80">Answer</span>
      <p className="text-lg font-semibold leading-snug break-words">{text}</p>
    </div>
  );
}

// Rank after this round. Scoring lands on the server ~0.5–1s after time's up,
// so show a shimmering placeholder until the standings say the round settled.
function RankChip() {
  const s = useStandingsOptional();
  if (!s) return null;
  const standing = s.settled ? s.standing : null;
  if (!standing) {
    return (
      <div className="rank-chip rank-chip--pending" aria-live="polite">
        Ranking<span className="loading-dots" aria-hidden />
      </div>
    );
  }
  const { me, total, ahead } = standing;
  const before = s.baseline?.me.rank;
  const delta = before ? before - me.rank : 0;
  const gap = ahead ? ahead.score - me.score : 0;
  return (
    <div className="flex flex-col items-center gap-1.5" aria-live="polite">
      <div className="rank-chip">
        {me.rank === 1 && total > 1 ? <Crown className="h-5 w-5" aria-hidden /> : null}
        <span className="text-3xl font-extrabold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
          #{me.rank}
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest opacity-90">of {total}</span>
        {delta !== 0 ? (
          <span className="rank-chip-delta" data-dir={delta > 0 ? "up" : "down"}>
            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta)}
          </span>
        ) : null}
      </div>
      <p className="rank-chip-sub text-sm font-medium opacity-95">
        {ahead
          ? gap > 0
            ? `${gap.toLocaleString()} pts behind ${ahead.nickname}`
            : `Tied with ${ahead.nickname}`
          : total > 1
            ? "You're in the lead!"
            : null}
      </p>
    </div>
  );
}

export function SubmittedVariant({
  ordinal, total,
}: { ordinal: number; total: number }) {
  const ordSuffix = ordinalSuffix(ordinal);
  return (
    <div className="takeover-content">
      <div className="text-xs uppercase tracking-widest opacity-90">Submitted</div>
      <div className="big-num-pop text-6xl font-extrabold leading-none">{ordinal}{ordSuffix} in!</div>
      <div className="text-xs uppercase tracking-widest opacity-90">{ordinal} of {total} so far</div>
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
