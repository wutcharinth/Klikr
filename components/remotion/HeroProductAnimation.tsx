"use client";

import React from "react";
import { RemotionShowcase } from "./RemotionShowcase";
import { HeroProductAnimation as HeroComp } from "@/remotion/compositions/HeroProductAnimation";

export function HeroProductAnimation({ className }: { className?: string }) {
  return (
    <RemotionShowcase
      composition={HeroComp as never}
      durationInFrames={300}
      fps={30}
      compositionWidth={1280}
      compositionHeight={720}
      className={className}
      eager
      ariaLabel="A live Klikr session — host invites the room, audience joins, votes flow in, and live results appear."
      style={{
        aspectRatio: "16 / 9",
        boxShadow: "0 30px 80px -40px rgba(0,0,0,0.30)",
        border: "1px solid var(--line)",
      }}
    />
  );
}
