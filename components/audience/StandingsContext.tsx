"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Standing } from "@/lib/types";
import { getStanding } from "@/app/play/[code]/actions";

// One source of truth for "my score / rank / the top board" on the player's
// phone. Before this, the score pill, the quiz reveal, the staged leaderboard
// and the final screen each fetched the whole roster on their own (with retry
// bursts) — ~10 requests per phone per question, each O(players) rows. Now:
// one small get_standing call per scored_rev change, de-duplicated, shared.

// If the scored_rev signal never moves after a question closes (nobody got it
// right, or migration 0026 isn't applied), stop waiting after this long.
const SETTLE_FALLBACK_MS = 3200;
// Extra fetches after close, in case the realtime scored_rev event is late.
const CLOSE_RETRY_MS = [1200, SETTLE_FALLBACK_MS];

type StandingsState = {
  /** Latest standing from the server (null until the first fetch lands). */
  standing: Standing | null;
  /** My standing as of the start of the current slide — for "↑ from #N". */
  baseline: Standing | null;
  /** True once the current question's scores have landed (or we gave up waiting). */
  settled: boolean;
  /** Call when the current quiz question's answer window closes. */
  markRoundClosed: () => void;
};

const StandingsContext = createContext<StandingsState | null>(null);

export function StandingsProvider({
  presentationId,
  participantId,
  participantToken,
  scoredRev,
  slideId,
  top = 5,
  enabled = true,
  children,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
  scoredRev: number;
  slideId: string | null;
  top?: number;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const [standing, setStanding] = useState<Standing | null>(null);
  const [baseline, setBaseline] = useState<Standing | null>(null);
  const [settled, setSettled] = useState(false);

  const inflightRef = useRef(false);
  const againRef = useRef(false);
  const aliveRef = useRef(true);
  const revAtSlideStartRef = useRef(scoredRev);
  const closedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const argsRef = useRef({ presentationId, participantId, participantToken, top });
  useEffect(() => {
    argsRef.current = { presentationId, participantId, participantToken, top };
  }, [presentationId, participantId, participantToken, top]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const fetchNow = useCallback(async () => {
    if (inflightRef.current) {
      // Coalesce: one more fetch after the in-flight one, however many asks.
      againRef.current = true;
      return;
    }
    inflightRef.current = true;
    try {
      do {
        againRef.current = false;
        let s: Standing;
        try {
          s = await getStanding(argsRef.current);
        } catch {
          break; // keep the last known standing rather than blanking
        }
        if (!aliveRef.current) return;
        setStanding(s);
        if (s.scoredRev <= revAtSlideStartRef.current) setBaseline(s);
        if (closedRef.current && s.scoredRev > revAtSlideStartRef.current) setSettled(true);
      } while (againRef.current);
    } finally {
      inflightRef.current = false;
    }
  }, []);

  // New slide: snapshot the scoring revision this round starts from.
  useEffect(() => {
    revAtSlideStartRef.current = scoredRev;
    closedRef.current = false;
    setSettled(false);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // scoredRev is deliberately read only at slide change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId]);

  // Refetch on slide change and whenever scoring moved anyone's score.
  useEffect(() => {
    if (!enabled) return;
    void fetchNow();
  }, [enabled, scoredRev, slideId, presentationId, participantId, participantToken, fetchNow]);

  const markRoundClosed = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = CLOSE_RETRY_MS.map((ms) =>
      setTimeout(() => {
        void fetchNow();
        if (ms === SETTLE_FALLBACK_MS && aliveRef.current) setSettled(true);
      }, ms),
    );
  }, [fetchNow]);

  const value = useMemo(
    () => ({ standing, baseline, settled, markRoundClosed }),
    [standing, baseline, settled, markRoundClosed],
  );
  return <StandingsContext.Provider value={value}>{children}</StandingsContext.Provider>;
}

export function useStandings(): StandingsState {
  const ctx = useContext(StandingsContext);
  if (!ctx) throw new Error("useStandings must be used inside StandingsProvider");
  return ctx;
}

/** For components that may render outside a quiz deck (no provider). */
export function useStandingsOptional(): StandingsState | null {
  return useContext(StandingsContext);
}

/** Static provider for previews and tests (no fetching). */
export function StandingsStaticProvider({
  value,
  children,
}: {
  value: { standing: Standing | null; baseline: Standing | null; settled: boolean };
  children: React.ReactNode;
}) {
  const ctx = useMemo(() => ({ ...value, markRoundClosed: () => {} }), [value]);
  return <StandingsContext.Provider value={ctx}>{children}</StandingsContext.Provider>;
}
