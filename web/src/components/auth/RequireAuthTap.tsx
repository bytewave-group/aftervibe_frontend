"use client";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import type { ReactNode } from "react";

/**
 * Intercepts a click when the user is logged out and opens the login popup
 * at /?auth=login&redirect=<href>. When logged in, the click is a no-op unless
 * `onAuthed` is provided.
 */
export function RequireAuthTap({
  href,
  className,
  children,
  ariaLabel,
  onAuthed,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  onAuthed?: () => void;
}) {
  const requireAuth = useRequireAuth();

  return (
    <button
      type="button"
      className={className ? `anim-press ${className}` : "anim-press"}
      aria-label={ariaLabel}
      onClick={() => {
        if (!requireAuth(href)) {
          return;
        }
        onAuthed?.();
      }}
    >
      {children}
    </button>
  );
}
