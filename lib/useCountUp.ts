"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Tween a number toward `target` with requestAnimationFrame. The first value
 * is `from` (default: target, i.e. no animation on mount); later changes
 * animate from whatever is currently displayed. Reduced-motion users get the
 * final value immediately. Only the component using the hook re-renders.
 */
export function useCountUp(
  target: number,
  { duration = 900, from, delay = 0 }: { duration?: number; from?: number; delay?: number } = {},
): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(from ?? target);
  const valueRef = useRef(value);

  useEffect(() => {
    if (reduced || duration <= 0) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const start = valueRef.current;
    if (start === target) return;
    let raf = 0;
    let t0 = 0;
    const timer = setTimeout(() => {
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / duration);
        const v = Math.round(start + (target - start) * easeOutCubic(p));
        valueRef.current = v;
        setValue(v);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, reduced]);

  return value;
}
