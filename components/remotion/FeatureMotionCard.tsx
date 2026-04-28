"use client";

import React from "react";
import { RemotionShowcase } from "./RemotionShowcase";

export type FeatureMotionCardProps = {
  composition: React.ComponentType<Record<string, unknown>>;
  durationInFrames: number;
  fps?: number;
  /** Visual width / height for the inner composition canvas. */
  compositionWidth?: number;
  compositionHeight?: number;
  /** Card label rendered above the animation. */
  eyebrow?: string;
  title: string;
  body: string;
  ariaLabel?: string;
  className?: string;
};

// Shared shell for every feature animation card. The animation sits at the top,
// title + body underneath. Cards on /features and on the homepage feature grid
// both consume this so the visual is consistent.
export function FeatureMotionCard({
  composition,
  durationInFrames,
  fps = 30,
  compositionWidth = 1280,
  compositionHeight = 720,
  eyebrow,
  title,
  body,
  ariaLabel,
  className,
}: FeatureMotionCardProps) {
  return (
    <div
      className={`panel overflow-hidden ${className ?? ""}`}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <RemotionShowcase
        composition={composition as never}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        ariaLabel={ariaLabel}
        style={{ aspectRatio: `${compositionWidth} / ${compositionHeight}`, borderRadius: 0 }}
      />
      <div className="px-6 py-5">
        {eyebrow ? (
          <div className="text-[11px] uppercase tracking-[0.18em] muted-text">{eyebrow}</div>
        ) : null}
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm muted-text">{body}</p>
      </div>
    </div>
  );
}
