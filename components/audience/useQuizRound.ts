"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/types";
import type { AudienceQuizConfig } from "@/lib/audienceSlides";
import { getQuizResult, submitResponse, type QuizResult } from "@/app/play/[code]/actions";
import { useQuizPhase } from "@/lib/useQuizPhase";
import { serverNow } from "@/lib/serverClock";
import { playClip, unlock, vibrate } from "@/lib/audio";
import { bumpStreak, resetStreak } from "@/lib/streak";
import { useTakeover } from "./TakeoverContext";
import { useStandingsOptional } from "./StandingsContext";

// Give up asking for the result if the server still says "open" after this —
// only reachable when the phone's idea of server time is far off.
const OPEN_RETRY_DEADLINE_MS = 60_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Everything a phone needs to play one timed quiz question, shared by the
 * classic list view and the game-show tile view:
 *  - phase (intro → open → closed) on the server clock, re-rendering only at
 *    phase boundaries;
 *  - tap → submit;
 *  - on close → tell StandingsContext the round ended, ask the server for the
 *    result and fire the correct / wrong / time's-up takeover.
 *
 * The phone never holds the answer key: /play strips correct_index from quiz
 * configs (lib/audienceSlides.ts). getQuizResult hands back the correct
 * answer, this player's recorded answer and their real points from
 * quiz_slide_scores — and only once the question has closed.
 */
export function useQuizRound({
  slide,
  participantId,
  participantToken,
  presentationId,
  startedAt,
}: {
  slide: Slide;
  participantId: string;
  participantToken: string;
  presentationId: string;
  startedAt: string | null;
}) {
  const cfg = slide.config as AudienceQuizConfig;
  const limit = cfg.time_limit_s ?? 20;
  const timing = useQuizPhase(startedAt, limit);
  const [picked, setPicked] = useState<number | null>(null);
  // How long the player took to tap, on the server-synced clock — shown on
  // the "locked in" screen so speed feels like it matters (it does: scoring
  // rewards fast answers).
  const [answeredMs, setAnsweredMs] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [awaitingPoints, setAwaitingPoints] = useState(false);
  const firedRef = useRef(false);
  const aliveRef = useRef(true);
  const pendingSubmitRef = useRef<Promise<unknown> | null>(null);
  const { trigger, update } = useTakeover();
  const standings = useStandingsOptional();
  const markRoundClosed = standings?.markRoundClosed;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Answers unlocked after the intro: a little "go" cue.
  const prevPhaseRef = useRef(timing.phase);
  useEffect(() => {
    if (prevPhaseRef.current === "intro" && timing.phase === "open") {
      playClip("go");
      vibrate(30);
    }
    prevPhaseRef.current = timing.phase;
  }, [timing.phase]);

  // Reveal as soon as the server confirms the window closed. Rank arrives via
  // StandingsContext; points come with the result, or a beat later (below)
  // when the host's scoring write hasn't landed yet.
  useEffect(() => {
    if (timing.phase !== "closed" || firedRef.current) return;
    firedRef.current = true;
    markRoundClosed?.();
    void (async () => {
      // Let a last-instant tap reach the server so it counts as this
      // player's answer rather than a skip.
      await pendingSubmitRef.current;
      const deadline = Date.now() + OPEN_RETRY_DEADLINE_MS;
      let res: Extract<QuizResult, { status: "closed" }>;
      for (;;) {
        let reply: QuizResult;
        try {
          reply = await getQuizResult({ slideId: slide.id, participantId, participantToken });
        } catch {
          return; // e.g. host already moved on — nothing to reveal
        }
        if (!aliveRef.current) return;
        if (reply.status === "closed") {
          res = reply;
          break;
        }
        // This phone's clock estimate ran ahead of the server: wait it out.
        if (Date.now() > deadline) return;
        await sleep(Math.min(Math.max(reply.retryAfterMs, 250), 5000));
        if (!aliveRef.current) return;
      }

      const correctText = res.correct_index !== null ? cfg.options[res.correct_index] : undefined;
      if (res.my_answer === null) {
        resetStreak(presentationId);
        trigger({ kind: "quiz-skipped", correctText });
      } else if (res.correct_index !== null && res.my_answer === res.correct_index) {
        const streak = bumpStreak(presentationId);
        trigger({ kind: "quiz-correct", slideId: slide.id, points: res.points ?? undefined, streak });
        if (res.points === null) setAwaitingPoints(true);
      } else {
        resetStreak(presentationId);
        trigger({ kind: "quiz-wrong", correctText });
      }
    })();
  }, [timing.phase, cfg.options, slide.id, participantId, participantToken, presentationId, trigger, markRoundClosed]);

  // Correct, but scoring hadn't landed when the reveal fired. StandingsContext
  // marks the round settled once the scored_rev signal (or its fallback poll)
  // shows the scores moved — re-read the real points then and fill them in on
  // the takeover that's already up.
  const settled = standings ? standings.settled : true;
  const standingRev = standings?.standing?.scoredRev;
  useEffect(() => {
    if (!awaitingPoints || !settled) return;
    let cancelled = false;
    void getQuizResult({ slideId: slide.id, participantId, participantToken })
      .then((res) => {
        if (cancelled || res.status !== "closed" || res.points === null) return;
        const points = res.points;
        update((cur) => (cur.kind === "quiz-correct" && cur.slideId === slide.id ? { ...cur, points } : cur));
        setAwaitingPoints(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [awaitingPoints, settled, standingRev, slide.id, participantId, participantToken, update]);

  const choose = useCallback(
    async (i: number) => {
      if (picked !== null || timing.phase !== "open") return;
      setPicked(i);
      setAnsweredMs(Math.max(0, serverNow() - timing.openAt));
      setSubmitError(null);
      void unlock();
      vibrate(25);
      const submission = submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: i });
      pendingSubmitRef.current = submission.catch(() => undefined);
      try {
        await submission;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Couldn't send your answer.";
        setSubmitError(msg);
        // Still answering? Let them tap again rather than sit "locked in" on
        // an answer the server never got.
        if (serverNow() < timing.closeAt) {
          setPicked(null);
          setAnsweredMs(null);
        }
      }
    },
    [picked, timing.phase, timing.openAt, timing.closeAt, slide.id, participantId, participantToken],
  );

  return { cfg, limit, timing, picked, answeredMs, choose, submitError };
}
