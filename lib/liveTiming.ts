import type { SlideType } from "./types";

// Quiz slides open with a short "get ready" beat: the question is shown on its
// own, then the answer window opens. The window's start is stored as
// presentations.current_slide_started_at (set slightly in the future), so the
// server measures response time from when answers actually unlocked.
export const QUIZ_INTRO_MS = 3000;

/** Allow taps this close before the window opens (network + clock jitter). */
export const QUIZ_EARLY_TAP_GRACE_MS = 300;

/** Intro length for a slide of this type. */
export function introMsFor(type: SlideType | string | null | undefined): number {
  return type === "quiz" ? QUIZ_INTRO_MS : 0;
}

/** ISO timestamp to store as current_slide_started_at when showing a slide. */
export function startedAtFor(type: SlideType | string | null | undefined, now = Date.now()): string {
  return new Date(now + introMsFor(type)).toISOString();
}
