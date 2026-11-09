"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Slide, QuizConfig } from "@/lib/types";
import { submitResponse } from "@/app/play/[code]/actions";
import { useQuizPhase } from "@/lib/useQuizPhase";
import { serverNow } from "@/lib/serverClock";
import { quizPoints } from "@/lib/quizTiles";
import { playClip, unlock, vibrate } from "@/lib/audio";
import { bumpStreak, resetStreak } from "@/lib/streak";
import { useTakeover } from "./TakeoverContext";
import { useStandingsOptional } from "./StandingsContext";

/**
 * Everything a phone needs to play one timed quiz question, shared by the
 * classic list view and the game-show tile view:
 *  - phase (intro → open → closed) on the server clock, re-rendering only at
 *    phase boundaries;
 *  - tap → optimistic points (mirrors score_quiz_slide) + submit;
 *  - on close → tell StandingsContext the round ended and fire the
 *    correct / wrong / time's-up takeover.
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
  const cfg = slide.config as QuizConfig;
  const limit = cfg.time_limit_s ?? 20;
  const timing = useQuizPhase(startedAt, limit);
  const [picked, setPicked] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pointsRef = useRef(0);
  const firedRef = useRef(false);
  const { trigger } = useTakeover();
  const standings = useStandingsOptional();
  const markRoundClosed = standings?.markRoundClosed;

  // Answers unlocked after the intro: a little "go" cue.
  const prevPhaseRef = useRef(timing.phase);
  useEffect(() => {
    if (prevPhaseRef.current === "intro" && timing.phase === "open") {
      playClip("go");
      vibrate(30);
    }
    prevPhaseRef.current = timing.phase;
  }, [timing.phase]);

  // Reveal the instant the window closes, with points captured at tap time —
  // no waiting on the host's scoring write for the correct/wrong beat. Rank
  // arrives a moment later via StandingsContext.
  useEffect(() => {
    if (timing.phase !== "closed" || firedRef.current) return;
    firedRef.current = true;
    markRoundClosed?.();
    const correctText = cfg.options[cfg.correct_index];
    if (picked === null) {
      resetStreak(presentationId);
      trigger({ kind: "quiz-skipped", correctText });
    } else if (picked === cfg.correct_index) {
      const streak = bumpStreak(presentationId);
      trigger({ kind: "quiz-correct", points: pointsRef.current, streak });
    } else {
      resetStreak(presentationId);
      trigger({ kind: "quiz-wrong", correctText });
    }
  }, [timing.phase, picked, cfg.correct_index, cfg.options, presentationId, trigger, markRoundClosed]);

  const choose = useCallback(
    async (i: number) => {
      if (picked !== null || timing.phase !== "open") return;
      pointsRef.current = quizPoints(i === cfg.correct_index, serverNow() - timing.openAt, limit);
      setPicked(i);
      setSubmitError(null);
      void unlock();
      vibrate(25);
      try {
        await submitResponse({ slideId: slide.id, participantId, participantToken, valueIndex: i });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Couldn't send your answer.";
        setSubmitError(msg);
        // Still answering? Let them tap again rather than sit "locked in" on
        // an answer the server never got.
        if (serverNow() < timing.closeAt) setPicked(null);
      }
    },
    [picked, timing.phase, timing.openAt, timing.closeAt, cfg.correct_index, limit, slide.id, participantId, participantToken],
  );

  return { cfg, limit, timing, picked, choose, submitError };
}
