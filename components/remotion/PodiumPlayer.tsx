"use client";

import React from "react";
import { RemotionShowcase } from "./RemotionShowcase";
import { PodiumMotion, type PodiumEntry } from "@/remotion/compositions/PodiumMotion";

// Plays the cinematic top-3 reveal live in the browser. Sized per surface
// (landscape for the projector, portrait for a phone). Plays once and holds the
// final frame; RemotionShowcase lazy-loads the player and shows a static
// reduced-motion fallback.
export function PodiumPlayer({
  entries,
  width,
  height,
  className,
  style,
}: {
  entries: PodiumEntry[];
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <RemotionShowcase
      composition={PodiumMotion as never}
      durationInFrames={170}
      fps={30}
      compositionWidth={width}
      compositionHeight={height}
      loop={false}
      eager
      ariaLabel="Final podium — the top three players revealed"
      inputProps={{ entries }}
      className={className}
      style={{ aspectRatio: `${width} / ${height}`, background: "transparent", border: "none", ...style }}
    />
  );
}
