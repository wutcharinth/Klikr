import { Sparkles } from "lucide-react";

/**
 * Soft-lock banner for plan-locked features. While FREE_FOR_ALL is on, this
 * shows a friendly "free for now" message instead of blocking. After the flag
 * flips, replace this in upgrade-walls with a real upgrade CTA.
 */
export default function PlanBanner({
  feature,
  className = "",
}: {
  feature: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
      style={{ background: "rgba(0,113,227,0.08)", color: "var(--blue)", border: "1px solid rgba(0,113,227,0.25)" }}
      title={`${feature} — free while we grow to 1,000 hosts.`}
    >
      <Sparkles className="h-3 w-3" /> {feature} · free for now
    </div>
  );
}
