"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State fed by high-frequency events (realtime inserts). Updates are queued
 * and applied together once per animation frame, so a burst of 100 answers in
 * a second costs at most ~60 renders (usually far fewer) instead of 100.
 *
 * `enqueue(fn)` queues an updater; all queued updaters run in order inside a
 * single setState on the next frame. `set(value)` replaces immediately and
 * drops anything queued (use for full refetches).
 */
export function useBufferedState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const queueRef = useRef<Array<(prev: T) => T>>([]);
  const frameRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    frameRef.current = null;
    const queue = queueRef.current;
    if (queue.length === 0) return;
    queueRef.current = [];
    setState((prev) => queue.reduce((acc, fn) => fn(acc), prev));
  }, []);

  const enqueue = useCallback(
    (fn: (prev: T) => T) => {
      queueRef.current.push(fn);
      if (frameRef.current == null) {
        // rAF pauses in background tabs; fall back to a timer there so the
        // queue can't grow unbounded while the projector tab is hidden.
        frameRef.current =
          typeof document !== "undefined" && document.visibilityState === "hidden"
            ? (setTimeout(flush, 250) as unknown as number)
            : requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  const set = useCallback((value: T) => {
    queueRef.current = [];
    setState(value);
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        clearTimeout(frameRef.current);
      }
    },
    [],
  );

  return [state, enqueue, set] as const;
}
