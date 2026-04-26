"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export default function AIGenerateButton({ autoOpen = false }: { autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  async function go() {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      router.push(`/edit/${json.presentation_id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-dark">
        <Sparkles className="h-4 w-4" /> Generate with AI
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => !busy && setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="panel w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold tracking-tight">Generate a deck</h3>
            <p className="mt-1 text-sm muted-text">Describe your meeting in one line. We'll build the slides.</p>
            <textarea
              autoFocus
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Q4 retro for an 8-person engineering team — 5 slides"
              disabled={busy}
              className="input mt-4 py-3"
              style={{ height: "auto" }}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "Sprint retro for engineering",
                "Icebreaker for a 50-person all-hands",
                "5-question quiz on photosynthesis",
                "Brainstorm: marketing campaign ideas",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  disabled={busy}
                  className="rounded-full px-3 py-1 text-xs muted-text"
                  style={{ border: "1px solid var(--line)" }}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-3 text-xs" style={{ color: "#b91c1c" }}>{error}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={busy} className="btn-ghost text-sm">Cancel</button>
              <button onClick={go} disabled={busy || !prompt.trim()} className="btn-primary text-sm">
                {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Building…</> : <><Sparkles className="h-3.5 w-3.5" /> Generate</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
