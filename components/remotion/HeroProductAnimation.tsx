"use client";

import React from "react";
import { RemotionShowcase } from "./RemotionShowcase";
import { HeroProductAnimation as HeroComp } from "@/remotion/compositions/HeroProductAnimation";

function HeroPlaceholder() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0b0b10",
        padding: "48px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "var(--blue-bright, #2997ff)",
              boxShadow: "0 0 0 5px rgba(41,151,255,0.18)",
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f5f5f7",
            }}
          >
            Klikr
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(41,151,255,0.08)",
            border: "1px solid rgba(41,151,255,0.25)",
            color: "var(--blue-bright, #2997ff)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "var(--blue-bright, #2997ff)",
              display: "inline-block",
            }}
          />
          Live session
        </div>
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(245,245,247,0.55)",
        }}
      >
        Dashboard
      </div>
      <div
        style={{
          marginTop: 22,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#f5f5f7",
        }}
      >
        Your sessions
      </div>
      <div
        style={{
          marginTop: 30,
          display: "grid",
          gap: 14,
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        <div
          style={{
            padding: "20px 22px",
            borderRadius: 16,
            background: "rgba(41,151,255,0.06)",
            border: "1px solid rgba(41,151,255,0.35)",
            boxShadow: "0 14px 36px -20px rgba(41,151,255,0.6)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: "#f5f5f7" }}>
            New session
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "rgba(245,245,247,0.6)",
            }}
          >
            Empty deck, name it later
          </div>
        </div>
        <div
          style={{
            padding: "20px 22px",
            borderRadius: 16,
            background: "#1c1c1e",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: "#f5f5f7" }}>
            Templates
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "rgba(245,245,247,0.6)",
            }}
          >
            Polls, quizzes, icebreakers
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroProductAnimation({ className }: { className?: string }) {
  return (
    <RemotionShowcase
      composition={HeroComp as never}
      durationInFrames={360}
      fps={30}
      compositionWidth={1280}
      compositionHeight={720}
      className={className}
      eager
      placeholder={<HeroPlaceholder />}
      ariaLabel="A live Klikr session — host invites the room, audience joins, votes flow in, and live results appear."
      style={{
        aspectRatio: "16 / 9",
        boxShadow: "0 30px 80px -40px rgba(0,0,0,0.30)",
        border: "1px solid var(--line)",
      }}
    />
  );
}
