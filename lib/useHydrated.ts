"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Use it to gate
 * anything computed from the current time (timer offsets, seconds left):
 * React doesn't patch attribute mismatches after hydration, so a value
 * computed on the server would otherwise stick.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
