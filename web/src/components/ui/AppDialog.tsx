"use client";

import { usePresence } from "@/components/ui/usePresence";
import { createPortal } from "react-dom";
import { useTranslations } from "@/i18n/locale-provider";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function AppDialog({
  title,
  children,
  onClose,
  footer,
  open = true,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  open?: boolean;
}) {
  const t = useTranslations();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { mounted, exiting } = usePresence(open);

  useEffect(() => {
    if (!mounted || exiting) {
      return;
    }
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mounted, exiting]);

  if (!mounted) {
    return null;
  }

  // Portal to <body>: rendered inside the page's <main> (z-10 stacking context, scroll container),
  // the overlay sat under the top bar and bottom nav, and iOS Safari can mis-paint a fixed layer
  // inside a scrolling element.
  return createPortal(
    <div
      className={`anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-8 ${exiting ? "is-exit" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`anim-sheet w-full max-w-[320px] rounded-[16px] bg-[#170304] p-5 ring-1 ring-white/15 ${exiting ? "is-exit" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-[18px] leading-none font-bold text-white">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={t("common.closeAria")}
            className="anim-press flex size-6 shrink-0 items-center justify-center text-white/70"
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/checkin-close.svg" alt="" width={14} height={14} />
          </button>
        </div>
        <div className="mt-4 text-[14px] leading-relaxed text-white/80">{children}</div>
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
