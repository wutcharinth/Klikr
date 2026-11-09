"use client";

import { useEffect, useState } from "react";
import { Triangle, Diamond, Circle, Square, CheckCircle } from "lucide-react";
import type { Slide } from "@/lib/types";
import type { AudienceQuizConfig } from "@/lib/audienceSlides";
import { submitResponse } from "@/app/play/[code]/actions";
import { StagedLeaderboard } from "./audience/AudienceLeaderboard";
import { useQuizReveal } from "./audience/useQuizReveal";

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
  scoredRev,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
  presentationId: string;
  startedAt: number | null;
  scoredRev: number;
}) {
  // Audience slides carry no answer key — see lib/audienceSlides.ts.
  const cfg = slide.config as AudienceQuizConfig;
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

  // Reveal: once the timer runs out, ask the server for the result (correct
  // answer + this player's real points) and fire the takeover with it.
  const { trackSubmit } = useQuizReveal({
    slideId: slide.id,
    options: cfg.options,
    expired,
    presentationId,
    participantId,
    participantToken,
    scoredRev,
  });

  if (expired) {
    return (
      <StagedLeaderboard
        presentationId={presentationId}
        participantId={participantId}
        participantToken={participantToken}
        scoredRev={scoredRev}
      />
    );
  }
  const remainingS = Math.max(0, Math.ceil(limit - elapsed));

  if (picked !== null) {
    return <PreReveal cfg={cfg} picked={picked} expired={expired} remainingS={remainingS} limit={limit} />;
  }

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
                await trackSubmit(
                  submitResponse({
                    slideId: slide.id,
                    participantId,
                    participantToken,
                    valueIndex: i,
                  }),
                );
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
  remainingS,
  limit,
}: {
  cfg: AudienceQuizConfig;
  picked: number | null;
  expired: boolean;
  remainingS?: number;
  limit?: number;
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
        {remainingS !== undefined && limit !== undefined ? (
          <WaitCountdown remainingS={remainingS} limit={limit} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-sm muted-text">Reveal up — hold tight.</p>
    </div>
  );
}

// Shared live countdown shown on the "locked in" waiting screen so the player
// keeps a sense of time while the timer runs down. Colour shifts
// green → amber → red, matching the presenter-side urgency thresholds.
export function WaitCountdown({ remainingS, limit }: { remainingS: number; limit: number }) {
  const color =
    remainingS > limit / 2 ? "#22c55e" : remainingS > limit / 4 ? "#eab308" : "#ef4444";
  const pct = limit > 0 ? Math.max(0, Math.min(100, (remainingS / limit) * 100)) : 0;
  return (
    <div className="mt-6 w-full max-w-[16rem]">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] muted-text">Time left</span>
        <span className="mono text-lg font-bold" style={{ color, fontVariantNumeric: "tabular-nums" }}>
          {remainingS}s
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: "width 200ms linear, background 400ms ease" }}
        />
      </div>
    </div>
  );
}
