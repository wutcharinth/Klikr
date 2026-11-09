"use client";

import { useCallback, useEffect, useRef } from "react";
import { getQuizResult, type QuizResult } from "@/app/play/[code]/actions";
import { bumpStreak, resetStreak } from "@/lib/streak";
import { useTakeover } from "./TakeoverContext";

// After a correct answer is revealed before the host's scoring has landed, we
// re-read the points up to this many times, each after the scored_rev signal
// or this delay (whichever comes first). The takeover is only up for ~1.8s.
const POINTS_RETRY_MS = [600, 600];
// Give up asking for the result if the server still says "open" after this —
// only reachable when the phone's clock runs far ahead of the server's.
const OPEN_RETRY_DEADLINE_MS = 60_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Drives the correct / wrong / skipped takeover for a quiz slide. The phone
 *  holds no answer key (lib/audienceSlides.ts strips it), so once the local
 *  timer runs out this asks the server for the result — the correct answer,
 *  this player's recorded answer, and their real points from quiz_slide_scores.
 *
 *  The reveal fires as soon as the server confirms the question is closed. If
 *  the host hasn't scored it yet, the correct takeover shows "Scoring…" and the
 *  real points are filled in when the scored_rev signal arrives.
 *
 *  Pass every answer submission through `trackSubmit` so a tap in the final
 *  instant lands before the result is requested. */
export function useQuizReveal({
  slideId,
  options,
  expired,
  presentationId,
  participantId,
  participantToken,
  scoredRev,
}: {
  slideId: string;
  options: string[];
  expired: boolean;
  presentationId: string;
  participantId: string;
  participantToken: string;
  scoredRev: number;
}) {
  const { trigger, update } = useTakeover();
  const prevRankRef = useRef<number | null>(null);
  const revealedSlideRef = useRef<string | null>(null);
  const pendingSubmitRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    pendingSubmitRef.current = null;
  }, [slideId]);

  const trackSubmit = useCallback(<T,>(submission: Promise<T>): Promise<T> => {
    pendingSubmitRef.current = submission.catch(() => undefined);
    return submission;
  }, []);

  // scored_rev is bumped (and pushed over realtime) in the same transaction
  // that writes quiz_slide_scores, so it's the signal that real points exist.
  const scoredRevRef = useRef(scoredRev);
  const revWaitersRef = useRef(new Set<() => void>());
  useEffect(() => {
    scoredRevRef.current = scoredRev;
    const waiters = [...revWaitersRef.current];
    revWaitersRef.current.clear();
    waiters.forEach((wake) => wake());
  }, [scoredRev]);

  const waitForScoredRev = useCallback(
    (since: number, timeoutMs: number) =>
      new Promise<void>((resolve) => {
        if (scoredRevRef.current !== since) return resolve();
        const done = () => {
          clearTimeout(timer);
          revWaitersRef.current.delete(done);
          resolve();
        };
        const timer = setTimeout(done, timeoutMs);
        revWaitersRef.current.add(done);
      }),
    [],
  );

  useEffect(() => {
    if (!expired || revealedSlideRef.current === slideId) return;
    let cancelled = false;
    const fetchResult = () => getQuizResult({ slideId, participantId, participantToken });

    (async () => {
      // Let a last-instant tap reach the server so it counts as this
      // player's answer rather than a skip.
      await pendingSubmitRef.current;
      if (cancelled) return;

      let revSeen = scoredRevRef.current;
      const deadline = Date.now() + OPEN_RETRY_DEADLINE_MS;
      let result: Extract<QuizResult, { status: "closed" }>;
      for (;;) {
        let res: QuizResult;
        try {
          res = await fetchResult();
        } catch {
          return; // e.g. host already moved on — the leaderboard still shows
        }
        if (cancelled) return;
        if (res.status === "closed") {
          result = res;
          break;
        }
        // Phone clock ran ahead of the server's: wait out the rest and retry.
        if (Date.now() > deadline) return;
        await sleep(Math.min(Math.max(res.retryAfterMs, 250), 5000));
        if (cancelled) return;
      }

      const { total, rank: rankNow } = result;
      const rankBefore = prevRankRef.current ?? total;
      prevRankRef.current = rankNow;
      revealedSlideRef.current = slideId;

      const isCorrect = result.correct_index !== null && result.my_answer === result.correct_index;
      const correctText = result.correct_index !== null ? options[result.correct_index] : undefined;
      if (result.my_answer === null) {
        resetStreak(presentationId);
        trigger({ kind: "quiz-skipped", rankNow, total, correctText });
        return;
      }
      if (!isCorrect) {
        resetStreak(presentationId);
        trigger({ kind: "quiz-wrong", rankNow, total, correctText });
        return;
      }
      const streak = bumpStreak(presentationId);
      trigger({
        kind: "quiz-correct",
        slideId,
        points: result.points ?? undefined,
        rankNow,
        rankBefore,
        total,
        streak,
      });
      if (result.points !== null) return;

      // Correct, but the host's scoring hadn't landed yet. Fill in the real
      // points (and the rank they earn) on the takeover that's already up.
      for (const delay of POINTS_RETRY_MS) {
        await waitForScoredRev(revSeen, delay);
        if (cancelled) return;
        revSeen = scoredRevRef.current;
        let again: QuizResult;
        try {
          again = await fetchResult();
        } catch {
          return;
        }
        if (cancelled) return;
        if (again.status !== "closed" || again.points === null) continue;
        const { points, rank, total: totalNow } = again;
        prevRankRef.current = rank;
        update((cur) =>
          cur.kind === "quiz-correct" && cur.slideId === slideId
            ? { ...cur, points, rankNow: rank, total: totalNow }
            : cur,
        );
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expired, slideId, options, presentationId, participantId, participantToken, trigger, update, waitForScoredRev]);

  return { trackSubmit };
}
