"use client";

import React from "react";
import { FeatureMotionCard } from "./FeatureMotionCard";
import { WordCloudMotion as Comp } from "@/remotion/compositions/WordCloudMotion";

export function WordCloudMotion() {
  return (
    <FeatureMotionCard
      composition={Comp as never}
      durationInFrames={150}
      eyebrow="Word cloud"
      title="One word from everyone"
      body="Words fly in, settle into a clean cloud, and the most common ones grow larger as votes arrive."
      ariaLabel="Words flying in from off-screen and arranging themselves into a word cloud."
    />
  );
}
