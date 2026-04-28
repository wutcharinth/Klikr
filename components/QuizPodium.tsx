"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, Medal, Volume2, VolumeX } from "lucide-react";
import type { Participant } from "@/lib/types";

const HEIGHTS = [180, 240, 140]; // 1st, 2nd, 3rd block heights
const COLORS = ["#FFD54F", "#B0BEC5", "#D7864D"];

export function QuizPodium({ participants, presentationId }: { participants: Participant[]; presentationId: string }) {
  const sorted = [...participants].sort(
    (a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const [revealed, setRevealed] = useState(0);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (top.length === 0) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeouts.push(setTimeout(() => setRevealed(1), 200));
    timeouts.push(setTimeout(() => setRevealed(2), 1100));
    timeouts.push(
      setTimeout(() => {
        setRevealed(3);
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
        if (!muted && audioRef.current) audioRef.current.play().catch(() => {});
      }, 2000)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [top.length, muted]);

  if (top.length === 0) {
    return (
      <div className="panel-soft p-12 text-center">
        <Trophy className="mx-auto h-10 w-10 muted-text" />
        <p className="mt-3 text-lg font-medium">No quiz scores yet.</p>
      </div>
    );
  }

  // Layout: [2nd] [1st] [3rd]
  const order: { idx: number; rank: number }[] = [];
  if (top[1]) order.push({ idx: 1, rank: 2 });
  order.push({ idx: 0, rank: 1 });
  if (top[2]) order.push({ idx: 2, rank: 3 });

  return (
    <div className="panel relative overflow-hidden p-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: "var(--blue)" }} />
          <h2 className="text-xl font-semibold tracking-tight">Final podium</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted((m) => !m)} className="btn-ghost text-xs muted-text">
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/results/${presentationId}`)}
            className="btn-ghost text-xs"
          >
            Share results
          </button>
        </div>
      </div>

      <div className="mt-12 flex items-end justify-center gap-4">
        {order.map(({ idx, rank }) => {
          const p = top[idx];
          const visible = revealed >= rank;
          return (
            <div key={p.id} className="flex flex-col items-center transition-all" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)" }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold" style={{ background: COLORS[rank - 1], color: "#1d1d1f" }}>
                {rank === 1 ? <Trophy className="h-7 w-7" /> : <Medal className="h-7 w-7" />}
              </div>
              <p className="mt-3 text-base font-semibold">{p.nickname}</p>
              <p className="mt-1 text-xs muted-text">{p.score.toLocaleString()} pts</p>
              <div
                className="mt-3 flex w-32 items-center justify-center rounded-t-xl text-3xl font-bold"
                style={{
                  height: HEIGHTS[rank - 1],
                  background: COLORS[rank - 1],
                  color: "#1d1d1f",
                }}
              >
                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="mt-10">
          <p className="text-[11px] uppercase tracking-wider muted-text">Also in the running</p>
          <ol className="mt-3 grid gap-1 text-sm">
            {rest.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: i % 2 === 0 ? "var(--pale)" : "transparent" }}>
                <span><span className="muted-text mono mr-3">{i + 4}.</span>{p.nickname}</span>
                <span className="mono muted-text">{p.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <audio ref={audioRef} src="/podium-chime.mp3" preload="none" />
    </div>
  );
}
