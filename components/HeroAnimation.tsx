import React from "react";

/*
 * HeroAnimationCSS — lightweight replacement for the Remotion-based hero.
 *
 * Shows 4 beats in a 12s CSS-animated loop:
 *   0–3s   Dashboard intro
 *   3–6s   Join code + QR
 *   6–9s   Live poll + audience
 *   9–12s  Results with bars
 *
 * Zero runtime JS — everything is CSS @keyframes.
 */

const ACCENT = "#2997ff";
const INK = "#f5f5f7";
const BG = "#0b0b10";
const BG_SOFT = "#1c1c1e";
const LINE = "rgba(255,255,255,0.08)";
const MUTED = "rgba(245,245,247,0.55)";

/* ── helper ─────────────────────────────────────────── */
const pill = (label: string, dot = false) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 999,
      background: `${ACCENT}14`,
      border: `1px solid ${ACCENT}40`,
      color: ACCENT,
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: "0.02em",
    }}
  >
    {dot && (
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: ACCENT,
          display: "inline-block",
        }}
      />
    )}
    {label}
  </span>
);

/* ── beats ──────────────────────────────────────────── */

function BeatDashboard() {
  return (
    <div className="hero-beat hero-beat-1 hero-beat-initial">
      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>
        Dashboard
      </div>
      <div style={{ marginTop: 18, fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}>
        Your sessions
      </div>
      <div style={{ marginTop: 24, display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            background: `${ACCENT}0f`,
            border: `1px solid ${ACCENT}59`,
            boxShadow: `0 14px 36px -20px ${ACCENT}99`,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: INK }}>New session</div>
          <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>Empty deck, name it later</div>
        </div>
        <div style={{ padding: "18px 20px", borderRadius: 14, background: BG_SOFT, border: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: INK }}>Templates</div>
          <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>Polls, quizzes, icebreakers</div>
        </div>
      </div>
    </div>
  );
}

function BeatJoinCode() {
  return (
    <div className="hero-beat hero-beat-2">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>
          Audience joins at
        </span>
        <span style={{ fontSize: 18, color: `${INK}b3` }}>klikrapp.com /</span>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: ACCENT,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          JX9PQ
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
          {pill("5 joined", true)}
        </div>
      </div>
    </div>
  );
}

function BeatPoll() {
  return (
    <div className="hero-beat hero-beat-3">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>
          Live poll
        </div>
        <div style={{ marginTop: 14, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: INK, lineHeight: 1.15 }}>
          Which idea should we prioritize?
        </div>
      </div>
      <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
        {["Ship faster", "Polish UX", "New market"].map((label, i) => (
          <div
            key={label}
            className={`hero-option hero-option-${i + 1}`}
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              background: i === 0 ? `${ACCENT}28` : BG_SOFT,
              border: `1px solid ${i === 0 ? `${ACCENT}66` : LINE}`,
              color: i === 0 ? ACCENT : INK,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function BeatResults() {
  const bars = [
    { label: "Ship faster", pct: 56, highlight: true },
    { label: "Polish UX", pct: 28, highlight: false },
    { label: "New market", pct: 16, highlight: false },
  ];
  return (
    <div className="hero-beat hero-beat-4">
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED }}>
          Live results
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {bars.map((b, i) => (
          <div key={b.label} style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 14, alignItems: "center" }}>
            <div style={{ position: "relative", height: 48, borderRadius: 10, background: BG_SOFT, overflow: "hidden" }}>
              <div
                className={`hero-bar hero-bar-${i + 1}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 10,
                  background: b.highlight
                    ? `linear-gradient(90deg, ${ACCENT}40, ${ACCENT}80)`
                    : `rgba(255,255,255,0.08)`,
                  transformOrigin: "left",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  paddingLeft: 16,
                  fontSize: 14,
                  fontWeight: 600,
                  color: b.highlight ? ACCENT : INK,
                }}
              >
                {b.label}
              </span>
            </div>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: b.highlight ? ACCENT : INK,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {b.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main export ─────────────────────────────────────── */

export function HeroAnimationCSS({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: 18,
        background: BG,
        border: `1px solid ${LINE}`,
        boxShadow: "0 30px 80px -40px rgba(0,0,0,0.30)",
      }}
      role="img"
      aria-label="A live Klikr session — host creates a deck, audience joins, votes flow in, and live results appear."
    >
      {/* Nav strip — always visible */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "28px 32px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: ACCENT,
              boxShadow: `0 0 0 4px ${ACCENT}2e`,
            }}
          />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}>Klikr</span>
        </div>
        {pill("Live session", true)}
      </div>

      {/* Beats container — stacked, CSS-animated opacity */}
      <div style={{ position: "absolute", inset: 0, padding: "72px 32px 28px" }}>
        <BeatDashboard />
        <BeatJoinCode />
        <BeatPoll />
        <BeatResults />
      </div>
    </div>
  );
}
