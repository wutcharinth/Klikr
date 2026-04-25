"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Burst = { id: string; emoji: string; x: number; delay: number };

export function ReactionOverlay({ presentationId }: { presentationId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${presentationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions", filter: `presentation_id=eq.${presentationId}` },
        (payload) => {
          const r = payload.new as { id: string; emoji: string };
          const b: Burst = {
            id: r.id,
            emoji: r.emoji,
            x: Math.random() * 80 + 10,
            delay: Math.random() * 0.2,
          };
          setBursts((prev) => [...prev, b]);
          setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== b.id)), 3500);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, presentationId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bursts.map((b) => (
        <span
          key={b.id}
          className="absolute select-none"
          style={{
            left: `${b.x}%`,
            bottom: 0,
            fontSize: 36,
            animation: `floatUp 3.4s cubic-bezier(0.2, 0.8, 0.2, 1) ${b.delay}s forwards`,
          }}
        >
          {b.emoji}
        </span>
      ))}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(0.6) rotate(0deg); opacity: 0; }
          10%  { transform: translateY(-40px) scale(1) rotate(-6deg); opacity: 1; }
          80%  { transform: translateY(-70vh) scale(1.2) rotate(8deg); opacity: 0.95; }
          100% { transform: translateY(-90vh) scale(1.4) rotate(-10deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
