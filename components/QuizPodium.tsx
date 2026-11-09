"use client";

import dynamic from "next/dynamic";
import { Trophy } from "lucide-react";
import type { Participant } from "@/lib/types";
import { sortByScore } from "./LeaderboardRows";

// The Remotion runtime is only needed once the session ends — keep it out of
// the presenter's initial bundle.
const PodiumPlayer = dynamic(() => import("./remotion/PodiumPlayer").then((m) => m.PodiumPlayer), {
  ssr: false,
  loading: () => <div className="podium-skeleton" style={{ aspectRatio: "960 / 520" }} aria-hidden />,
});

export function QuizPodium({ participants, presentationId }: { participants: Participant[]; presentationId: string }) {
  const sorted = sortByScore(participants);
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

      {/* Plain-text scores, always correct and immediately present — the
       *  Remotion counter above animates from 0 and @remotion/player throttles
       *  playback to ~1fps while the tab is backgrounded, so a host who opens
       *  this in a background tab (or a screen reader, which gets nothing from
       *  the canvas-like reveal) could otherwise be stuck looking at "0 pts". */}
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-sm">
        {top.map((p, i) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span aria-hidden>{["🥇", "🥈", "🥉"][i]}</span>
            <span className="font-medium">{p.nickname}</span>
            <span className="mono muted-text">{p.score.toLocaleString()}</span>
          </li>
        ))}
      </ul>

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
