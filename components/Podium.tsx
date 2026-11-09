import type { CSSProperties } from "react";

export type PodiumEntry = { id: string; nickname: string; score: number };

// Gold / silver / bronze. Ink colours are chosen for contrast on each fill.
const MEDAL = [
  { fill: "#F5C542", edge: "#D9A21B", ink: "#4A3700" },
  { fill: "#C9D1D9", edge: "#9AA5B1", ink: "#2F363D" },
  { fill: "#D98A4E", edge: "#B5692F", ink: "#FFFFFF" },
];

// Visual order across the stage is 2nd · 1st · 3rd; heights step down from 1st.
const SLOT_ORDER = [1, 0, 2] as const;
const HEIGHT = [1, 0.72, 0.52];
// Reveal order is 3rd → 2nd → 1st (seconds).
const REVEAL_DELAY = [1.0, 0.55, 0.15];

/**
 * Top-3 podium rendered as plain DOM + CSS. The final standings are in the
 * markup from the first paint (correct scores, readable by screen readers, no
 * runtime to download); the rise-in animation is CSS only and is skipped under
 * prefers-reduced-motion.
 */
export function Podium({
  entries,
  size = "stage",
  highlightId,
}: {
  entries: PodiumEntry[];
  /** "stage" for the projector / results page, "compact" for a phone. */
  size?: "stage" | "compact";
  /** Outline this player's column (the audience member viewing it). */
  highlightId?: string;
}) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;
  const compact = size === "compact";

  return (
    <div className={`podium ${compact ? "podium--compact" : ""}`}>
    <ol className="podium-stage" aria-label="Final podium">
      {SLOT_ORDER.map((idx) => {
        const entry = top[idx];
        if (!entry) return null;
        const medal = MEDAL[idx];
        const isMe = entry.id === highlightId;
        const style = {
          "--podium-fill": medal.fill,
          "--podium-edge": medal.edge,
          "--podium-ink": medal.ink,
          "--podium-h": HEIGHT[idx],
          "--podium-delay": `${REVEAL_DELAY[idx]}s`,
        } as CSSProperties;
        return (
          <li
            key={entry.id}
            className={`podium-col ${idx === 0 ? "podium-col--first" : ""} ${isMe ? "podium-col--me" : ""}`}
            style={style}
            aria-label={`${ordinal(idx + 1)} place: ${entry.nickname}, ${entry.score.toLocaleString()} points${isMe ? " (you)" : ""}`}
          >
            <div className="podium-player" aria-hidden>
              {idx === 0 && <Crown />}
              <div className="podium-avatar">{initial(entry.nickname)}</div>
              <p className="podium-name" title={entry.nickname}>
                {entry.nickname}
                {isMe && <span className="podium-you">you</span>}
              </p>
              <p className="podium-score">
                {entry.score.toLocaleString()}
                <span className="podium-pts"> pts</span>
              </p>
            </div>
            <div className="podium-block" aria-hidden>
              <span className="podium-rank">{idx + 1}</span>
            </div>
          </li>
        );
      })}
    </ol>
      {/* A few CSS confetti pieces over the winner. */}
      <div className="podium-confetti" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function initial(name: string): string {
  const ch = Array.from(name.trim())[0];
  return ch ? ch.toUpperCase() : "?";
}

function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : "3rd";
}

function Crown() {
  return (
    <svg className="podium-crown" viewBox="0 0 24 19" aria-hidden>
      <path
        d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"
        fill="#F5C542"
        stroke="#C99700"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
