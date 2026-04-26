"use client";

import { useState } from "react";
import { Shuffle, Sparkles } from "lucide-react";

interface Props {
  action: (formData: FormData) => Promise<void>;
  poolSize: number;
  defaultCount: number;
}

export default function ApplyTemplateForm({ action, poolSize, defaultCount }: Props) {
  const [count, setCount] = useState(defaultCount);
  const [shuffle, setShuffle] = useState(false);
  const hasPool = poolSize > defaultCount;

  return (
    <form action={action}>
      <input type="hidden" name="count" value={count} />
      <input type="hidden" name="shuffle" value={String(shuffle)} />

      {hasPool && (
        <div
          className="mb-4 rounded-2xl p-4 space-y-4"
          style={{ background: "var(--pale)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">Questions</p>
              <p className="text-xs muted-text mt-0.5">
                {poolSize} available · pick how many to use
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium transition-colors"
                style={{ background: "var(--white)", border: "1px solid var(--line)" }}
                aria-label="Fewer questions"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-semibold tabular-nums">{count}</span>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(poolSize, c + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium transition-colors"
                style={{ background: "var(--white)", border: "1px solid var(--line)" }}
                aria-label="More questions"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShuffle((s) => !s)}
            className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors"
            style={{
              background: shuffle ? "var(--blue)" : "var(--white)",
              color: shuffle ? "var(--white)" : "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            <span className="flex items-center gap-2">
              <Shuffle className="h-4 w-4" />
              Shuffle questions
            </span>
            <span
              className="text-xs"
              style={{ opacity: 0.7 }}
            >
              {shuffle ? "on" : "off"}
            </span>
          </button>
        </div>
      )}

      <button type="submit" className="btn-primary w-full justify-center">
        <Sparkles className="h-4 w-4" />
        Use template
        {hasPool && <span className="ml-1 opacity-70">· {count} slides</span>}
      </button>
    </form>
  );
}
