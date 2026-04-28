"use client";

import React from "react";
import { FeatureMotionCard } from "./FeatureMotionCard";
import { AIDeckGenerationMotion as Comp } from "@/remotion/compositions/AIDeckGenerationMotion";

export function AIDeckGenerationMotion() {
  return (
    <FeatureMotionCard
      composition={Comp as never}
      durationInFrames={180}
      eyebrow="AI deck"
      title="Type a sentence. Get a deck."
      body="Describe the meeting and Klikr's AI assembles a session ready to present in seconds."
      ariaLabel="An AI prompt being typed, a shimmer pass, and four slides materializing one by one."
    />
  );
}
