"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { tokensFromCss, type RemotionTheme } from "@/remotion/theme/tokens";

// Lazy-load @remotion/player so its runtime never enters the SSR bundle and
// only ships to the routes that actually mount a composition.
const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), {
  ssr: false,
  loading: () => null,
});

type ComponentLike = React.ComponentType<Record<string, unknown>>;

export type RemotionShowcaseProps = {
  /** A Remotion composition component (e.g. HeroProductAnimation). */
  composition: ComponentLike;
  durationInFrames: number;
  fps?: number;
  compositionWidth: number;
  compositionHeight: number;
  /** Static frame poster shown before the player mounts and for reduced-motion users. */
  poster?: string;
  /** Caller-supplied input props for the composition (theme prop is auto-injected). */
  inputProps?: Record<string, unknown>;
  /** Tailwind / inline className for the player surface. */
  className?: string;
  style?: CSSProperties;
  /** Loop, defaults true. */
  loop?: boolean;
  /** ARIA label for the wrapper — describe what the animation depicts. */
  ariaLabel?: string;
  /** Skip the IntersectionObserver gate. Use for above-the-fold instances. */
  eager?: boolean;
  /** Static React node rendered while the Player chunk is loading. */
  placeholder?: React.ReactNode;
};

// Universal wrapper. Enforces:
//  - Lazy mount (next/dynamic ssr:false)
//  - Reduced-motion → static poster, no Player at all
//  - IntersectionObserver: only mounts the Player when 25% visible
//  - Pause on visibilitychange === "hidden"
//  - Theme tokens read from CSS vars at mount and passed to the composition
export function RemotionShowcase({
  composition,
  durationInFrames,
  fps = 30,
  compositionWidth,
  compositionHeight,
  poster,
  inputProps,
  className,
  style,
  loop = true,
  ariaLabel,
  eager = false,
  placeholder,
}: RemotionShowcaseProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(eager);
  const [theme, setTheme] = useState<RemotionTheme | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<{ play: () => void; pause: () => void } | null>(null);
  const setPlayerRef = (p: { play: () => void; pause: () => void } | null) => {
    playerRef.current = p;
    if (p && !playerReady) setPlayerReady(true);
  };

  // prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Theme read from live CSS vars
  useEffect(() => {
    setTheme(tokensFromCss());
  }, []);

  // Mount Player only when scrolled into view
  useEffect(() => {
    if (reduced || eager) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.25) {
            setVisible(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: [0, 0.25, 0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Pause when the tab is backgrounded; resume when it returns.
  useEffect(() => {
    if (reduced) return;
    const onVisibility = () => {
      const player = playerRef.current;
      if (!player) return;
      if (document.visibilityState === "hidden") player.pause();
      else player.play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduced, eager]);

  const mergedInputProps = useMemo(() => {
    return { ...(inputProps ?? {}), theme: theme ?? undefined };
  }, [inputProps, theme]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        ...style,
      }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Poster — visible until the Player is ready, and the only thing
          rendered for reduced-motion users. */}
      {poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: visible && !reduced ? 0 : 1,
            transition: "opacity 250ms ease",
          }}
        />
      ) : null}

      {/* Static placeholder — rendered immediately at SSR so users see content
          while @remotion/player downloads. Fades out once the Player mounts. */}
      {placeholder && !reduced ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: playerReady ? 0 : 1,
            transition: "opacity 300ms ease",
            pointerEvents: "none",
          }}
        >
          {placeholder}
        </div>
      ) : null}

      {!reduced && visible ? (
        <Player
          ref={setPlayerRef as never}
          component={composition}
          inputProps={mergedInputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          loop={loop}
          autoPlay
          controls={false}
          style={{ width: "100%", height: "100%" }}
          showVolumeControls={false}
          clickToPlay={false}
        />
      ) : null}
    </div>
  );
}
