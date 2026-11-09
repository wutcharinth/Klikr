"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX, SkipForward } from "lucide-react";
import { unlock } from "@/lib/audio";

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

type MusicState = {
  enabled: boolean;
  trackIdx: number;
  toggle: () => void;
  setTrackIdx: (i: number) => void;
};

const MusicContext = createContext<MusicState | null>(null);

// One <audio> element for the whole presenter session, mounted above the
// lobby / live / closed switch so the track doesn't restart (or download
// again) when the host presses Start. preload="none": nothing is fetched
// until music is actually switched on — the tracks are 3–6 MB each.
export function PresenterMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  // Randomize the starting track on every mount so each new present session
  // begins with different music. The skip button still cycles from there.
  const [trackIdx, setTrackIdx] = useState(() => Math.floor(Math.random() * TRACKS.length));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(PREF_KEY) === "on");
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hydrated) return;
    if (enabled) {
      a.volume = 0.3;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      a.pause();
    }
  }, [enabled, hydrated, trackIdx]);

  const toggle = useCallback(() => {
    void unlock();
    setEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem(PREF_KEY, next ? "on" : "off");
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(() => ({ enabled, trackIdx, toggle, setTrackIdx }), [enabled, trackIdx, toggle]);
  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio ref={audioRef} src={TRACKS[trackIdx].src} loop preload="none" />
    </MusicContext.Provider>
  );
}

export function PresenterMusicToggle() {
  const ctx = useContext(MusicContext);
  if (!ctx) return null;
  const { enabled, trackIdx, toggle, setTrackIdx } = ctx;
  const track = TRACKS[trackIdx];

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title={enabled ? "Mute music & sound effects" : "Play music & sound effects"}
        aria-label={enabled ? "Mute music" : "Play music"}
        aria-pressed={enabled}
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
        onClick={() => setTrackIdx((trackIdx + 1) % TRACKS.length)}
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
    </>
  );
}
