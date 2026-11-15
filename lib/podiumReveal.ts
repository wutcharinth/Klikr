// Shared timeline for the end-of-session podium reveal. The big screen plays
// it stage by stage; phones hold a "watch the big screen" suspense screen for
// the same length so nobody's own result spoils the reveal.

export type RevealStage = "drumroll" | "third" | "second" | "tease" | "first";

export const REVEAL_MS: Record<RevealStage, number> = {
  drumroll: 3000,
  third: 2600,
  second: 2600,
  tease: 2800,
  first: 3400,
};

/** Stages to play for a session with `players` ranked players. */
export function revealStages(players: number): RevealStage[] {
  if (players <= 0) return [];
  const stages: RevealStage[] = ["drumroll"];
  if (players >= 3) stages.push("third");
  if (players >= 2) stages.push("second");
  stages.push("tease", "first");
  return stages;
}

/** How long until the champion is on screen — when phones reveal too. */
export function msUntilChampion(players: number): number {
  return revealStages(players)
    .filter((s) => s !== "first")
    .reduce((sum, s) => sum + REVEAL_MS[s], 0);
}
