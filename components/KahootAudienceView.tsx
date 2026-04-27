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
        presentationId={presentationId}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {TILES.map((tile, i) => (
        <button
          key={i}
          onClick={async () => {
            setPicked(i);
            if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(50);
            await submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: i });
          }}
          className="aspect-square flex items-center justify-center rounded-2xl transition-transform active:scale-95"
          style={{ background: tile.color }}
          aria-label={`Option ${i + 1}`}
        >
          <tile.Icon className="h-16 w-16 text-white" />
        </button>
      ))}
    </div>
  );
}

function PostQuizFeedback({
  slide,
  cfg,
  picked,
  expired,
  participantId,
  presentationId,
}: {
  slide: Slide;
  cfg: QuizConfig;
  picked: number | null;
  expired: boolean;
  participantId: string;
  presentationId: string;
}) {
  // Pre-reveal "got it, hold tight" — they picked but timer hasn't fired yet.
  if (!expired && picked !== null) {
    const tile = TILES[picked];
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full"
          style={{ background: tile.color, color: "#fff" }}
        >
          <tile.Icon className="h-12 w-12" />
        </div>
        <p className="mt-6 text-center text-lg font-medium">Got it. Hold tight for the result.</p>
        <CheckCircle className="mt-3 h-5 w-5 muted-text" />
      </div>
    );
  }

  // Reveal screen: show correct/wrong feedback and the score card.
  const isCorrect = picked !== null && picked === cfg.correct_index;
  const didNotAnswer = picked === null;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <RevealMedal correct={isCorrect} skipped={didNotAnswer} confetti={isCorrect} />
      <ScoreCard
        presentationId={presentationId}
        participantId={participantId}
        slideId={slide.id}
        correct={isCorrect}
      />
    </div>
  );
}
