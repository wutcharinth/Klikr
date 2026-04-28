"use client";

import React from "react";
import { RemotionShowcase } from "./RemotionShowcase";
import { LogoMark, type LogoMarkVariant } from "@/remotion/compositions/LogoMark";

const DURATIONS: Record<LogoMarkVariant, number> = {
  idle: 180,
  wake: 48,
  react: 24,
  outro: 60,
};

// Thin wrapper around the LogoMark composition. Pass a variant to switch
// between idle / wake / react / outro behaviours.
export function LogoMarkPlayer({
  variant = "idle",
  className,
  width = 480,
  height = 140,
  loop,
}: {
  variant?: LogoMarkVariant;
  className?: string;
  width?: number;
  height?: number;
  loop?: boolean;
}) {
  return (
    <RemotionShowcase
      composition={LogoMark as never}
      durationInFrames={DURATIONS[variant]}
      fps={30}
      compositionWidth={width}
      compositionHeight={height}
      loop={loop ?? variant === "idle"}
      ariaLabel="Klikr"
      inputProps={{ variant }}
      className={className}
      style={{ aspectRatio: `${width} / ${height}`, background: "transparent", border: "none" }}
    />
  );
}
