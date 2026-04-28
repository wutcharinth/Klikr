"use client";

import React from "react";
import { RemotionShowcase } from "./RemotionShowcase";
import { HowItWorksMotion as Comp } from "@/remotion/compositions/HowItWorksMotion";

export function HowItWorksMotion({ className }: { className?: string }) {
  return (
    <RemotionShowcase
      composition={Comp as never}
      durationInFrames={180}
      fps={30}
      compositionWidth={1280}
      compositionHeight={520}
      className={className}
      ariaLabel="Three steps — create, share, present — animating in sequence."
      style={{
        aspectRatio: "1280 / 520",
        boxShadow: "0 30px 80px -40px rgba(0,0,0,0.20)",
        border: "1px solid var(--line)",
      }}
    />
  );
}
