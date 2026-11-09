"use client";

import { useEffect, useSyncExternalStore } from "react";

// Quiz timing is anchored to server timestamps (current_slide_started_at), but
// phones' own clocks drift by seconds. Estimate the offset between this
// device and the server (NTP-style: keep the sample with the smallest round
// trip, assume the server stamped it halfway through) and expose serverNow().

let offsetMs = 0;
let bestRttMs = Number.POSITIVE_INFINITY;
let lastSyncAt = 0;
let version = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function serverNow(): number {
  return Date.now() + offsetMs;
}

function adopt(serverMs: number, sentAt: number, receivedAt: number) {
  const rtt = Math.max(0, receivedAt - sentAt);
  // Older samples lose to newer ones after a while (devices sleep, NTP steps).
  const stale = Date.now() - lastSyncAt > 5 * 60_000;
  if (rtt > bestRttMs && !stale) return;
  bestRttMs = rtt;
  lastSyncAt = Date.now();
  const next = serverMs + rtt / 2 - receivedAt;
  if (Math.abs(next - offsetMs) < 15) return; // not worth a re-render
  offsetMs = next;
  version += 1;
  listeners.forEach((l) => l());
}

async function sampleOnce() {
  const sentAt = Date.now();
  const res = await fetch("/api/time", { cache: "no-store" });
  const receivedAt = Date.now();
  if (!res.ok) return;
  const body = (await res.json()) as { now?: number };
  if (typeof body.now === "number") adopt(body.now, sentAt, receivedAt);
}

let roundDoneAt = 0;
const FRESH_MS = 2 * 60_000;

/** Take a few samples (sequentially, so they don't queue behind each other).
 *  No-op if a sync finished recently, unless `force`. */
export function syncServerClock({ samples = 3, force = false }: { samples?: number; force?: boolean } = {}): Promise<void> {
  if (inflight) return inflight;
  if (!force && roundDoneAt && Date.now() - roundDoneAt < FRESH_MS) return Promise.resolve();
  inflight = (async () => {
    // A fresh sync round re-evaluates from scratch.
    bestRttMs = Number.POSITIVE_INFINITY;
    for (let i = 0; i < samples; i++) {
      try {
        await sampleOnce();
      } catch {
        /* offline — keep the previous offset */
      }
    }
  })().finally(() => {
    inflight = null;
    roundDoneAt = Date.now();
  });
  return inflight;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Sync once on mount and whenever the tab becomes visible again (phones sleep
 * between questions). Returns a version number that changes when the offset
 * moves, so timing hooks can re-schedule.
 */
export function useServerClock(): number {
  useEffect(() => {
    void syncServerClock();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncServerClock({ force: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

/** Re-render when the clock offset changes, without triggering a sync. */
export function useServerClockVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
