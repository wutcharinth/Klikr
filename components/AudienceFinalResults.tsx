"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { Participant } from "@/lib/types";
import { AudienceAppFeedback } from "./AudienceAppFeedback";
import { encouragementFor } from "./QuizFeedback";
import { getParticipantScores } from "@/app/play/[code]/actions";
import { LogoMarkPlayer } from "./remotion/LogoMarkPlayer";
import { PodiumPlayer } from "./remotion/PodiumPlayer";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["#FFD54F", "#B0BEC5", "#D7864D"];

export function AudienceFinalResults({
  presentationId,
  participantId,
  participantToken,
  nickname,
  hasAnyQuiz,
}: {
  presentationId: string;
  participantId: string;
  participantToken: string;
  nickname: string;
  hasAnyQuiz: boolean;
}) {
  const [participants, setParticipants] = useState<Participant[] | null>(null);

  useEffect(() => {
    if (!hasAnyQuiz) return;
    let cancelled = false;
    getParticipantScores({ presentationId, participantId, participantToken })
      .then((data) => {
        if (!cancelled) setParticipants(data);
      })
      .catch(() => {
        if (!cancelled) setParticipants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [presentationId, participantId, participantToken, hasAnyQuiz]);

  if (!hasAnyQuiz) {
    return <PlainEnd nickname={nickname} />;
  }

  if (participants === null) {
    return (
      <Stage>
        <p className="muted-text text-sm">Tallying scores…</p>
      </Stage>
    );
  }

  if (participants.length === 0) {
    return <PlainEnd nickname={nickname} />;
  }

  return (
    <FinalResultsBody
      presentationId={presentationId}
      participantId={participantId}
      nickname={nickname}
      participants={participants}
    />
  );
}

function FinalResultsBody({
  participantId,
  nickname,
  participants,
}: {
  presentationId: string;
  participantId: string;
  nickname: string;
  participants: Participant[];
}) {
  const sorted = [...participants].sort(
    (a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const myIdx = sorted.findIndex((p) => p.id === participantId);
  const me = myIdx >= 0 ? sorted[myIdx] : null;
  const top3 = sorted.slice(0, 3);
  const total = sorted.length;
  const rank = myIdx >= 0 ? myIdx + 1 : null;

  const isTop3 = rank !== null && rank <= 3;
  const pct = total > 0 ? (rank ?? total) / total : 1;
  const headline = me ? encouragementFor(pct, rank ?? total) : "Thanks for playing.";

  return (
    <Stage>
      <div className="flex flex-col items-center text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] muted-text">Session complete</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Nice run, {nickname}.</h2>

        {/* Personal tile */}
        <div className="anim-pop mt-6 flex flex-col items-center">
          {isTop3 ? (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-5xl"
              style={{ background: MEDAL_BG[(rank ?? 1) - 1] }}
              aria-label={`Rank ${rank}`}
            >
              {MEDAL[(rank ?? 1) - 1]}
            </div>
          ) : (
            <div
              className="flex h-24 w-24 flex-col items-center justify-center rounded-full"
              style={{ background: "rgba(0,113,227,0.10)", border: "1px solid rgba(0,113,227,0.3)" }}
              aria-label={`Rank ${rank} of ${total}`}
            >
              <span className="text-[10px] uppercase tracking-[0.18em] muted-text">Rank</span>
              <span className="text-3xl font-bold leading-none" style={{ color: "var(--blue)" }}>
                #{rank ?? "—"}
              </span>
              <span className="mt-0.5 text-[10px] muted-text">of {total}</span>
            </div>
          )}
          {me ? (
            <p className="mt-4 text-4xl font-bold tracking-tight" style={{ color: "var(--blue)" }}>
              <span className="count-bump inline-block">{me.score.toLocaleString()}</span>
            </p>
          ) : null}
          {me ? <p className="mt-1 text-xs muted-text uppercase tracking-[0.18em]">Final score</p> : null}
        </div>

        <p className="mt-5 text-sm font-medium">{headline}</p>
      </div>

      {/* Cinematic top-3 podium reveal (Remotion, plays once). */}
      {top3.length > 0 ? (
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.2em] muted-text">
            <Trophy className="-mt-0.5 mr-1.5 inline-block h-3 w-3" />
            Final podium
          </p>
          <div className="mt-3">
            <PodiumPlayer
              entries={top3.map((p) => ({ nickname: p.nickname, score: p.score }))}
              width={340}
              height={400}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <AudienceAppFeedback />
      </div>

      {/* Logo outro — branded close to the personal card. */}
      <div className="mt-6 flex justify-center" aria-hidden>
        <LogoMarkPlayer variant="outro" width={480} height={140} loop={false} />
      </div>
    </Stage>
  );
}

function PlainEnd({ nickname }: { nickname: string }) {
  return (
    <Stage>
      <h2 className="text-2xl font-semibold">Session ended</h2>
      <p className="mt-2 text-slate-500">Thanks for playing, {nickname}!</p>
      <AudienceAppFeedback />
    </Stage>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blue)" }}>
        Klikr
      </h1>
      <div className="panel p-6">{children}</div>
    </main>
  );
}
