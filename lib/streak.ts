"use client";

// Display-only quiz answer streak, scoped per presentation. Backed by
// localStorage so it survives the per-slide remount of the quiz components.
// No bearing on scoring — purely for the "🔥 N in a row!" reveal flourish.

const KEY = (presentationId: string) => `klikr:streak:${presentationId}`;

export function getStreak(presentationId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(KEY(presentationId));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Increment and return the new streak value. */
export function bumpStreak(presentationId: string): number {
  if (typeof window === "undefined") return 0;
  const next = getStreak(presentationId) + 1;
  window.localStorage.setItem(KEY(presentationId), String(next));
  return next;
}

export function resetStreak(presentationId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY(presentationId));
}
