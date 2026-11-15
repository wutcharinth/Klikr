// "Knockout" reveal for game-mode quiz questions, shared by the big screen
// and the phones so they stay in step:
//   0 ms        time's up — the vote split fills in on every tile
//   START       wrong answers are knocked out one by one, least-picked first
//   correctAt   the last tile standing lights up as the right answer;
//               phones flip to Correct / Not quite at the same moment.

export const KNOCKOUT_START_MS = 1500;
export const KNOCKOUT_STEP_MS = 650;
const SETTLE_MS = 250;

/** Wrong options in knockout order: fewest votes first (ties: later tile first). */
export function knockoutOrder(counts: number[], correctIndex: number): number[] {
  return counts
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i !== correctIndex)
    .sort((a, b) => a.c - b.c || b.i - a.i)
    .map(({ i }) => i);
}

/** Ms after time's up when the correct answer is shown, for `optionCount` tiles. */
export function correctRevealMs(optionCount: number): number {
  const wrong = Math.max(0, Math.min(4, optionCount) - 1);
  return KNOCKOUT_START_MS + wrong * KNOCKOUT_STEP_MS + SETTLE_MS;
}
