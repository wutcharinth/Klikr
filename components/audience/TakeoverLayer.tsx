"use client";

import { useEffect } from "react";
import { useTakeover, type TakeoverPayload } from "./TakeoverContext";
import { playClip, vibrate } from "@/lib/audio";
import {
  QuizCorrectVariant,
  QuizWrongVariant,
  QuizSkippedVariant,
  SubmittedVariant,
} from "./takeover-variants";

export function TakeoverLayer() {
  const { payload, dismiss } = useTakeover();

  // Audio + haptics — fire once per payload.
  useEffect(() => {
    if (!payload) return;
    if (payload.kind === "quiz-correct") {
      playClip("correct");
      vibrate(80);
    } else if (payload.kind === "quiz-wrong") {
      vibrate(120);
    } else if (payload.kind === "submitted" || payload.kind === "toast") {
      playClip("submit");
      vibrate(40);
    }
  }, [payload]);

  if (!payload) return null;
  if (payload.kind === "toast") {
    return (
      <div className="takeover-toast" role="status" aria-live="polite">
        {payload.text}
      </div>
    );
  }

  return (
    <div
      className={bgClass(payload)}
      role="status"
      aria-live="polite"
      onClick={dismiss}
    >
      {renderVariant(payload)}
    </div>
  );
}

function bgClass(p: TakeoverPayload): string {
  switch (p.kind) {
    case "quiz-correct": return "takeover-bg-correct";
    case "quiz-wrong":   return "takeover-bg-wrong";
    case "quiz-skipped": return "takeover-bg-skipped";
    case "submitted":    return "takeover-bg-submit";
    default: return "";
  }
}

function renderVariant(p: TakeoverPayload) {
  switch (p.kind) {
    case "quiz-correct": return <QuizCorrectVariant {...p} />;
    case "quiz-wrong":   return <QuizWrongVariant {...p} />;
    case "quiz-skipped": return <QuizSkippedVariant {...p} />;
    case "submitted":    return <SubmittedVariant {...p} />;
    default: return null;
  }
}
