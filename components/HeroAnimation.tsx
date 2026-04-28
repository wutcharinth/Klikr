import React from "react";

/*
 * HeroAnimationCSS — lightweight replacement for the Remotion-based hero.
 * Designed to look premium, responsive, and avoid overflow on small viewports.
 *
 * Shows 4 beats in a 12s CSS-animated loop.
 */

/* ── helper ─────────────────────────────────────────── */
const Pill = ({ label, dot = false }: { label: string; dot?: boolean }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 border border-blue-500/20 text-blue-500 text-xs font-medium tracking-wide">
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
    {label}
  </span>
);

/* ── beats ──────────────────────────────────────────── */

function BeatDashboard() {
  return (
    <div className="hero-beat hero-beat-1 hero-beat-initial flex flex-col justify-center h-full">
      <div className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-4">
        Dashboard
      </div>
      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mb-6 sm:mb-8">
        Your sessions
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.5)]">
          <div className="text-sm sm:text-base font-semibold text-zinc-100">New session</div>
          <div className="mt-1 text-xs sm:text-sm text-blue-200/60">Empty deck, name it later</div>
        </div>
        <div className="hidden sm:block p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-sm sm:text-base font-semibold text-zinc-100">Templates</div>
          <div className="mt-1 text-xs sm:text-sm text-zinc-500">Polls, quizzes, icebreakers</div>
        </div>
      </div>
    </div>
  );
}

function BeatJoinCode() {
  return (
    <div className="hero-beat hero-beat-2 flex flex-col items-center justify-center h-full">
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3">
        Audience joins at
      </span>
      <span className="text-sm sm:text-base text-zinc-400 mb-1">klikrapp.com /</span>
      <div className="text-5xl sm:text-7xl font-extrabold tracking-widest text-blue-500 tabular-nums leading-none mb-6">
        JX9PQ
      </div>
      <div className="flex gap-2">
        <Pill label="5 joined" dot />
      </div>
    </div>
  );
}

function BeatPoll() {
  const options = ["Ship faster", "Polish UX", "New market"];
  return (
    <div className="hero-beat hero-beat-3 flex flex-col h-full justify-center">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3">
          Live poll
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 leading-snug">
          Which idea should we prioritize?
        </div>
      </div>
      <div className="grid gap-2 sm:gap-3 max-w-sm w-full mx-auto">
        {options.map((label, i) => (
          <div
            key={label}
            className={`hero-option hero-option-${i + 1} p-3 sm:p-4 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
              i === 0
                ? "bg-blue-500/15 border border-blue-500/40 text-blue-400"
                : "bg-white/5 border border-white/10 text-zinc-300"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function BeatResults() {
  const bars = [
    { label: "Ship faster", pct: 56, highlight: true },
    { label: "Polish UX", pct: 28, highlight: false },
    { label: "New market", pct: 16, highlight: false },
  ];
  return (
    <div className="hero-beat hero-beat-4 flex flex-col h-full justify-center">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">
          Live results
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:gap-4 max-w-sm w-full mx-auto">
        {bars.map((b, i) => (
          <div key={b.label} className="grid grid-cols-[1fr_48px] sm:grid-cols-[1fr_60px] gap-3 items-center">
            <div className="relative h-10 sm:h-12 rounded-xl bg-white/5 overflow-hidden">
              <div
                className={`hero-bar hero-bar-${i + 1} absolute inset-0 rounded-xl origin-left`}
                style={{
                  background: b.highlight
                    ? "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.6))"
                    : "rgba(255,255,255,0.08)",
                }}
              />
              <span className={`relative flex items-center h-full px-4 text-xs sm:text-sm font-semibold ${b.highlight ? "text-blue-400" : "text-zinc-200"}`}>
                {b.label}
              </span>
            </div>
            <span className={`text-lg sm:text-xl font-bold tracking-tight text-right tabular-nums ${b.highlight ? "text-blue-400" : "text-zinc-200"}`}>
              {b.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main export ─────────────────────────────────────── */

export function HeroAnimationCSS({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative w-full aspect-video min-h-[300px] overflow-hidden rounded-2xl sm:rounded-3xl bg-zinc-950 border border-white/10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)] ${className}`}
      role="img"
      aria-label="A live Klikr session — host creates a deck, audience joins, votes flow in, and live results appear."
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Nav strip — always visible */}
      <div className="absolute top-0 left-0 right-0 p-5 sm:p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]" />
          <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">Klikr</span>
        </div>
        <Pill label="Live session" dot />
      </div>

      {/* Beats container — stacked, CSS-animated opacity */}
      <div className="absolute inset-0 pt-16 px-6 pb-6 sm:px-10 sm:pb-10">
        <BeatDashboard />
        <BeatJoinCode />
        <BeatPoll />
        <BeatResults />
      </div>
    </div>
  );
}
