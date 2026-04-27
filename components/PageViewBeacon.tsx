"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordPageView } from "@/app/track-view/actions";

export function PageViewBeacon() {
  const pathname = usePathname();
  // Avoid double-firing on the same path (StrictMode mounts the effect twice
  // in dev and the App Router can re-render with the same pathname).
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    recordPageView({ path: pathname, referrer }).catch(() => {});
  }, [pathname]);

  return null;
}
