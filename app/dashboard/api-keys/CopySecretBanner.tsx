"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopySecretBanner({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="anim-fade-up mt-6 rounded-2xl p-4"
      style={{ border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.06)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--green, #16a34a)" }}>
        Copy this key now — it will not be shown again.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="mono flex-1 truncate rounded-md px-3 py-2 text-xs" style={{ background: "rgba(0,0,0,0.04)" }}>
          {secret}
        </code>
        <button onClick={copy} className="btn-ghost text-xs">
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
