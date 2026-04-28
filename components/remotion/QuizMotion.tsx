"use client";

import React from "react";
import { FeatureMotionCard } from "./FeatureMotionCard";
import { QuizMotion as Comp } from "@/remotion/compositions/QuizMotion";

export function QuizMotion() {
  return (
    <FeatureMotionCard
      composition={Comp as never}
      durationInFrames={180}
      eyebrow="Quiz"
      title="Trivia that actually feels live"
      body="Timer runs, tiles lock, the right answer glows green and points snap into the leaderboard."
      ariaLabel="A quiz timer counting down, tiles locking, and the correct answer revealing in green."
    />
  );
}
