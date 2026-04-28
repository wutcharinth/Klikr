"use client";

import React from "react";

export type SessionStatus = "draft" | "waiting" | "live" | "open" | "closed" | "showing" | "ended";

const TONE: Record<
  SessionStatus,
  { label: string; bg: string; fg: string; dotPulse?: boolean; dotColor?: string }
> = {
  draft: { label: "Draft", bg: "rgba(0,0,0,0.04)", fg: "var(--neutral)" },
  waiting: { label: "Waiting", bg: "rgba(0,0,0,0.04)", fg: "var(--neutral)" },
  live: { label: "Live", bg: "rgba(0,113,227,0.08)", fg: "var(--blue)", dotPulse: true, dotColor: "var(--blue)" },
  open: { label: "Open", bg: "rgba(34,197,94,0.10)", fg: "#16a34a", dotColor: "#16a34a" },
  closed: { label: "Closed", bg: "rgba(245,158,11,0.10)", fg: "#b45309", dotColor: "#f59e0b" },
  showing: { label: "Showing results", bg: "rgba(0,113,227,0.08)", fg: "var(--blue)", dotColor: "var(--blue)" },
  ended: { label: "Ended", bg: "rgba(0,0,0,0.04)", fg: "var(--neutral)" },
};

// Single source of truth for live-session status pills. Used on host + audience.
export function SessionStatusPill({
  state,
  className,
  ariaLive = "polite",
}: {
  state: SessionStatus;
  className?: string;
  ariaLive?: "polite" | "off";
}) {
  const t = TONE[state];
  return (
    <span
      role="status"
      aria-live={ariaLive}
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${className ?? ""}`}
      style={{
        background: t.bg,
        color: t.fg,
        border: "1px solid currentColor",
        borderColor: "rgba(0,0,0,0.06)",
      }}
    >
      {t.dotColor ? (
        <span
          aria-hidden
          className={t.dotPulse ? "live-dot pulse-ring" : ""}
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: t.dotColor,
            display: "inline-block",
            color: t.dotColor,
          }}
        />
      ) : null}
      {t.label}
    </span>
  );
}
