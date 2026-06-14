"use client";

import { Trophy } from "lucide-react";
import type { Participant } from "@/lib/types";
import { PodiumPlayer } from "./remotion/PodiumPlayer";

export function QuizPodium({ participants, presentationId }: { participants: Participant[]; presentationId: string }) {
  const sorted = [...participants].sort(
    (a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  if (top.length === 0) {
    return (
      <div className="panel-soft p-12 text-center">
        <Trophy className="mx-auto h-10 w-10 muted-text" />
        <p className="mt-3 text-lg font-medium">No quiz scores yet.</p>
      </div>
    );
  }

  return (
    <div className="panel relative overflow-hidden p-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: "var(--blue)" }} />
          <h2 className="text-xl font-semibold tracking-tight">Final podium</h2>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/results/${presentationId}`)}
          className="btn-ghost text-xs"
        >
          Share results
        </button>
      </div>

      {/* Cinematic top-3 reveal (Remotion, plays once). */}
      <div className="mt-6">
        <PodiumPlayer
          entries={top.map((p) => ({ nickname: p.nickname, score: p.score }))}
          width={960}
          height={520}
        />
      </div>

      {rest.length > 0 && (
        <div className="mt-8">
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
    </div>
  );
}
