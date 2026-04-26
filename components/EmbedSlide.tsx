"use client";

import { ExternalLink } from "lucide-react";
import type { EmbedConfig } from "@/lib/types";

const ALLOWED = ["docs.google.com", "drive.google.com", "onedrive.live.com", "office.com", "office.live.com", "1drv.ms"];

function isAllowed(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function EmbedSlide({ config }: { config: EmbedConfig }) {
  if (!config.url) {
    return (
      <div className="panel-soft p-12 text-center text-sm muted-text">
        Add an embed URL in the editor to show your slide here.
      </div>
    );
  }
  if (!isAllowed(config.url)) {
    return (
      <div className="panel-soft p-8 text-center text-sm">
        <p style={{ color: "#b91c1c" }}>This embed URL isn't on the allowlist.</p>
        <p className="mt-2 muted-text">Only Google Slides, PowerPoint Web, and Office.com URLs are allowed.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
        <iframe
          src={config.url}
          allow="autoplay; fullscreen"
          referrerPolicy="no-referrer"
          className="h-full w-full"
        />
      </div>
      <a href={config.url} target="_blank" rel="noopener noreferrer" className="muted-text text-xs inline-flex items-center gap-1 hover:text-[var(--ink)]">
        <ExternalLink className="h-3 w-3" /> Open in new tab
      </a>
    </div>
  );
}
