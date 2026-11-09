"use client";

import { useMemo } from "react";
import { serverNow, useServerClockVersion } from "@/lib/serverClock";
import { useSecondsLeft } from "@/lib/useQuizPhase";
import { useHydrated } from "@/lib/useHydrated";

// Countdown pieces shared by the phone and the big screen. Both are leaves:
// the bar is a single CSS animation (no JS ticking), the readout re-renders
// once a second.

/** Seconds-left readout; ticks once a second (leaf component). */
export function TimeLeftPill({ closeAt, bare = false }: { closeAt: number; bare?: boolean }) {
  const secs = useSecondsLeft(closeAt);
  const urgent = secs <= 5;
  if (bare) {
    return (
      <span
        suppressHydrationWarning
        className={`mono text-lg font-bold ${urgent ? "urgent-pulse" : ""}`}
        style={{ color: urgent ? "#ef4444" : "var(--fg)", fontVariantNumeric: "tabular-nums" }}
      >
        {secs}s
      </span>
    );
  }
  return (
    <span
      suppressHydrationWarning
      key={urgent ? `u${secs}` : "calm"}
      className={`mono inline-flex min-w-[3.25rem] justify-center rounded-full px-3 py-1 text-sm font-bold ${urgent ? "urgent-pulse" : ""}`}
      style={{
        background: urgent ? "rgba(239,68,68,0.12)" : "rgba(127,127,127,0.10)",
        color: urgent ? "#ef4444" : "var(--fg)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {secs}s
    </span>
  );
}

/** Draining time bar. One CSS animation for the whole question: no JS ticks. */
export function TimeBar({ closeAt, limit }: { closeAt: number; limit: number }) {
  const totalMs = Math.max(1, limit) * 1000;
  const elapsed = useElapsed(closeAt, totalMs);
  return (
    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
      {elapsed == null ? (
        <div className="h-full rounded-full" style={{ background: "#22c55e" }} />
      ) : (
        <div
          className="time-bar h-full rounded-full"
          style={{ animationDuration: `${totalMs}ms`, animationDelay: `-${elapsed}ms` }}
        />
      )}
    </div>
  );
}

/**
 * How far into a `totalMs` window ending at `closeAt` we are, on the server
 * clock — for anchoring CSS animations with a negative delay. Null until
 * hydrated (never computed on the server), re-anchored if the clock sync
 * lands after mount.
 */
export function useElapsed(closeAt: number, totalMs: number): number | null {
  const hydrated = useHydrated();
  const clockV = useServerClockVersion();
  return useMemo(
    () => (hydrated ? Math.max(0, Math.min(totalMs, totalMs - (closeAt - serverNow()))) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closeAt, totalMs, clockV, hydrated],
  );
}
