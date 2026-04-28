"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["→", "Space"], label: "Next slide" },
  { keys: ["←"], label: "Previous slide" },
  { keys: ["F"], label: "Toggle fullscreen" },
  { keys: ["R"], label: "Show / hide quiz leaderboard" },
  { keys: ["?"], label: "Show this cheatsheet" },
  { keys: ["Esc"], label: "Close cheatsheet / exit fullscreen" },
];

// Modal listing presenter keyboard shortcuts. Triggered by `?`. Closes on Esc
// or backdrop click.
export function PresenterShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Keyboard shortcuts</h3>
            <p className="mt-1 text-xs muted-text">For presenters running a live session.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="muted-text hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {ROWS.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{ background: "rgba(0,0,0,0.03)", border: "1px solid var(--line)" }}
            >
              <span>{row.label}</span>
              <span className="flex items-center gap-1.5">
                {row.keys.map((k) => (
                  <kbd
                    key={k}
                    className="mono inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--line-strong)",
                      minWidth: 28,
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
