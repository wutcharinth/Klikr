"use client";

import React from "react";
import { FeatureMotionCard } from "./FeatureMotionCard";
import { QAMotion as Comp } from "@/remotion/compositions/QAMotion";

export function QAMotion() {
  return (
    <FeatureMotionCard
      composition={Comp as never}
      durationInFrames={150}
      eyebrow="Q&A"
      title="The room asks. The crowd ranks."
      body="Questions stream in, upvotes promote the most relevant one, and answered items drop out of the way."
      ariaLabel="Audience questions filling a board, upvotes ticking up, and the top question rising."
    />
  );
}
