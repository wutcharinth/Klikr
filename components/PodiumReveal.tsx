"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, SkipForward } from "lucide-react";
import type { Participant } from "@/lib/types";
import { sortByScore } from "./LeaderboardRows";
import { useCountUp } from "@/lib/useCountUp";
import { playPresenterClip } from "@/lib/audio";
import { REVEAL_MS, revealStages, type RevealStage } from "@/lib/podiumReveal";

// The big-screen countdown to the podium: a drumroll, 3rd place, 2nd place,
// "and the champion is…", then 1st with a fanfare and confetti. Plays on its
// own; the host can step through it (→ / Space / click Next) or skip it.
// Standings are fetched fresh once the drumroll starts, so the last
// question's scores are in before anyone is named.

type Entry = { id: string; nickname: string; score: number };

const MEDAL: Record<1 | 2 | 3, { fill: string; edge: string; ink: string; label: string }> = {
  1: { fill: "#F5C542", edge: "#D9A21B", ink: "#4A3700", label: "Champion" },
  2: { fill: "#C9D1D9", edge: "#9AA5B1", ink: "#2F363D", label: "2nd place" },
  3: { fill: "#D98A4E", edge: "#B5692F", ink: "#FFFFFF", label: "3rd place" },
};

export function PodiumReveal({
  loadStandings,
  fallback,
  questionCount,
  onDone,
}: {
  /** Resolves with every participant once final scoring has landed. */
  loadStandings: () => Promise<Participant[]>;
  /** Participants already in memory, used if the fetch fails. */
  fallback: Participant[];
  questionCount: number;
  onDone: () => void;
}) {
  const [ranked, setRanked] = useState<Entry[] | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [minDrumrollDone, setMinDrumrollDone] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // Fetch final standings (waits for end-of-session scoring) during the drumroll.
  useEffect(() => {
    let alive = true;
    const giveUp = setTimeout(() => alive && setRanked((r) => r ?? toEntries(fallback)), 8000);
    loadStandings()
      .then((rows) => alive && setRanked(toEntries(rows.length ? rows : fallback)))
      .catch(() => alive && setRanked(toEntries(fallback)));
    return () => {
      alive = false;
      clearTimeout(giveUp);
    };
    // Snapshot once per reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stages: RevealStage[] = ranked ? revealStages(ranked.length) : ["drumroll"];
  const stage = stages[Math.min(stageIdx, stages.length - 1)];
  const finished = ranked !== null && stageIdx >= stages.length;

  useEffect(() => {
    if (ranked && ranked.length === 0) onDoneRef.current();
  }, [ranked]);
  useEffect(() => {
    if (finished) onDoneRef.current();
  }, [finished]);

  const next = useCallback(() => {
    if (stage === "drumroll" && (!ranked || !minDrumrollDone)) return;
    setStageIdx((i) => i + 1);
  }, [stage, ranked, minDrumrollDone]);

  // Drumroll lasts at least its full length, and until standings are in.
  useEffect(() => {
    const t = setTimeout(() => setMinDrumrollDone(true), REVEAL_MS.drumroll);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (stage === "drumroll" && ranked && minDrumrollDone) setStageIdx(1);
  }, [stage, ranked, minDrumrollDone]);

  // Auto-advance through the remaining stages; sound on entering each.
  useEffect(() => {
    if (finished) return;
    if (stage === "drumroll" || stage === "tease") playPresenterClip("drumroll");
    else if (stage === "first") playPresenterClip("fanfare");
    else playPresenterClip("thump");
    if (stage === "drumroll") return;
    const t = setTimeout(() => setStageIdx((i) => i + 1), REVEAL_MS[stage]);
    return () => clearTimeout(t);
  }, [stage, stageIdx, finished]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") {
        onDoneRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  const playerCount = ranked?.length ?? fallback.length;

  return (
    <div className="podium-stage-reveal relative flex min-h-[70vh] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-12 text-center">
      <div className="reveal-spotlights" aria-hidden>
        <span />
        <span />
      </div>

      <div aria-live="polite" className="relative z-10 flex w-full flex-col items-center">
        {stage === "drumroll" && (
          <div key="drumroll" className="reveal-enter flex flex-col items-center">
            <p className="reveal-kicker">Final results</p>
            <h2 className="reveal-headline mt-5">Who takes the crown?</h2>
            <DrumBars />
            <p className="mt-6 text-lg text-white/70">
              {playerCount} {playerCount === 1 ? "player" : "players"}
              {questionCount > 0 ? ` · ${questionCount} ${questionCount === 1 ? "question" : "questions"}` : ""}
            </p>
          </div>
        )}
        {(stage === "third" || stage === "second") && ranked && (
          <PlaceCard key={stage} place={stage === "third" ? 3 : 2} entry={ranked[stage === "third" ? 2 : 1]} />
        )}
        {stage === "tease" && (
          <div key="tease" className="reveal-enter flex flex-col items-center">
            <p className="reveal-kicker">And the champion is…</p>
            <div className="reveal-mystery mt-8" aria-hidden>?</div>
            <DrumBars />
          </div>
        )}
        {stage === "first" && ranked && <PlaceCard key="first" place={1} entry={ranked[0]} />}
      </div>

      {stage === "first" && (
        <div className="reveal-confetti" aria-hidden>
          {Array.from({ length: 36 }, (_, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button type="button" onClick={() => onDoneRef.current()} className="reveal-control" title="Skip to the podium (Esc)">
          <SkipForward className="h-3.5 w-3.5" /> Skip
        </button>
        <button
          type="button"
          onClick={next}
          className="reveal-control"
          disabled={stage === "drumroll" && (!ranked || !minDrumrollDone)}
          title="Next (→ or Space)"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function toEntries(rows: Participant[]): Entry[] {
  return sortByScore(rows).map((p) => ({ id: p.id, nickname: p.nickname, score: p.score }));
}

function PlaceCard({ place, entry }: { place: 1 | 2 | 3; entry: Entry | undefined }) {
  const medal = MEDAL[place];
  const score = useCountUp(entry?.score ?? 0, { from: 0, duration: place === 1 ? 1400 : 900, delay: 350 });
  if (!entry) return null;
  const style = { "--medal-fill": medal.fill, "--medal-edge": medal.edge, "--medal-ink": medal.ink } as CSSProperties;
  return (
    <div className={`reveal-enter reveal-place reveal-place--${place} flex flex-col items-center`} style={style}>
      <p className="reveal-kicker">{medal.label}</p>
      <div className={`relative ${place === 1 ? "mt-24" : "mt-6"}`}>
        {place === 1 && (
          <svg className="reveal-crown" viewBox="0 0 24 19" aria-hidden>
            <path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z" fill="#F5C542" stroke="#C99700" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        )}
        <div className="reveal-avatar">{initial(entry.nickname)}</div>
        <span className="reveal-rank" aria-hidden>{place}</span>
      </div>
      <h2 className="reveal-name mt-6" title={entry.nickname}>{entry.nickname}</h2>
      <p className="reveal-score mt-2">
        {score.toLocaleString()} <span className="text-[0.55em] font-semibold opacity-70">pts</span>
      </p>
    </div>
  );
}

function DrumBars() {
  return (
    <div className="reveal-drum mt-8" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

function initial(name: string): string {
  const ch = Array.from(name.trim())[0];
  return ch ? ch.toUpperCase() : "?";
}
