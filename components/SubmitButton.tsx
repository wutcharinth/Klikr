"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * A form submit button that shows a spinner and disables itself while the
 * form's server action runs, so a slow create/duplicate doesn't look like a
 * dead click (and can't be double-submitted).
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {pending ? (
        pendingLabel ?? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        children
      )}
    </button>
  );
}
