"use client";

import { useEffect, useState } from "react";
import { Triangle, Diamond, Circle, Square, CheckCircle } from "lucide-react";
import type { Slide, QuizConfig } from "@/lib/types";
import { submitResponse } from "@/app/play/[code]/actions";
import { RevealMedal, ScoreCard } from "./QuizFeedback";

const TILES = [
  { color: "#E21B3C", Icon: Triangle },
  { color: "#1368CE", Icon: Diamond },
  { color: "#FFA602", Icon: Circle },
  { color: "#26890C", Icon: Square },
];

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
  startedAt: number | null;
}) {
  const cfg = slide.config as QuizConfig;
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Local timer ticking every 200ms — used to detect when the question's
  // time limit elapses so we can flip to the result screen.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const start = startedAt ?? now;
  const limit = cfg.time_limit_s ?? 20;
  const elapsed = Math.max(0, (now - start) / 1000);
  const expired = elapsed >= limit;

  // Reset local state whenever the host moves to a new slide.
  useEffect(() => {
    setPicked(null);
  }, [slide.id]);

  if (expired || picked !== null) {
    return (
      <PostQuizFeedback
        slide={slide}
        cfg={cfg}
        picked={picked}
        expired={expired}
        participantId={participantId}
        participantToken={participantToken}
        presentationId={presentationId}
      />
    );
  }

  const remainingS = Math.max(0, Math.ceil(limit - elapsed));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs muted-text">
        <span className="uppercase tracking-[0.18em]">Tap your answer</span>
        <span className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>{remainingS}s</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TILES.map((tile, i) => {
          const opt = cfg.options[i];
          if (opt === undefined) return null;
          return (
            <button
              key={i}
              onClick={async () => {
                setPicked(i);
                if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(50);
                await submitResponse({
                  slideId: slide.id,
                  participantId,
                  participantToken,
                  valueIndex: i,
                });
              }}
              className="relative flex min-h-[88px] items-center gap-3 rounded-2xl p-4 text-left text-white transition-transform active:scale-95"
              style={{ background: tile.color }}
              aria-label={`Option ${String.fromCharCode(65 + i)}: ${opt}`}
            >
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.18)" }}
                aria-hidden
              >
                <tile.Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1 text-base font-semibold leading-snug break-words">
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PostQuizFeedback({
  slide,
  cfg,
  picked,
  expired,
  participantId,
  participantToken,
  presentationId,
}: {
  slide: Slide;
  cfg: QuizConfig;
  picked: number | null;
  expired: boolean;
  participantId: string;
  participantToken: string;
  presentationId: string;
}) {
  // Pre-reveal "got it, hold tight" — they picked but timer hasn't fired yet.
  if (!expired && picked !== null) {
    const tile = TILES[picked];
    const pickedText = cfg.options[picked];
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: tile.color, color: "#fff" }}
        >
          <tile.Icon className="h-10 w-10" />
        </div>
        <p className="mt-5 text-center text-sm uppercase tracking-[0.18em] muted-text">Your answer</p>
        <p className="mt-1 px-4 text-center text-xl font-semibold leading-snug">{pickedText}</p>
        <p className="mt-5 flex items-center gap-2 text-sm muted-text">
          <CheckCircle className="h-4 w-4" /> Locked in — hold tight for the result.
        </p>
      </div>
    );
  }

  // Reveal screen: show correct/wrong feedback and the score card.
  const isCorrect = picked !== null && picked === cfg.correct_index;
  const didNotAnswer = picked === null;
  const correctTile = TILES[cfg.correct_index];
  const correctText = cfg.options[cfg.correct_index];
  const pickedTile = picked !== null ? TILES[picked] : null;
  const pickedText = picked !== null ? cfg.options[picked] : null;

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <RevealMedal correct={isCorrect} skipped={didNotAnswer} confetti={isCorrect} />

      {/* Always surface the correct answer text + the audience's pick so they
          know exactly what they got right or wrong, even if they tuned out
          the host screen. */}
      <div className="w-full max-w-sm space-y-2">
        <div
          className="flex items-center gap-3 rounded-xl p-3 text-white"
          style={{ background: correctTile?.color ?? "#22c55e" }}
        >
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg"
            style={{ background: "rgba(255,255,255,0.22)" }}
            aria-hidden
          >
            {correctTile ? <correctTile.Icon className="h-5 w-5" /> : null}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">Correct answer</p>
            <p className="text-sm font-semibold break-words">{correctText}</p>
          </div>
        </div>
        {!didNotAnswer && !isCorrect && pickedTile && pickedText && (
          <div
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.35)",
            }}
          >
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white"
              style={{ background: pickedTile.color, opacity: 0.7 }}
              aria-hidden
            >
              <pickedTile.Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#dc2626" }}>
                Your answer
              </p>
              <p className="text-sm font-medium break-words" style={{ color: "var(--ink, var(--fg))" }}>
                {pickedText}
              </p>
            </div>
          </div>
        )}
      </div>

      <ScoreCard
        presentationId={presentationId}
        participantId={participantId}
        participantToken={participantToken}
        slideId={slide.id}
        correct={isCorrect}
      />
    </div>
  );
}
