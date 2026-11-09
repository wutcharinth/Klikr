"use client";

import { useEffect, useState } from "react";
import { Check, Zap } from "lucide-react";
import type { Slide } from "@/lib/types";
import { QUIZ_TILES, tileFor, tileGradient } from "@/lib/quizTiles";
import { TimeBar, TimeLeftPill, useElapsed } from "./QuizTimers";
import { useSecondsLeft } from "@/lib/useQuizPhase";
import { StagedLeaderboard } from "./audience/AudienceLeaderboard";
import { useQuizRound } from "./audience/useQuizRound";

// Game-show quiz on the player's phone: get-ready intro → big shape tiles →
// "locked in" → reveal takeover (TakeoverLayer) → staged leaderboard.
export function KahootAudienceView({
  slide,
  participantId,
  participantToken,
  presentationId,
  startedAt,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
  presentationId: string;
  startedAt: string | null;
  scoredRev?: number;
}) {
  const { cfg, limit, timing, picked, answeredMs, choose, submitError } = useQuizRound({
    slide,
    participantId,
    participantToken,
    presentationId,
    startedAt,
  });

  if (timing.phase === "closed") return <StagedLeaderboard />;

  if (timing.phase === "intro") {
    return <PhoneIntro openAt={timing.openAt} introMs={timing.introMs} />;
  }

  if (picked !== null) {
    return (
      <LockedIn
        tileIndex={picked}
        text={cfg.options[picked]}
        closeAt={timing.closeAt}
        limit={limit}
        answeredMs={answeredMs}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] muted-text">Tap your answer</span>
        <TimeLeftPill closeAt={timing.closeAt} />
      </div>
      <TimeBar closeAt={timing.closeAt} limit={limit} />
      <div className="grid grid-cols-2 gap-3">
        {QUIZ_TILES.map((tile, i) => {
          const opt = cfg.options[i];
          if (opt === undefined) return null;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              className="quiz-tile quiz-tile-enter relative flex min-h-[132px] flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl p-4 text-left text-white"
              style={{
                background: tileGradient(tile),
                boxShadow: `0 10px 24px -14px ${tile.glow}`,
                animationDelay: `${i * 70}ms`,
              }}
              aria-label={`Option ${String.fromCharCode(65 + i)}: ${opt}`}
            >
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.2)" }}
                aria-hidden
              >
                <tile.Icon className="h-6 w-6" fill="currentColor" strokeWidth={2} />
              </span>
              <span className="line-clamp-4 min-w-0 text-base font-semibold leading-snug break-words">{opt}</span>
            </button>
          );
        })}
      </div>
      {submitError ? (
        <p className="anim-fade-up text-center text-xs" style={{ color: "var(--danger, #ef4444)" }} role="alert">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}

// "Get ready": the question is on screen (rendered by the parent), answers
// unlock when the bar runs out. Pure CSS animation — no ticking.
export function PhoneIntro({ openAt, introMs }: { openAt: number; introMs: number }) {
  const total = Math.max(1, introMs || 3000);
  const elapsed = useElapsed(openAt, total);
  const secs = useSecondsLeft(openAt);
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
      <div className="ready-badge" aria-hidden>
        <span key={secs} className="ready-count" suppressHydrationWarning>{Math.max(1, secs)}</span>
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blue)" }}>
        Get ready…
      </p>
      <div className="h-1.5 w-full max-w-[16rem] overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        {elapsed != null ? (
          <div
            className="intro-bar h-full rounded-full"
            style={{ animationDuration: `${total}ms`, animationDelay: `-${elapsed}ms` }}
          />
        ) : null}
      </div>
    </div>
  );
}

const WAIT_LINES = [
  "Nerves of steel.",
  "Fingers crossed…",
  "Bold choice.",
  "Waiting for everyone else…",
  "The suspense is real.",
];

export function LockedIn({
  tileIndex,
  text,
  closeAt,
  limit,
  answeredMs = null,
  showTile = true,
}: {
  tileIndex: number;
  text: string;
  closeAt: number;
  limit: number;
  /** Time from the question opening to this player's tap. */
  answeredMs?: number | null;
  showTile?: boolean;
}) {
  const tile = tileFor(tileIndex);
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLine((n) => (n + 1) % WAIT_LINES.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {showTile ? (
        <div className="locked-badge" style={{ background: tileGradient(tile), boxShadow: `0 16px 40px -16px ${tile.glow}` }}>
          <tile.Icon className="h-11 w-11 text-white" fill="currentColor" strokeWidth={2} />
          <span className="locked-check" aria-hidden>
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        </div>
      ) : null}
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] muted-text">Locked in</p>
      <p className="mt-1 px-4 text-xl font-semibold leading-snug">{text}</p>
      {answeredMs != null && (
        <p className="answered-in mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold">
          <Zap className="h-3.5 w-3.5" style={{ color: "#facc15", fill: "#facc15" }} aria-hidden />
          Answered in <span className="mono">{(answeredMs / 1000).toFixed(1)}s</span>
        </p>
      )}
      <p key={line} className="wait-line mt-3 text-sm muted-text">
        {WAIT_LINES[line]}
      </p>
      <div className="mt-6 w-full max-w-[16rem]">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] muted-text">Time left</span>
          <TimeLeftPill closeAt={closeAt} bare />
        </div>
        <div className="mt-1.5">
          <TimeBar closeAt={closeAt} limit={limit} />
        </div>
      </div>
    </div>
  );
}
