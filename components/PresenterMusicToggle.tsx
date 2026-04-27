"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, SkipForward } from "lucide-react";

const TRACKS = [
  { label: "Pulse", src: "/audio/quiz-pulse.mp3" },
  { label: "Pulse alt", src: "/audio/quiz-pulse-alt.mp3" },
];
const PREF_KEY = "klikr-presenter-music";
const TRACK_KEY = "klikr-presenter-music-track";

export function PresenterMusicToggle({ active = true }: { active?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(localStorage.getItem(PREF_KEY) === "on");
    const stored = parseInt(localStorage.getItem(TRACK_KEY) ?? "0", 10);
    if (!Number.isNaN(stored) && stored >= 0 && stored < TRACKS.length) setTrackIdx(stored);
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
  }, [enabled, active, hydrated, trackIdx]);

  const toggle = () => {
    setEnabled((v) => {
      const next = !v;
      if (typeof window !== "undefined") localStorage.setItem(PREF_KEY, next ? "on" : "off");
      return next;
    });
  };

  const nextTrack = () => {
    setTrackIdx((i) => {
      const next = (i + 1) % TRACKS.length;
      if (typeof window !== "undefined") localStorage.setItem(TRACK_KEY, String(next));
      return next;
    });
  };

  const track = TRACKS[trackIdx];

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
      <button
        type="button"
        onClick={nextTrack}
        title={`Change music (now: ${track.label})`}
        aria-label="Change music track"
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{
          background: "transparent",
          border: "1px solid var(--line)",
          color: enabled ? "var(--blue)" : "var(--muted)",
        }}
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>
      <audio ref={audioRef} src={track.src} loop preload="auto" />
    </>
  );
}
