import { Triangle, Diamond, Circle, Square, type LucideIcon } from "lucide-react";

// Answer tiles for game-show quiz mode — shared by the big screen and phones.
// Shapes double as a colour-blind-safe cue; colours are Klikr's own palette
// (Klikr blue + violet / teal / coral), each ≥3.9:1 against white bold text.
export type QuizTile = {
  key: "blue" | "violet" | "teal" | "coral";
  label: string;
  Icon: LucideIcon;
  /** Base colour (solid fills, icons). */
  color: string;
  /** Deeper end of the tile gradient. */
  deep: string;
  /** Soft glow for shadows / rings. */
  glow: string;
};

export const QUIZ_TILES: readonly QuizTile[] = [
  { key: "blue", label: "Triangle", Icon: Triangle, color: "#0071E3", deep: "#005BBF", glow: "rgba(0,113,227,0.45)" },
  { key: "violet", label: "Diamond", Icon: Diamond, color: "#7C5CFF", deep: "#5B45C9", glow: "rgba(124,92,255,0.45)" },
  { key: "teal", label: "Circle", Icon: Circle, color: "#0E8F8F", deep: "#0B7F80", glow: "rgba(14,143,143,0.45)" },
  { key: "coral", label: "Square", Icon: Square, color: "#E5484D", deep: "#C9373C", glow: "rgba(229,72,77,0.45)" },
];

export function tileFor(index: number): QuizTile {
  return QUIZ_TILES[((index % QUIZ_TILES.length) + QUIZ_TILES.length) % QUIZ_TILES.length];
}

export function tileGradient(tile: QuizTile): string {
  return `linear-gradient(145deg, ${tile.color} 0%, ${tile.deep} 100%)`;
}

/** Speed-scored points, mirroring score_quiz_slide (migration 0024):
 *  correct → 500 + up to 500 speed bonus; wrong / skipped → 0. */
export function quizPoints(correct: boolean, elapsedMs: number, limitS: number): number {
  if (!correct) return 0;
  const limitMs = Math.max(1, limitS) * 1000;
  const t = Math.max(0, Math.min(limitMs, elapsedMs));
  return 500 + Math.max(0, Math.round(500 * (1 - t / limitMs)));
}
