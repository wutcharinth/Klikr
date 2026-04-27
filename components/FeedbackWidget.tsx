"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus, Star, X } from "lucide-react";
import { submitFeedback } from "@/app/feedback/actions";

export function FeedbackWidget({ persona = "host" }: { persona?: "host" | "audience" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    // Reset after the modal animates out, so the user briefly sees the
    // "thanks" state before it clears for the next time they open it.
    setTimeout(() => {
      setRating(0);
      setHovered(0);
      setComment("");
      setSubmitted(false);
      setError(null);
    }, 250);
  }

  function send() {
    if (rating < 1) return;
    setError(null);
    startTransition(async () => {
      const res = await submitFeedback({
        rating,
        comment,
        persona,
        pagePath: typeof window !== "undefined" ? window.location.pathname : "",
      });
      if (res.error) {
        setError(res.error === "auth_required" ? "Sign in to send feedback." : res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Send feedback"
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-40 flex h-11 items-center gap-2 rounded-full px-4 text-xs uppercase tracking-[0.16em] shadow-lg transition-transform hover:scale-105"
        style={{
          background: "var(--blue)",
          color: "#fff",
          boxShadow: "0 10px 24px -10px rgba(0,113,227,.55)",
        }}
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="panel w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">How is Klikr working for you?</h3>
                <p className="mt-1 text-xs muted-text">Goes straight to the developer.</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="muted-text hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="mt-6 text-center">
                <p className="text-2xl">🙏</p>
                <p className="mt-2 text-sm">Thanks — feedback sent.</p>
                <button onClick={close} className="btn-primary mt-5 text-sm">Done</button>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hovered || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(n)}
                        aria-label={`Rate ${n}`}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className="h-7 w-7"
                          style={{
                            color: active ? "#f59e0b" : "var(--line-strong)",
                            fill: active ? "#f59e0b" : "transparent",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What's working? What's annoying? (optional)"
                  rows={4}
                  maxLength={2000}
                  className="input mt-5 w-full resize-none text-sm"
                />

                {error && <p className="mt-3 text-xs" style={{ color: "var(--danger, #fca5a5)" }}>{error}</p>}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button onClick={close} className="btn-ghost text-sm">Cancel</button>
                  <button
                    onClick={send}
                    disabled={rating < 1 || pending}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {pending ? "Sending…" : "Send feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
