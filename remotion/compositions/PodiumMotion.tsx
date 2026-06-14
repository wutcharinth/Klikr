import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { withAlpha } from "../primitives/BrandFrame";
import { KpiCounter } from "../primitives/KpiCounter";
import { Sparkle } from "../primitives/Sparkle";

export type PodiumEntry = { nickname: string; score: number };

// Universal podium colours (not finance/brand — these read as podium anywhere).
const MEDAL = ["#FFD54F", "#B0BEC5", "#D7864D"]; // gold, silver, bronze
const MEDAL_INK = ["#5c4a00", "#3f444a", "#ffffff"];

// Reveal frame per rank (30fps): 3rd rises first, then 2nd, then 1st.
const REVEAL: Record<number, number> = { 3: 24, 2: 50, 1: 80 };

// Cinematic top-3 reveal. Responsive: lays out from the composition's own
// width/height, so the same composition serves the projector (landscape) and a
// player's phone (portrait). Plays once and holds the final frame (loop=false).
export function PodiumMotion({
  theme = defaultTheme,
  entries = [],
}: {
  theme?: RemotionTheme;
  entries?: PodiumEntry[];
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const top = entries.slice(0, 3);
  // Visual order across the stage: 2nd, 1st, 3rd.
  const slots: { rank: number; entry: PodiumEntry }[] = [];
  if (top[1]) slots.push({ rank: 2, entry: top[1] });
  if (top[0]) slots.push({ rank: 1, entry: top[0] });
  if (top[2]) slots.push({ rank: 3, entry: top[2] });

  const colW = Math.min(width / 4.2, 210);
  const gap = colW * 0.18;
  const baseBlock = height * 0.30;
  const blockH: Record<number, number> = { 1: baseBlock * 1.5, 2: baseBlock * 1.12, 3: baseBlock * 0.82 };
  const medal = colW * 0.42;
  const nameSize = Math.max(13, colW * 0.13);
  const scoreSize = Math.max(17, colW * 0.18);

  const bgIn = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = width * 0.95;

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.fontFamily, color: theme.ink, overflow: "hidden" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "44%",
          width: glow,
          height: glow,
          marginLeft: -glow / 2,
          marginTop: -glow / 2,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${withAlpha(theme.accent, 0.2)}, transparent 70%)`,
          opacity: bgIn,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: height * 0.07,
          width: "100%",
          textAlign: "center",
          fontSize: Math.max(12, colW * 0.1),
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: withAlpha(theme.ink, 0.55),
          opacity: interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Final results
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap, paddingBottom: height * 0.08 }}>
        {slots.map(({ rank, entry }) => {
          const rf = REVEAL[rank];
          const enter = spring({ frame: Math.max(0, frame - rf), fps, config: { damping: 16, stiffness: 140 } });
          const isFirst = rank === 1;
          return (
            <div key={rank} style={{ width: colW, display: "flex", flexDirection: "column", alignItems: "center", opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
              {isFirst ? <Crown size={medal * 0.7} reveal={interpolate(frame, [rf + 8, rf + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} /> : null}
              <div style={{ width: medal, height: medal, borderRadius: "50%", background: MEDAL[rank - 1], color: MEDAL_INK[rank - 1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: medal * 0.5, fontWeight: 800 }}>{rank}</div>
              <div style={{ marginTop: 8, fontSize: nameSize, fontWeight: 700, maxWidth: colW, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.nickname}</div>
              <div style={{ marginTop: 2, fontSize: scoreSize, fontWeight: 800, color: theme.accent, fontVariantNumeric: "tabular-nums" }}>
                <KpiCounter target={entry.score} startFrame={rf} durationFrames={26} suffix=" pts" />
              </div>
              <div style={{ marginTop: 10, width: colW * 0.92, height: blockH[rank] * enter, borderRadius: "14px 14px 0 0", background: MEDAL[rank - 1], color: MEDAL_INK[rank - 1], display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8, fontSize: nameSize * 0.85, fontWeight: 700, boxShadow: isFirst ? `0 0 0 3px ${withAlpha("#FFD54F", 0.5)}` : "none" }}>
                {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
              </div>
            </div>
          );
        })}
      </div>

      <Sparkle startFrame={86} duration={42} x={width * 0.5 - medal * 0.5} y={height * 0.30} size={medal * 0.4} color="#FFD54F" />
      <Sparkle startFrame={94} duration={42} x={width * 0.5 + medal * 0.55} y={height * 0.35} size={medal * 0.3} color={theme.accent} />
      <Sparkle startFrame={102} duration={42} x={width * 0.5} y={height * 0.2} size={medal * 0.34} color="#FFD54F" />
      <Confetti startFrame={82} width={width} height={height} accent={theme.accent} />
    </AbsoluteFill>
  );
}

function Crown({ size, reveal }: { size: number; reveal: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 24 19" style={{ marginBottom: 4, opacity: reveal, transform: `translateY(${(1 - reveal) * 10}px)` }} aria-hidden>
      <path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z" fill="#E8B400" stroke="#C99700" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

// Deterministic confetti (index-seeded, frame-driven) — no Math.random so the
// render is stable. Bursts from above the winner, falls and fades.
function Confetti({ startFrame, width, height, accent }: { startFrame: number; width: number; height: number; accent: string }) {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  if (local < 0) return null;
  const colors = [accent, "#FFD54F", "#B0BEC5", "#D7864D", "#00C2FF"];
  const N = 44;
  const t = interpolate(local, [0, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(t, [0, 0.85, 1], [1, 1, 0]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
      {Array.from({ length: N }, (_, i) => {
        const sx = ((i * 73) % 100) / 100;
        const sy = ((i * 131) % 100) / 100;
        const x = width * (0.2 + sx * 0.6) + Math.sin(local / 9 + i) * 26;
        const y = -24 + t * height * 0.95 + sy * 40;
        return (
          <div
            key={i}
            style={{ position: "absolute", left: x, top: y, width: 8, height: 12, borderRadius: 2, background: colors[i % colors.length], transform: `rotate(${local * 7 + i * 41}deg)`, opacity }}
          />
        );
      })}
    </div>
  );
}
