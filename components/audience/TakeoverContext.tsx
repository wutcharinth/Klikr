"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Quiz reveals no longer carry rank numbers: rank depends on the server
// scoring this round, which lands a beat after the reveal starts. The variants
// read it live from StandingsContext and pop it in when it arrives.
export type TakeoverPayload =
  | { kind: "quiz-correct"; points: number; streak?: number }
  | { kind: "quiz-wrong"; correctText?: string }
  | { kind: "quiz-skipped"; correctText?: string }
  | { kind: "submitted"; ordinal: number; total: number }
  | { kind: "toast"; text: string };

type TakeoverState = {
  payload: TakeoverPayload | null;
  trigger: (p: TakeoverPayload) => void;
  dismiss: () => void;
};

const TakeoverContext = createContext<TakeoverState | null>(null);

const FULL_DURATION_MS = 1800;
// Quiz reveals hold longer: points count up, then the rank chip lands.
const QUIZ_DURATION_MS = 3200;
const TOAST_DURATION_MS = 1000;

function durationFor(p: TakeoverPayload): number {
  if (p.kind === "toast") return TOAST_DURATION_MS;
  if (p.kind === "quiz-correct" || p.kind === "quiz-wrong" || p.kind === "quiz-skipped") return QUIZ_DURATION_MS;
  return FULL_DURATION_MS;
}

export function TakeoverProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<TakeoverPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPayload(null);
  }, []);

  const trigger = useCallback((next: TakeoverPayload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPayload(next);
    const duration = durationFor(next);
    timerRef.current = setTimeout(() => {
      setPayload(null);
      timerRef.current = null;
    }, duration);
  }, []);

  // Esc dismisses early.
  useEffect(() => {
    if (!payload) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payload, dismiss]);

  const value = useMemo(() => ({ payload, trigger, dismiss }), [payload, trigger, dismiss]);
  return <TakeoverContext.Provider value={value}>{children}</TakeoverContext.Provider>;
}

export function useTakeover(): TakeoverState {
  const ctx = useContext(TakeoverContext);
  if (!ctx) throw new Error("useTakeover must be used inside TakeoverProvider");
  return ctx;
}

/** Dismisses any active takeover when the slide id changes. Mount inside the
 *  provider, fed the current slide id; useful so a 1.8s "submitted" overlay
 *  from the previous slide doesn't bleed onto the next one when the host
 *  advances quickly. */
export function TakeoverSlideWatcher({ slideId }: { slideId: string | null | undefined }) {
  const { dismiss } = useTakeover();
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    dismiss();
  }, [slideId, dismiss]);
  return null;
}
