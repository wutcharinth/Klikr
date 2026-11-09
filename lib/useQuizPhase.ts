"use client";

import { useEffect, useState } from "react";
import { serverNow, useServerClock } from "./serverClock";
import { QUIZ_INTRO_MS } from "./liveTiming";

export type QuizPhase = "intro" | "open" | "closed";

export type QuizTiming = {
  phase: QuizPhase;
  /** Server-clock ms when answers unlock (end of the intro). */
  openAt: number;
  /** Server-clock ms when the answer window closes. */
  closeAt: number;
  /** Length of the intro actually shown (0 if we joined after it ended). */
  introMs: number;
};

function phaseAt(now: number, openAt: number, closeAt: number): QuizPhase {
  if (now < openAt) return "intro";
  if (now < closeAt) return "open";
  return "closed";
}

/**
 * Phase of a timed quiz question, driven by one-shot timeouts at the phase
 * boundaries — NOT a per-tick interval — so the component using it only
 * re-renders when the phase changes. Countdown visuals live in leaf
 * components (or pure CSS animations) that own their own ticking.
 *
 * `startedAtIso` is presentations.current_slide_started_at, i.e. when answers
 * open (it sits in the future during the intro). `forceClosed` lets the host
 * end a question early.
 */
export function useQuizPhase(
  startedAtIso: string | number | null,
  limitS: number,
  { forceClosed = false }: { forceClosed?: boolean } = {},
): QuizTiming {
  const clockVersion = useServerClock();
  const [mountedAt] = useState(() => serverNow());
  const openAt =
    startedAtIso == null
      ? mountedAt
      : typeof startedAtIso === "number"
        ? startedAtIso
        : new Date(startedAtIso).getTime();
  const closeAt = openAt + Math.max(1, limitS) * 1000;
  const [phase, setPhase] = useState<QuizPhase>(() => phaseAt(serverNow(), openAt, closeAt));
  // Intro length as seen by this client: clamp so a late joiner doesn't see a
  // full-length bar for an intro that's nearly over.
  const introMs = Math.max(0, Math.min(QUIZ_INTRO_MS, openAt - mountedAt));

  useEffect(() => {
    if (forceClosed) {
      setPhase("closed");
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const now = serverNow();
      const p = phaseAt(now, openAt, closeAt);
      setPhase(p);
      const nextBoundary = p === "intro" ? openAt : p === "open" ? closeAt : null;
      if (nextBoundary != null) {
        // +5ms so we land just past the boundary, not just before it.
        timer = setTimeout(tick, Math.max(0, nextBoundary - now) + 5);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [openAt, closeAt, forceClosed, clockVersion]);

  return { phase: forceClosed ? "closed" : phase, openAt, closeAt, introMs };
}

/** Whole seconds left until `deadline` (server clock), ticking once a second. */
export function useSecondsLeft(deadline: number, active = true): number {
  const calc = () => Math.max(0, Math.ceil((deadline - serverNow()) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const msLeft = deadline - serverNow();
      setLeft(Math.max(0, Math.ceil(msLeft / 1000)));
      if (msLeft <= 0) return;
      // Wake right after the next whole-second boundary.
      timer = setTimeout(tick, (msLeft % 1000 || 1000) + 10);
    };
    tick();
    return () => clearTimeout(timer);
  }, [deadline, active]);
  return left;
}
