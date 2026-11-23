"use client";

import { useTranslations } from "@/i18n/locale-provider";
import { createPortal } from "react-dom";
import { usePresence } from "@/components/ui/usePresence";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

interface RankingsDialogProps {
  onClose?: () => void;
  open?: boolean;
  children: ReactNode;
}

export function RankingsDialog({ onClose, open = true, children }: RankingsDialogProps) {
  const t = useTranslations();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    onClose?.();
  }, [onClose]);
  const { mounted, exiting } = usePresence(open);

  useEffect(() => {
    if (!mounted || exiting) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [close, mounted, exiting]);

  if (!mounted) {
    return null;
  }

  // Portal to <body>: rendered inside the page's <main> (z-10 stacking context, scroll container),
  // the overlay sat under the top bar and bottom nav, and iOS Safari can mis-paint a fixed layer
  // inside a scrolling element.
  return createPortal(
    <div
      className={`anim-backdrop fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 px-5 ${exiting ? "is-exit" : ""}`}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`anim-sheet relative w-full max-w-[360px] ${exiting ? "is-exit" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-visible rounded-[16px] bg-[#1A0A0C] pt-[36px] pb-4 ring-1 ring-white/10">
          <div className="pointer-events-none absolute top-0 left-1/2 z-10 h-[56px] w-[280px] -translate-x-1/2 -translate-y-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/checkin-ribbon.svg"
              alt=""
              width={280}
              height={56}
              className="absolute inset-0 h-[56px] w-[280px] max-w-none"
            />
            <h2
              id={titleId}
              className="relative flex h-full items-center justify-center text-[18px] leading-none font-bold text-white"
            >
              {t("home.rankings.title")}
            </h2>
          </div>

          <div className="anim-stagger relative z-10 max-h-[min(70dvh,560px)] overflow-y-auto px-3 pt-2">
            {children}
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          className="anim-press mx-auto mt-4 flex size-8 items-center justify-center"
          aria-label={t("home.rankings.closeAria")}
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/checkin-close.svg" alt="" width={32} height={32} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
