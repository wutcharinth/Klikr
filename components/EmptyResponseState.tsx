import React from "react";
import { Sparkles } from "lucide-react";

// Shared empty state for slide-type renderers when no responses have arrived
// yet. Calm, helpful, presentation-ready — never just "no data".
export function EmptyResponseState({
  title = "Waiting for responses…",
  body = "First answer will appear here the moment it lands.",
  className,
}: {
  title?: string;
  body?: string;
  className?: string;
}) {
  return (
    <div
      className={`anim-fade-up flex flex-col items-center justify-center gap-3 py-10 text-center ${className ?? ""}`}
      role="status"
      aria-live="polite"
    >
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: "rgba(0,113,227,0.10)",
          border: "1px solid rgba(0,113,227,0.30)",
          color: "var(--blue)",
        }}
      >
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{title}</div>
      <div className="max-w-sm text-sm muted-text leading-relaxed">{body}</div>
    </div>
  );
}
