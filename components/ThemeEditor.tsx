"use client";

import { useState, useTransition } from "react";
import { Palette, Loader2 } from "lucide-react";
import type { Theme } from "@/lib/types";
import { updatePresentationTheme } from "@/app/edit/[id]/actions";

const PRESET_COLORS = [
  "#0071E3", "#00C2FF", "#7F7FD5", "#11998E",
  "#F2994A", "#FF4E50", "#a06f00", "#1d1d1f",
];

export default function ThemeEditor({
  presentationId,
  initial,
}: {
  presentationId: string;
  initial: Theme | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState(initial?.accent_color ?? "#0071E3");
  const [logo, setLogo] = useState(initial?.logo_url ?? "");
  const [mode, setMode] = useState<"light" | "dark">(initial?.mode ?? "light");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updatePresentationTheme(presentationId, {
        accent_color: accent,
        logo_url: logo || null,
        mode,
      });
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Palette className="h-4 w-4" /> Theme
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md p-6">
        <h3 className="text-lg font-semibold tracking-tight">Theme this presentation</h3>
        <p className="mt-1 text-sm muted-text">Your logo and colors show on every screen.</p>

        <label className="mt-5 block text-xs font-medium muted-text">Accent color</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              className="h-8 w-8 rounded-full transition-transform hover:scale-110"
              style={{ background: c, boxShadow: c === accent ? "0 0 0 3px rgba(0,113,227,0.4)" : "0 0 0 1px var(--line)" }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-full border-0"
          />
        </div>

        <label className="mt-5 block text-xs font-medium muted-text">Logo URL</label>
        <input
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://your-domain.com/logo.png"
          className="input mt-1"
        />

        <label className="mt-5 block text-xs font-medium muted-text">Mode</label>
        <div className="mt-2 flex gap-2">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 rounded-full px-4 py-2 text-sm transition-colors"
              style={
                mode === m
                  ? { background: "var(--ink)", color: "var(--white)" }
                  : { background: "transparent", color: "var(--neutral)", border: "1px solid var(--line)" }
              }
            >
              {m === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>

        <div
          className="mt-5 rounded-2xl p-5"
          style={{
            background: mode === "dark" ? "var(--graphite-1)" : "var(--pale)",
            color: mode === "dark" ? "#fff" : "var(--ink)",
          }}
        >
          <p className="text-xs uppercase tracking-wider opacity-60">Preview</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: accent, color: "#fff" }}>
            Live result
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} disabled={pending} className="btn-ghost text-sm">Cancel</button>
          <button onClick={save} disabled={pending} className="btn-primary text-sm">
            {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save theme"}
          </button>
        </div>
      </div>
    </div>
  );
}
