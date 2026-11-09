"use client";

import { Trophy } from "lucide-react";
import type { Standing } from "@/lib/types";
import { AudienceAppFeedback } from "./AudienceAppFeedback";
import { encouragementFor } from "./QuizFeedback";
import { useStandingsOptional } from "./audience/StandingsContext";
import { useCountUp } from "@/lib/useCountUp";
import { Podium } from "./Podium";

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["#FFD54F", "#B0BEC5", "#D7864D"];

export function AudienceFinalResults({
  nickname,
  hasAnyQuiz,
}: {
  nickname: string;
  hasAnyQuiz: boolean;
}) {
  const standings = useStandingsOptional();
  const standing = standings?.standing ?? null;

  if (!hasAnyQuiz) {
    return <PlainEnd nickname={nickname} />;
  }

  if (!standing) {
    return (
      <Stage>
        <p className="muted-text text-sm">
          Tallying scores<span className="loading-dots" aria-hidden />
        </p>
      </Stage>
    );
  }

  return <FinalResultsBody nickname={nickname} standing={standing} />;
}

function FinalResultsBody({ nickname, standing }: { nickname: string; standing: Standing }) {
  const { me, total } = standing;
  const top3 = standing.top.slice(0, 3);
  const rank = me.rank;
  const isTop3 = rank <= 3;
  const pct = total > 0 ? rank / total : 1;
  const headline = encouragementFor(pct, rank);
  const shownScore = useCountUp(me.score, { from: 0, duration: 1400, delay: 400 });

  return (
    <Stage>
      <div className="flex flex-col items-center text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] muted-text">Session complete</p>
        <h2 className="anim-fade-up mt-2 text-xl font-semibold tracking-tight">Nice run, {nickname}.</h2>

        {/* Personal tile */}
        <div className="anim-pop mt-6 flex flex-col items-center">
          {isTop3 ? (
            <div
              className="medal-drop flex h-24 w-24 items-center justify-center rounded-full text-5xl"
              style={{ background: MEDAL_BG[rank - 1] }}
              aria-label={`Rank ${rank}`}
            >
              {MEDAL[rank - 1]}
            </div>
          ) : (
            <div
              className="flex h-24 w-24 flex-col items-center justify-center rounded-full"
              style={{ background: "rgba(0,113,227,0.10)", border: "1px solid rgba(0,113,227,0.3)" }}
              aria-label={`Rank ${rank} of ${total}`}
            >
              <span className="text-[10px] uppercase tracking-[0.18em] muted-text">Rank</span>
              <span className="text-3xl font-bold leading-none" style={{ color: "var(--blue)" }}>
                #{rank}
              </span>
              <span className="mt-0.5 text-[10px] muted-text">of {total}</span>
            </div>
          )}
          <p
            className="mt-4 text-4xl font-bold tracking-tight"
            style={{ color: "var(--blue)", fontVariantNumeric: "tabular-nums" }}
          >
            {shownScore.toLocaleString()}
          </p>
          <p className="mt-1 text-xs muted-text uppercase tracking-[0.18em]">Final score</p>
        </div>

        <p className="mt-5 text-sm font-medium">{headline}</p>
      </div>

      {top3.length > 0 ? (
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.2em] muted-text">
            <Trophy className="-mt-0.5 mr-1.5 inline-block h-3 w-3" />
            Final podium
          </p>
          <div className="mt-2">
            <Podium entries={top3} size="compact" highlightId={me.id} />
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <AudienceAppFeedback />
      </div>

      {/* Branded close (CSS — no animation runtime needed). */}
      <div className="mt-6 flex justify-center" aria-hidden>
        <div className="lobby-mark lobby-mark--outro">
          <span className="lobby-mark-word">Klikr</span>
          <span className="lobby-mark-dot" />
        </div>
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
