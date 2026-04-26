"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const [isPending, start] = useTransition();

  function setLocale(next: "en" | "th") {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    start(() => {
      window.location.reload();
    });
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full p-0.5 text-xs"
      style={{ background: "var(--pale)", border: "1px solid var(--line)" }}
      aria-label="Language"
    >
      <Globe className="ml-1.5 h-3 w-3 muted-text" aria-hidden />
      <button
        type="button"
        onClick={() => setLocale("en")}
        disabled={isPending}
        className="rounded-full px-2 py-0.5 transition-colors"
        style={
          locale === "en"
            ? { background: "var(--white)", color: "var(--ink)", fontWeight: 600 }
            : { color: "var(--neutral)" }
        }
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("th")}
        disabled={isPending}
        className="rounded-full px-2 py-0.5 transition-colors"
        style={
          locale === "th"
            ? { background: "var(--white)", color: "var(--ink)", fontWeight: 600 }
            : { color: "var(--neutral)" }
        }
      >
        ไทย
      </button>
    </div>
  );
}
