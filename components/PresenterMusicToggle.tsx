"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const MUSIC_SRC = "/audio/quiz-pulse.mp3";
const PREF_KEY = "klikr-presenter-music";

export function PresenterMusicToggle({ active = true }: { active?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PREF_KEY) : null;
    setEnabled(stored === "on");
    setHydrated(true);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hydrated) return;
    if (enabled && active) {
      a.volume = 0.3;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      a.pause();
    }
  }, [enabled, active, hydrated]);

  const toggle = () => {
    setEnabled((v) => {
      const next = !v;
      if (typeof window !== "undefined") localStorage.setItem(PREF_KEY, next ? "on" : "off");
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title={enabled ? "Mute music" : "Play music"}
        aria-label={enabled ? "Mute music" : "Play music"}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{
          background: enabled ? "rgba(0,113,227,0.12)" : "transparent",
          border: "1px solid var(--line)",
          color: enabled ? "var(--blue)" : "var(--muted)",
        }}
      >
        {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      </button>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
    </>
  );
}
