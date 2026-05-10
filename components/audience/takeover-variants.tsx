"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";
import { MiniConfettiBurst } from "../QuizFeedback";

export function QuizCorrectVariant({
  points, rankNow, rankBefore, total,
}: { points: number; rankNow: number; rankBefore: number; total: number }) {
  const delta = rankBefore - rankNow; // positive = climbed
  return (
    <div className="takeover-content">
      <div className="relative">
        <MiniConfettiBurst />
        <CheckCircle className="h-20 w-20" strokeWidth={2.4} />
      </div>
      <div className="text-xs uppercase tracking-widest opacity-90">+{points} pts</div>
      <div className="big-num-pop text-7xl font-extrabold leading-none">#{rankNow}</div>
      <div className="text-xs uppercase tracking-widest opacity-90">
        {delta > 0 ? `↑ from #${rankBefore}` : delta < 0 ? `↓ from #${rankBefore}` : `held #${rankNow}`} · of {total}
      </div>
    </div>
  );
}

export function QuizWrongVariant({
  rankNow, total,
}: { rankNow: number; total: number }) {
  return (
    <div className="takeover-content shake-burst">
      <XCircle className="h-20 w-20" strokeWidth={2.4} />
      <div className="text-2xl font-bold">Not quite</div>
      <div className="big-num-pop text-7xl font-extrabold leading-none">#{rankNow}</div>
      <div className="text-xs uppercase tracking-widest opacity-90">of {total}</div>
    </div>
  );
}

export function QuizSkippedVariant({
  rankNow, total,
}: { rankNow: number; total: number }) {
  return (
    <div className="takeover-content">
      <Clock className="h-20 w-20" strokeWidth={2.4} />
      <div className="text-2xl font-bold">Time&apos;s up</div>
      <div className="big-num-pop text-7xl font-extrabold leading-none">#{rankNow}</div>
      <div className="text-xs uppercase tracking-widest opacity-90">of {total}</div>
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
      <div className="text-xs uppercase tracking-widest opacity-90">{total} of {total} so far</div>
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
