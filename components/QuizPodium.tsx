"use client";

import { useState } from "react";
import { Check, Link2, Trophy } from "lucide-react";
import type { Participant } from "@/lib/types";
import { sortByScore } from "./LeaderboardRows";
import { Podium } from "./Podium";

export function QuizPodium({ participants, presentationId }: { participants: Participant[]; presentationId: string }) {
  const sorted = sortByScore(participants);
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/results/${presentationId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  if (top.length === 0) {
    return (
      <div className="panel-soft p-12 text-center">
        <Trophy className="mx-auto h-10 w-10 muted-text" />
        <p className="mt-3 text-lg font-medium">No quiz scores yet.</p>
      </div>
    );
  }

  return (
    <div className="panel relative overflow-hidden p-5 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: "var(--blue)" }} />
          <h2 className="text-xl font-semibold tracking-tight">Final podium</h2>
          <span className="text-xs muted-text">
            · {sorted.length} {sorted.length === 1 ? "player" : "players"}
          </span>
        </div>
        <button onClick={share} className="btn-ghost inline-flex items-center gap-1.5 text-xs" aria-live="polite">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          {copied ? "Link copied" : "Share results"}
        </button>
      </div>

      <div className="mx-auto mt-4 max-w-3xl">
        <Podium entries={top} />
      </div>

      {rest.length > 0 && (
        <div className="mx-auto mt-8 max-w-3xl">
          <p className="text-[11px] uppercase tracking-wider muted-text">Also in the running</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {rest.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5"
                style={{ background: "var(--pale)" }}
              >
                <span className="flex min-w-0 items-center">
                  <span className="mono mr-3 w-6 shrink-0 text-right muted-text">{i + 4}</span>
                  <span className="truncate">{p.nickname}</span>
                </span>
                <span className="mono shrink-0 muted-text">{p.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
