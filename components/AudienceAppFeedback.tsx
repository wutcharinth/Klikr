"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitAudienceFeedback } from "@/app/play/[code]/actions";

// Inline rating widget shown on the audience "session ended" screen.
// Wording is deliberate: this is feedback on the Klikr APP, not the host's
// quiz content — the participant should never feel they're grading the host.
export function AudienceAppFeedback() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (rating < 1) return;
    setError(null);
    startTransition(async () => {
      const res = await submitAudienceFeedback({
        rating,
        comment,
        pagePath: typeof window !== "undefined" ? window.location.pathname : "",
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        🙏 Thanks! Sent to the developer.
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Help the developer
      </p>
      <p className="mt-1 text-base font-semibold">How was the Klikr app for you?</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Rating the app — not the host's questions.
      </p>

      <div className="mt-4 flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hovered || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} of 5`}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className="h-7 w-7"
                style={{
                  color: active ? "#f59e0b" : "#cbd5e1",
                  fill: active ? "#f59e0b" : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>

      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything else? (optional)"
            rows={3}
            maxLength={1000}
            className="input mt-4 w-full resize-none text-sm"
          />
          {error && (
            <p className="mt-2 text-xs" style={{ color: "var(--danger, #fca5a5)" }}>
              {error}
            </p>
          )}
          <button
            onClick={send}
            disabled={pending}
            className="btn-primary mt-4 text-sm disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send feedback"}
          </button>
        </>
      )}
    </div>
  );
}
