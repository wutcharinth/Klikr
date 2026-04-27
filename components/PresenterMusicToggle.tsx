"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, SkipForward } from "lucide-react";

const TRACKS = [
  { label: "Pulse", src: "/audio/quiz-pulse.mp3" },
  { label: "Heartbeat", src: "/audio/quiz-pulse-alt.mp3" },
  { label: "Game Show", src: "/audio/prize-button.mp3" },
  { label: "Showtime", src: "/audio/prize-button-2.mp3" },
  { label: "Big Round", src: "/audio/prize-round.mp3" },
  { label: "Final Round", src: "/audio/prize-round-2.mp3" },
  { label: "Wheel Spin", src: "/audio/prize-wheel-bounce.mp3" },
  { label: "Bounce Back", src: "/audio/prize-wheel-bounce-2.mp3" },
];
const PREF_KEY = "klikr-presenter-music";

export function PresenterMusicToggle({ active = true }: { active?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  // Randomize the starting track on every mount so each new present session
  // begins with different music. The skip button still cycles deterministically
  // from there.
  const [trackIdx, setTrackIdx] = useState(() => Math.floor(Math.random() * TRACKS.length));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(localStorage.getItem(PREF_KEY) === "on");
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
    setTrackIdx((i) => (i + 1) % TRACKS.length);
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
        title={`Skip — now playing ${track.label}`}
        aria-label="Skip to next track"
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{
          background: "transparent",
          border: "1px solid var(--line)",
          color: enabled ? "var(--blue)" : "var(--muted)",
        }}
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>
      <select
        value={trackIdx}
        onChange={(e) => setTrackIdx(parseInt(e.target.value, 10))}
        title="Choose a track"
        aria-label="Choose music track"
        className="h-8 rounded-full px-2 text-[11px] uppercase tracking-[0.14em] transition-colors"
        style={{
          background: "transparent",
          border: "1px solid var(--line)",
          color: enabled ? "var(--blue)" : "var(--muted)",
        }}
      >
        {TRACKS.map((t, i) => (
          <option key={t.src} value={i}>
            {t.label}
          </option>
        ))}
      </select>
      <audio ref={audioRef} src={track.src} loop preload="auto" />
    </>
  );
}
