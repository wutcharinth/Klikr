"use client";

const STORAGE_KEY = "klikr:audio:on";

export function isAudioOn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setAudioOn(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

const CLIPS = {
  submit: "/audio/prize-button.mp3",
  correct: "/audio/quiz-pulse.mp3",
  wrong: null,
} as const;

export function playClip(name: keyof typeof CLIPS) {
  if (!isAudioOn()) return;
  const src = CLIPS[name];
  if (!src) return;
  try {
    const a = new Audio(src);
    a.volume = 0.4;
    void a.play().catch(() => {
      /* autoplay-blocked or asset missing — silent no-op */
    });
  } catch {
    /* SSR or unsupported — ignore */
  }
}

export function vibrate(ms = 50) {
  if (!isAudioOn()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* permission denied — ignore */
    }
  }
}
