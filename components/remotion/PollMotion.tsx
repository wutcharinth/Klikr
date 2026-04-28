"use client";

import React from "react";
import { FeatureMotionCard } from "./FeatureMotionCard";
import { PollMotion as Comp } from "@/remotion/compositions/PollMotion";

export function PollMotion() {
  return (
    <FeatureMotionCard
      composition={Comp as never}
      durationInFrames={150}
      eyebrow="Polls"
      title="See the room think out loud"
      body="Live bars, percentages, and a winning option lit up the moment a majority forms."
      ariaLabel="A live poll being filled in by an audience, with bars growing and percentages counting up."
    />
  );
}
