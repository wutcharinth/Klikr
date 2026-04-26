"use client";

import { useState } from "react";
import { Triangle, Diamond, Circle, Square, CheckCircle } from "lucide-react";
import type { Slide } from "@/lib/types";
import { submitResponse } from "@/app/play/[code]/actions";

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
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  if (picked !== null) {
    const tile = TILES[picked];
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full p-6" style={{ background: tile.color, color: "#fff" }}>
          <tile.Icon className="h-12 w-12" />
        </div>
        <p className="mt-6 text-center text-lg font-medium">Got it. Hold tight for the result.</p>
        <CheckCircle className="mt-4 h-5 w-5 muted-text" />
      </div>
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
