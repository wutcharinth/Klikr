"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pinRealtimeAuth, reactionChannelName, REACTION_EVENT } from "@/lib/realtime";

type Burst = { id: number; emoji: string; x: number; delay: number; size: number };

// At most this many emoji float at once; extra arrivals during a flood are
// dropped (the screen is already full of them — nobody can tell).
const MAX_ON_SCREEN = 40;
const LIFETIME_MS = 3500;

export const ReactionOverlay = memo(function ReactionOverlay({ presentationId }: { presentationId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const queueRef = useRef<string[]>([]);
  const frameRef = useRef<number | null>(null);
  const liveRef = useRef(0);
  const seqRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const timers = timersRef.current;

    // Arrivals are queued and added once per frame, so a flood of taps costs
    // one render per frame instead of one per reaction.
    const flush = () => {
      frameRef.current = null;
      const room = Math.max(0, MAX_ON_SCREEN - liveRef.current);
      const take = queueRef.current.splice(0, room);
      queueRef.current = [];
      if (take.length === 0) return;
      const fresh = take.map((emoji) => ({
        id: ++seqRef.current,
        emoji,
        x: Math.random() * 80 + 10,
        delay: Math.random() * 0.2,
        size: 30 + Math.random() * 14,
      }));
      liveRef.current += fresh.length;
      setBursts((prev) => [...prev, ...fresh]);
      const ids = new Set(fresh.map((b) => b.id));
      const t = setTimeout(() => {
        timers.delete(t);
        liveRef.current -= ids.size;
        setBursts((prev) => prev.filter((b) => !ids.has(b.id)));
      }, LIFETIME_MS);
      timers.add(t);
    };
    const push = (emoji: string) => {
      if (cancelled || typeof emoji !== "string") return;
      queueRef.current.push(emoji.slice(0, 8));
      if (frameRef.current == null) frameRef.current = requestAnimationFrame(flush);
    };

    // Broadcast: the live path (phones send here, no DB write).
    const live = supabase
      .channel(reactionChannelName(presentationId))
      .on("broadcast", { event: REACTION_EVENT }, ({ payload }) => push((payload as { e?: string })?.e ?? ""))
      .subscribe();

    // Legacy path: phones still running the previous build insert rows into
    // `reactions`. Keep listening so a deploy mid-session loses nothing.
    let legacy: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await pinRealtimeAuth(supabase);
      if (cancelled) return;
      legacy = supabase
        .channel(`reactions-${presentationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "reactions", filter: `presentation_id=eq.${presentationId}` },
          (payload) => push((payload.new as { emoji: string }).emoji),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      timers.forEach(clearTimeout);
      timers.clear();
      supabase.removeChannel(live);
      if (legacy) supabase.removeChannel(legacy);
    };
  }, [supabase, presentationId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" style={{ contain: "strict" }}>
      {bursts.map((b) => (
        <span
          key={b.id}
          className="reaction-float absolute select-none"
          style={{ left: `${b.x}%`, bottom: 0, fontSize: b.size, animationDelay: `${b.delay}s` }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
});
