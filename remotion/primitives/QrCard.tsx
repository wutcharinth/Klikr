import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { RemotionTheme } from "../theme/tokens";
import { withAlpha } from "./BrandFrame";

// Decorative QR-like grid + halo. Not an actual QR; reads as one at a glance.
export function QrCard({
  theme,
  size = 200,
  startFrame = 0,
}: {
  theme: RemotionTheme;
  size?: number;
  startFrame?: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const haloPhase = ((frame - startFrame) % 78) / 78; // 2.6s loop
  const haloScale = 1 + haloPhase * 0.18;
  const haloOpacity = 0.55 * (1 - haloPhase);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        background: "#fff",
        padding: 14,
        position: "relative",
        boxShadow: "0 20px 50px -25px rgba(0,0,0,0.35)",
        opacity,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          border: `1px solid ${withAlpha(theme.accent, 0.4)}`,
          opacity: frame > startFrame ? haloOpacity : 0,
          transform: `scale(${haloScale})`,
          pointerEvents: "none",
        }}
      />
      <FakeQr accent={theme.ink} />
    </div>
  );
}

function FakeQr({ accent }: { accent: string }) {
  // Static deterministic pattern that reads as a QR.
  const cells = 21;
  const pattern: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    pattern.push([]);
    for (let c = 0; c < cells; c++) {
      const finder =
        (r < 7 && c < 7) ||
        (r < 7 && c >= cells - 7) ||
        (r >= cells - 7 && c < 7);
      const finderEdge =
        finder &&
        (r === 0 ||
          c === 0 ||
          r === 6 ||
          c === 6 ||
          c === cells - 1 ||
          c === cells - 7 ||
          r === cells - 1 ||
          r === cells - 7);
      const finderCenter =
        (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
        (r >= 2 && r <= 4 && c >= cells - 5 && c <= cells - 3) ||
        (r >= cells - 5 && r <= cells - 3 && c >= 2 && c <= 4);
      // Pseudo-random body
      const v = ((r * 73856093) ^ (c * 19349663)) >>> 0;
      const bit = (v % 7) < 3;
      pattern[r].push(finderEdge || finderCenter || (!finder && bit));
    }
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cells}, 1fr)`,
        gridTemplateRows: `repeat(${cells}, 1fr)`,
        width: "100%",
        height: "100%",
        gap: 0,
      }}
    >
      {pattern.flatMap((row, r) =>
        row.map((on, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              background: on ? accent : "transparent",
              borderRadius: 1,
            }}
          />
        )),
      )}
    </div>
  );
}
