"use client";

import { useEffect, useRef, useState } from "react";
import { Triangle, Diamond, Circle, Square, CheckCircle } from "lucide-react";
import type { Slide, QuizConfig } from "@/lib/types";
import { submitResponse, getParticipantScores } from "@/app/play/[code]/actions";
import { useTakeover } from "./audience/TakeoverContext";

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

  // Reveal moment: timer expired. Fetch the latest leaderboard, derive rank
  // and just-earned points, fire the takeover. Refs persist across consecutive
  // quiz slides so we can render rank-delta and just-earned points.
  const { trigger } = useTakeover();
  const prevRankRef = useRef<number | null>(null);
  // Reveal: poll until our score actually changes — score_quiz_slide runs
  // when the host advances, NOT when the local timer expires. Firing on
  // expiry alone shows stale points (the previous question's value).
  useEffect(() => {
    if (!expired) return;
    let cancelled = false;
    let baseline: number | null = null;
    let attempts = 0;

    const tick = async () => {
      if (cancelled) return;
      const list = await getParticipantScores({ presentationId, participantId, participantToken });
      if (cancelled) return;

      const total = list.length;
      const rankNow = Math.max(1, list.findIndex((p) => p.id === participantId) + 1);
      const rankBefore = prevRankRef.current ?? total;
      const me = list.find((p) => p.id === participantId);
      const score = me?.score ?? 0;
      if (baseline === null) baseline = score;
      const delta = score - baseline;

      const isCorrect = picked !== null && picked === cfg.correct_index;
      const didNotAnswer = picked === null;

      if (didNotAnswer) {
        prevRankRef.current = rankNow;
        trigger({ kind: "quiz-skipped", rankNow, total });
        return;
      }
      if (!isCorrect) {
        prevRankRef.current = rankNow;
        trigger({ kind: "quiz-wrong", rankNow, total });
        return;
      }
      if (delta > 0) {
        prevRankRef.current = rankNow;
        trigger({ kind: "quiz-correct", points: delta, rankNow, rankBefore, total });
        return;
      }

      attempts++;
      if (attempts > 12) {
        prevRankRef.current = rankNow;
        trigger({ kind: "quiz-correct", points: 0, rankNow, rankBefore, total });
        return;
      }
      setTimeout(tick, 1000);
    };
    tick();
    return () => { cancelled = true; };
  }, [expired, cfg.correct_index, participantId, participantToken, presentationId, picked, trigger]);

  if (expired || picked !== null) {
    return <PreReveal cfg={cfg} picked={picked} expired={expired} />;
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

// Pre-reveal "locked in" screen + post-reveal placeholder. The big
// correct/wrong/skipped reveal lives in TakeoverLayer; we just need
// something underneath so the slide area isn't visually empty.
function PreReveal({
  cfg,
  picked,
  expired,
}: {
  cfg: QuizConfig;
  picked: number | null;
  expired: boolean;
}) {
  if (!expired && picked !== null) {
    const tile = TILES[picked];
    const pickedText = cfg.options[picked];
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: tile?.color, color: "#fff" }}
        >
          {tile ? <tile.Icon className="h-10 w-10" /> : null}
        </div>
        <p className="mt-5 text-center text-sm uppercase tracking-[0.18em] muted-text">Your answer</p>
        <p className="mt-1 px-4 text-center text-xl font-semibold leading-snug">{pickedText}</p>
        <p className="mt-5 flex items-center gap-2 text-sm muted-text">
          <CheckCircle className="h-4 w-4" /> Locked in — hold tight for the result.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-sm muted-text">Reveal up — hold tight.</p>
    </div>
  );
}
