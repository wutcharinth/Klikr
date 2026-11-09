"use client";

import { Profiler, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Participant, ResponseRow, Slide, Standing } from "@/lib/types";
import { KahootPresenterView } from "@/components/KahootPresenterView";
import { QuizLeaderboardScreen } from "@/components/PresenterView";
import { KahootAudienceView, LockedIn } from "@/components/KahootAudienceView";
import { StagedLeaderboard } from "@/components/audience/AudienceLeaderboard";
import { StandingsStaticProvider } from "@/components/audience/StandingsContext";
import { TakeoverProvider, useTakeover, type TakeoverPayload } from "@/components/audience/TakeoverContext";
import { TakeoverLayer } from "@/components/audience/TakeoverLayer";
import { AudienceFinalResults } from "@/components/AudienceFinalResults";
import { ResultsBarChart } from "@/components/ResultsBarChart";
import { QuizPodium } from "@/components/QuizPodium";
import { useBufferedState } from "@/lib/useBufferedState";
import { createClient } from "@/lib/supabase/client";

const VIEWS = [
  "presenter-intro",
  "presenter-open",
  "presenter-reveal",
  "presenter-leaderboard",
  "presenter-podium",
  "phone-intro",
  "phone-open",
  "phone-locked",
  "phone-correct",
  "phone-wrong",
  "phone-skipped",
  "phone-leaderboard",
  "phone-final",
  "stress",
] as const;

const SLIDE: Slide = {
  id: "00000000-0000-0000-0000-00000000000a",
  presentation_id: "00000000-0000-0000-0000-0000000000p1",
  position: 2,
  type: "quiz",
  question: "Which planet is closest to the Sun?",
  config: {
    options: ["Mercury", "Venus", "Earth", "Mars"],
    correct_index: 0,
    time_limit_s: 20,
    explanation: "Mercury orbits at ~58 million km — about a third of Earth's distance.",
  },
  image_url: null,
  kahoot_mode: true,
} as unknown as Slide;

const NAMES = ["Ava", "Ben", "Chloé", "Dev", "Eli", "Farah", "Gus", "Hana", "Ivan", "Jules", "Kai", "Lena"];

function mockResponses(n: number): ResponseRow[] {
  const weights = [0.52, 0.22, 0.16, 0.1];
  return Array.from({ length: n }, (_, i) => {
    const r = (i * 0.6180339) % 1;
    let acc = 0;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      acc += weights[idx];
      if (r < acc) break;
    }
    return {
      id: `r${i}`,
      slide_id: SLIDE.id,
      participant_id: `p${i}`,
      value_text: null,
      value_index: Math.min(idx, 3),
      response_ms: 1000 + i * 100,
      created_at: new Date(Date.now() - 10000 + i * 50).toISOString(),
    };
  });
}

function mockParticipants(): Participant[] {
  return NAMES.map((nickname, i) => ({
    id: `p${i}`,
    presentation_id: "p1",
    nickname,
    score: [4210, 3980, 3975, 3600, 3420, 2900, 2875, 2400, 1980, 1500, 900, 400][i],
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  }));
}

function mockStanding(): { standing: Standing; baseline: Standing } {
  const now = mockParticipants();
  const top = now.slice(0, 10).map((p, i) => ({ id: p.id, nickname: p.nickname, score: p.score, created_at: p.created_at, rank: i + 1 }));
  const before = [...now]
    .map((p, i) => ({ ...p, score: Math.max(0, p.score - [930, 0, 820, 960, 0, 870, 0, 910, 0, 0, 0, 0][i]) }))
    .sort((a, b) => b.score - a.score);
  const baseTop = before.slice(0, 10).map((p, i) => ({ id: p.id, nickname: p.nickname, score: p.score, created_at: p.created_at, rank: i + 1 }));
  const me = { id: "p2", nickname: "Chloé", score: 3975, rank: 3 };
  return {
    standing: { me, total: now.length, ahead: { nickname: "Ben", score: 3980 }, top, scoredRev: 5 },
    baseline: {
      me: { ...me, score: 3155, rank: before.findIndex((p) => p.id === "p2") + 1 },
      total: now.length,
      ahead: null,
      top: baseTop,
      scoredRev: 4,
    },
  };
}

export function QuizPreview({ view }: { view: string }) {
  if (view === "index") {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Quiz preview</h1>
        <p className="mt-2 text-sm muted-text">Dev-only gallery of every phase with mock data.</p>
        <ul className="mt-6 grid gap-2">
          {VIEWS.map((v) => (
            <li key={v}>
              <a className="text-sm" style={{ color: "var(--blue)" }} href={`?view=${v}`}>
                {v}
              </a>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  if (view.startsWith("presenter")) return <PresenterPreview view={view} />;
  if (view === "stress") return <StressPreview />;
  return <PhonePreview view={view} />;
}

function PresenterPreview({ view }: { view: string }) {
  const [startedAt] = useState(() =>
    view === "presenter-intro"
      ? new Date(Date.now() + 60_000).toISOString()
      : new Date(Date.now() - 6_000).toISOString(),
  );
  const responses = useMemo(() => mockResponses(view === "presenter-open" ? 9 : 12), [view]);
  const participants = useMemo(() => mockParticipants(), []);
  const baseline = useMemo(() => {
    const { baseline: b } = mockStanding();
    return new Map(b.top.map((r) => [r.id, r]));
  }, []);
  const supabase = useMemo(() => createClient(), []);
  return (
    <main className="flex h-screen flex-col overflow-hidden px-4 py-3 lg:px-8 lg:py-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl px-2 py-3 sm:px-6 sm:py-5">
        {view === "presenter-podium" ? (
          <QuizPodium participants={participants} presentationId="p1" />
        ) : view === "presenter-leaderboard" ? (
          <QuizLeaderboardScreen participants={participants} baseline={baseline} quizSlideIds={[]} supabase={supabase} />
        ) : (
          <KahootPresenterView
            slide={SLIDE}
            responses={responses}
            startedAt={startedAt}
            forceClosed={view === "presenter-reveal"}
            questionNumber={3}
            questionCount={10}
            playerCount={12}
          />
        )}
      </div>
    </main>
  );
}

function PhoneStage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--blue)" }}>
        Klikr
      </h1>
      <div className="panel p-6">{children}</div>
    </main>
  );
}

function PhonePreview({ view }: { view: string }) {
  const { standing, baseline } = useMemo(() => mockStanding(), []);
  const [settled, setSettled] = useState(view === "phone-leaderboard" || view === "phone-final");
  useEffect(() => {
    if (!["phone-correct", "phone-wrong", "phone-skipped"].includes(view)) return;
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, [view]);
  const value = useMemo(() => ({ standing, baseline, settled }), [standing, baseline, settled]);
  const [startedAt] = useState(() =>
    view === "phone-intro" ? new Date(Date.now() + 60_000).toISOString() : new Date(Date.now() - 6_000).toISOString(),
  );
  return (
    <StandingsStaticProvider value={value}>
      <TakeoverProvider>
        {view === "phone-final" ? (
          <AudienceFinalResults nickname="Chloé" hasAnyQuiz />
        ) : (
          <PhoneStage>
            <p className="text-[10px] uppercase tracking-[0.18em] muted-text">Question 3 of 10</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{SLIDE.question}</h2>
            <div className="mt-6">
              {view === "phone-locked" ? (
                <LockedIn tileIndex={0} text="Mercury" closeAt={Date.now() + 14_000} limit={20} />
              ) : view === "phone-leaderboard" || view.startsWith("phone-c") || view.startsWith("phone-w") || view.startsWith("phone-s") ? (
                <StagedLeaderboard />
              ) : (
                <KahootAudienceView
                  slide={SLIDE}
                  participantId="p2"
                  participantToken="t"
                  presentationId="p1"
                  startedAt={startedAt}
                />
              )}
            </div>
          </PhoneStage>
        )}
        <AutoTakeover view={view} />
        <TakeoverLayer />
      </TakeoverProvider>
    </StandingsStaticProvider>
  );
}

function AutoTakeover({ view }: { view: string }) {
  const { trigger } = useTakeover();
  useEffect(() => {
    const payload: TakeoverPayload | null =
      view === "phone-correct"
        ? { kind: "quiz-correct", points: 870, streak: 3 }
        : view === "phone-wrong"
          ? { kind: "quiz-wrong", correctText: "Mercury" }
          : view === "phone-skipped"
            ? { kind: "quiz-skipped", correctText: "Mercury" }
            : null;
    if (!payload) return;
    trigger(payload);
    // Re-fire so the overlay stays up for screenshots / inspection.
    const t = setInterval(() => trigger(payload), 3000);
    return () => clearInterval(t);
  }, [view, trigger]);
  return null;
}

// Render-count comparison: the same 200 realtime "answer" events applied with
// one setState per event (before) vs. per-frame batching (after). Each panel
// owns its state (events arrive via an emitter) so the counts are independent.
type Feed = EventTarget;
const ROW = "row";
const RESET = "reset";

function DirectPanel({ feed, commitsRef }: { feed: Feed; commitsRef: React.MutableRefObject<number> }) {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  useEffect(() => {
    const onRow = (e: Event) => setRows((r) => [...r, (e as CustomEvent<ResponseRow>).detail]);
    const onReset = () => setRows([]);
    feed.addEventListener(ROW, onRow);
    feed.addEventListener(RESET, onReset);
    return () => {
      feed.removeEventListener(ROW, onRow);
      feed.removeEventListener(RESET, onReset);
    };
  }, [feed]);
  const onRender = useCallback(() => {
    commitsRef.current++;
  }, [commitsRef]);
  return (
    <Profiler id="direct" onRender={onRender}>
      <ResultsBarChart slide={SLIDE} responses={rows} />
    </Profiler>
  );
}

function BufferedPanel({ feed, commitsRef }: { feed: Feed; commitsRef: React.MutableRefObject<number> }) {
  const [rows, enqueue, setRows] = useBufferedState<ResponseRow[]>([]);
  useEffect(() => {
    const onRow = (e: Event) => {
      const row = (e as CustomEvent<ResponseRow>).detail;
      enqueue((r) => [...r, row]);
    };
    const onReset = () => setRows([]);
    feed.addEventListener(ROW, onRow);
    feed.addEventListener(RESET, onReset);
    return () => {
      feed.removeEventListener(ROW, onRow);
      feed.removeEventListener(RESET, onReset);
    };
  }, [feed, enqueue, setRows]);
  const onRender = useCallback(() => {
    commitsRef.current++;
  }, [commitsRef]);
  return (
    <Profiler id="buffered" onRender={onRender}>
      <ResultsBarChart slide={SLIDE} responses={rows} />
    </Profiler>
  );
}

function StressPreview() {
  const [feed] = useState<Feed>(() => new EventTarget());
  const directCommits = useRef(0);
  const bufferedCommits = useRef(0);
  const [report, setReport] = useState<{ direct: number; buffered: number } | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    feed.dispatchEvent(new Event(RESET));
    setReport(null);
    setRunning(true);
    setTimeout(() => {
      directCommits.current = 0;
      bufferedCommits.current = 0;
      const all = mockResponses(200);
      // One event per task, ~5ms apart (≈200/s) — like websocket messages,
      // which each arrive in their own task.
      all.forEach((row, i) => {
        setTimeout(() => {
          feed.dispatchEvent(new CustomEvent(ROW, { detail: row }));
          if (i === all.length - 1) {
            setTimeout(() => {
              setReport({ direct: directCommits.current, buffered: bufferedCommits.current });
              setRunning(false);
            }, 300);
          }
        }, i * 5);
      });
    }, 100);
  }, [feed]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Realtime burst: 200 answers in ~1s</h1>
      <button className="btn-primary mt-4" onClick={run} disabled={running} data-testid="run-stress">
        {running ? "Running…" : "Simulate burst"}
      </button>
      {report ? (
        <p className="mt-4 text-lg" data-testid="stress-report">
          Commits — one setState per event: <b>{report.direct}</b> · per-frame batching: <b>{report.buffered}</b>
        </p>
      ) : null}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="panel p-6">
          <p className="text-xs uppercase tracking-[0.18em] muted-text">Before</p>
          <DirectPanel feed={feed} commitsRef={directCommits} />
        </div>
        <div className="panel p-6">
          <p className="text-xs uppercase tracking-[0.18em] muted-text">After</p>
          <BufferedPanel feed={feed} commitsRef={bufferedCommits} />
        </div>
      </div>
    </main>
  );
}
