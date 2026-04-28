import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { defaultTheme, type RemotionTheme } from "../theme/tokens";
import { BrandFrame, withAlpha } from "../primitives/BrandFrame";
import { LetterDraw, MaskedTextReveal } from "../primitives/AnimatedText";
import { KpiCounter } from "../primitives/KpiCounter";
import { VoteBar } from "../primitives/VoteBar";
import { PhoneFrame } from "../primitives/PhoneFrame";
import { Avatar } from "../primitives/Avatar";
import { QrCard } from "../primitives/QrCard";
import { Sparkle } from "../primitives/Sparkle";
import { APPLE_OUT } from "../theme/easing";

// 10s @ 30fps = 300 frames. Loop seamlessly.
// Concept: silent room → engaged audience.

export type HeroProductAnimationProps = {
  theme?: RemotionTheme;
};

export function HeroProductAnimation({
  theme = defaultTheme,
}: HeroProductAnimationProps) {
  return (
    <AbsoluteFill style={{ background: theme.bgSoft, fontFamily: theme.fontFamily }}>
      <BrandFrame theme={theme} pad={48} background={theme.bg}>
        {/* Main stage container */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
          <NavStrip theme={theme} />
          <Stage theme={theme} />
        </div>
      </BrandFrame>
    </AbsoluteFill>
  );
}

function NavStrip({ theme }: { theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: APPLE_OUT,
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px 28px",
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: theme.accent,
            boxShadow: `0 0 0 5px ${withAlpha(theme.accent, 0.18)}`,
          }}
        />
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: theme.ink }}>
          Klikr
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Pill theme={theme} label="Live session" dot />
      </div>
    </div>
  );
}

function Pill({ theme, label, dot = false }: { theme: RemotionTheme; label: string; dot?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        background: withAlpha(theme.accent, 0.08),
        border: `1px solid ${withAlpha(theme.accent, 0.25)}`,
        color: theme.accent,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {dot ? (
        <span
          style={{ width: 7, height: 7, borderRadius: 999, background: theme.accent, display: "inline-block" }}
        />
      ) : null}
      {label}
    </div>
  );
}

function Stage({ theme }: { theme: RemotionTheme }) {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      {/* Sequence beats — each beat is a Sequence so its frame counter is local */}

      {/* Beat 1 — host dashboard intro (frames 0–48) */}
      <Sequence from={0} durationInFrames={84}>
        <DashboardIntro theme={theme} />
      </Sequence>

      {/* Beat 2 — join code + QR (frames 48–144) */}
      <Sequence from={48} durationInFrames={108}>
        <JoinPanel theme={theme} />
      </Sequence>

      {/* Beat 3 — audience joins + poll reveal (frames 84–204) */}
      <Sequence from={84} durationInFrames={120}>
        <AudienceAndPoll theme={theme} />
      </Sequence>

      {/* Beat 4 — bars grow + percentages (frames 180–264) */}
      <Sequence from={180} durationInFrames={108}>
        <BarsGrow theme={theme} />
      </Sequence>

      {/* Beat 5 — closing badges + sparkles (frames 264–300) */}
      <Sequence from={264} durationInFrames={36}>
        <ClosingBadges theme={theme} />
      </Sequence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat 1 — host dashboard
// ─────────────────────────────────────────────────────────────────────────────

function DashboardIntro({ theme }: { theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 24, 60, 84], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(frame, [24, 48], [0, 220], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: APPLE_OUT,
  });
  const tilePop = spring({ frame: Math.max(0, frame - 36), fps: 30, config: { damping: 12, stiffness: 200 } });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: withAlpha(theme.ink, 0.55),
        }}
      >
        Dashboard
      </div>
      <div style={{ marginTop: 22, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: theme.ink }}>
        Your sessions
      </div>

      <div style={{ marginTop: 30, display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
        <Tile theme={theme} title="New session" subtitle="Empty deck, name it later" highlight scale={1 + 0.04 * tilePop} />
        <Tile theme={theme} title="Templates" subtitle="Polls, quizzes, icebreakers" />
      </div>

      {/* fake cursor */}
      <div
        style={{
          position: "absolute",
          left: 220 + cursorX * 0.6,
          top: 380,
          width: 22,
          height: 22,
          transform: "rotate(-15deg)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.ink,
            clipPath: "polygon(0 0, 80% 60%, 50% 60%, 60% 100%, 35% 80%, 0 80%)",
          }}
        />
      </div>
    </div>
  );
}

function Tile({
  theme,
  title,
  subtitle,
  highlight = false,
  scale = 1,
}: {
  theme: RemotionTheme;
  title: string;
  subtitle: string;
  highlight?: boolean;
  scale?: number;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        borderRadius: 16,
        background: highlight ? withAlpha(theme.accent, 0.06) : theme.bgSoft,
        border: `1px solid ${highlight ? withAlpha(theme.accent, 0.35) : theme.line}`,
        transform: `scale(${scale})`,
        boxShadow: highlight ? `0 14px 36px -20px ${withAlpha(theme.accent, 0.6)}` : "none",
        transition: "transform 200ms ease",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, color: theme.ink }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: withAlpha(theme.ink, 0.6) }}>
        {subtitle}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat 2 — join code + QR
// ─────────────────────────────────────────────────────────────────────────────

function JoinPanel({ theme }: { theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 18, 84, 108], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade,
        display: "flex",
        gap: 56,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <QrCard theme={theme} size={220} startFrame={0} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: withAlpha(theme.ink, 0.55),
          }}
        >
          Audience joins at
        </span>
        <span style={{ fontSize: 22, color: withAlpha(theme.ink, 0.7) }}>
          klikrapp.com /
        </span>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: theme.accent,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          <LetterDraw text="JX9PQ" startFrame={6} perLetter={4} letterDuration={14} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat 3 — audience joins + poll reveal
// ─────────────────────────────────────────────────────────────────────────────

const AUDIENCE = ["Sam", "Priya", "Min", "Alex", "Jordan"];

function AudienceAndPoll({ theme }: { theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 18, 100, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      {/* Question */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: withAlpha(theme.ink, 0.55),
          }}
        >
          Live poll
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: theme.ink,
            lineHeight: 1.1,
          }}
        >
          <MaskedTextReveal text="Which idea should we prioritize?" startFrame={18} durationFrames={28} />
        </div>
      </div>

      {/* Phones at the bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 28,
          alignItems: "flex-end",
        }}
      >
        {[0, 1, 2].map((i) => (
          <PhoneEnter key={i} index={i} theme={theme} />
        ))}
      </div>

      {/* Audience pile (avatars on the right) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        {AUDIENCE.map((name, i) => (
          <AvatarEnter key={name} name={name} index={i} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function PhoneEnter({ index, theme }: { index: number; theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const start = 24 + index * 12;
  const enter = spring({
    frame: Math.max(0, frame - start),
    fps: 30,
    config: { damping: 18, stiffness: 130 },
  });
  const float = Math.sin(((frame - start) / 30) * Math.PI * 0.6) * 4;
  return (
    <div
      style={{
        transform: `translateY(${(1 - enter) * 80 + float}px)`,
        opacity: enter,
      }}
    >
      <PhoneFrame width={120}>
        <div style={{ padding: 8, color: theme.ink, fontSize: 9 }}>
          <div style={{ fontWeight: 700 }}>Klikr</div>
          <div style={{ marginTop: 8 }}>Pick one:</div>
          <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
            <MiniOption theme={theme} highlight={index === 0}>Ship faster</MiniOption>
            <MiniOption theme={theme} highlight={index === 1}>Polish UX</MiniOption>
            <MiniOption theme={theme} highlight={index === 2}>New market</MiniOption>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

function MiniOption({ theme, highlight, children }: { theme: RemotionTheme; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: highlight ? withAlpha(theme.accent, 0.16) : theme.bgSoft,
        border: `1px solid ${highlight ? withAlpha(theme.accent, 0.4) : theme.line}`,
        color: highlight ? theme.accent : theme.ink,
        borderRadius: 6,
        padding: "5px 7px",
        fontSize: 9,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function AvatarEnter({ name, index, theme }: { name: string; index: number; theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const start = 36 + index * 8;
  const t = spring({
    frame: Math.max(0, frame - start),
    fps: 30,
    config: { damping: 12, stiffness: 200 },
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px 4px 4px",
        borderRadius: 999,
        background: theme.bgSoft,
        border: `1px solid ${theme.line}`,
        opacity: t,
        transform: `translateX(${(1 - t) * 40}px) scale(${0.8 + 0.2 * t})`,
      }}
    >
      <Avatar name={name} size={26} />
      <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>{name}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat 4 — bars grow + percentages
// ─────────────────────────────────────────────────────────────────────────────

function BarsGrow({ theme }: { theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 18, 84, 108], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalPcts = [56, 28, 16];
  const labels = ["Ship faster", "Polish UX", "New market"];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 22,
        padding: "0 20px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: withAlpha(theme.ink, 0.55),
          }}
        >
          Live results
        </div>
      </div>
      {finalPcts.map((pct, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 18, alignItems: "center" }}>
          <VoteBar
            theme={theme}
            label={labels[i]}
            finalPct={pct}
            startFrame={6 + i * 6}
            growFrames={36}
            highlight={i === 0}
            height={64}
          />
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: i === 0 ? theme.accent : theme.ink,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <KpiCounter target={pct} startFrame={6 + i * 6} durationFrames={36} suffix="%" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat 5 — closing badges + sparkles
// ─────────────────────────────────────────────────────────────────────────────

const BADGES = ["Live results", "No signup", "AI-powered", "Everyone is engaged"] as const;

function ClosingBadges({ theme }: { theme: RemotionTheme }) {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12, 30, 36], [0, 1, 1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: theme.ink,
          textAlign: "center",
        }}
      >
        Everyone is engaged.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 760 }}>
        {BADGES.map((label, i) => {
          const start = 4 + i * 4;
          const t = spring({
            frame: Math.max(0, frame - start),
            fps: 30,
            config: { damping: 14, stiffness: 220 },
          });
          return (
            <div
              key={label}
              style={{
                opacity: t,
                transform: `scale(${0.8 + 0.2 * t})`,
                padding: "10px 16px",
                borderRadius: 999,
                background: withAlpha(theme.accent, 0.08),
                border: `1px solid ${withAlpha(theme.accent, 0.25)}`,
                color: theme.accent,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      {/* a few subtle sparkles */}
      <Sparkle startFrame={2} duration={28} x={120} y={80} size={12} color={theme.accent} />
      <Sparkle startFrame={6} duration={28} x={620} y={140} size={14} color={theme.accent} />
      <Sparkle startFrame={10} duration={28} x={300} y={300} size={10} color={theme.accent} />
    </div>
  );
}
