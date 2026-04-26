"use client";

import { useEffect, useRef, useState } from "react";
import { Triangle, Diamond, Circle, Square, Volume2, VolumeX } from "lucide-react";
import type { Slide, ResponseRow, QuizConfig } from "@/lib/types";

const MUSIC_SRC = "/audio/quiz-pulse.mp3";
const MUSIC_PREF_KEY = "klikr-quiz-music";

const TILES = [
  { color: "#E21B3C", Icon: Triangle, label: "Triangle" },
  { color: "#1368CE", Icon: Diamond, label: "Diamond" },
  { color: "#FFA602", Icon: Circle, label: "Circle" },
  { color: "#26890C", Icon: Square, label: "Square" },
];

export function KahootPresenterView({
  slide,
  responses,
  startedAt,
}: {
  slide: Slide;
  responses: ResponseRow[];
  startedAt: string | null;
}) {
  const cfg = slide.config as QuizConfig;
  const opts = cfg.options.slice(0, 4);
  const limit = cfg.time_limit_s ?? 20;

  const start = startedAt ? new Date(startedAt).getTime() : Date.now();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, (now - start) / 1000);
  const remaining = Math.max(0, limit - elapsed);
  const progress = Math.min(1, elapsed / limit);
  const expired = remaining <= 0;
  const ringColor = remaining > limit / 2 ? "#26890C" : remaining > limit / 4 ? "#FFA602" : "#E21B3C";

  const counts = opts.map((_, i) => responses.filter((r) => r.value_index === i).length);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider muted-text">Quiz</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{slide.question}</h2>
        </div>
        <div className="flex items-center gap-3">
          <MusicToggle active={!expired} />
          <TimerRing remaining={remaining} progress={progress} color={ringColor} expired={expired} />
        </div>
      </div>

      {slide.image_url && (
        <img src={slide.image_url} alt="" className="max-h-72 w-full rounded-xl object-cover" style={{ border: "1px solid var(--line)" }} />
      )}

      <div className="grid grid-cols-2 gap-3">
        {opts.map((opt, i) => {
          const isCorrect = expired && cfg.correct_index === i;
          const isWrong = expired && cfg.correct_index !== i;
          const tile = TILES[i];
          return (
            <div
              key={i}
              className="relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white transition-all"
              style={{
                background: tile.color,
                opacity: isWrong ? 0.4 : 1,
                transform: isCorrect ? "scale(1.02)" : "scale(1)",
                boxShadow: isCorrect ? "0 0 0 4px rgba(255,255,255,0.6)" : "none",
              }}
            >
              <tile.Icon className="h-8 w-8 flex-none" />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold">{opt}</p>
                <p className="mt-1 text-xs opacity-80">{counts[i]} vote{counts[i] === 1 ? "" : "s"}</p>
              </div>
              {expired && isCorrect && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">Correct</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm muted-text">
        <span>{total} {total === 1 ? "answer" : "answers"} in</span>
        {expired && <span>Time's up — {counts[cfg.correct_index]} got it right</span>}
      </div>
    </div>
  );
}

function MusicToggle({ active }: { active: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(MUSIC_PREF_KEY) : null;
    setEnabled(stored !== "off");
    setHydrated(true);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hydrated) return;
    if (enabled && active) {
      a.volume = 0.35;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      a.pause();
      if (!active) a.currentTime = 0;
    }
  }, [enabled, active, hydrated]);

  const toggle = () => {
    setEnabled((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        localStorage.setItem(MUSIC_PREF_KEY, next ? "on" : "off");
      }
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title={enabled ? "Mute quiz music" : "Play quiz music"}
        aria-label={enabled ? "Mute quiz music" : "Play quiz music"}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
        style={{
          background: enabled ? "rgba(0,113,227,0.12)" : "transparent",
          border: "1px solid var(--line)",
          color: enabled ? "var(--blue)" : "var(--muted)",
        }}
      >
        {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <audio ref={audioRef} src={MUSIC_SRC} loop preload="auto" />
    </>
  );
}

function TimerRing({ remaining, progress, color, expired }: { remaining: number; progress: number; color: string; expired: boolean }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={48} cy={48} r={r} fill="none" stroke="var(--line)" strokeWidth={8} />
      <circle
        cx={48}
        cy={48}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * progress}
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.5s ease" }}
      />
      <text x={48} y={56} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)">
        {expired ? "✓" : Math.ceil(remaining)}
      </text>
    </svg>
  );
}
