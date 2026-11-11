"use client";

import { usePresence } from "@/components/ui/usePresence";
import { useEffect, useId, type ReactNode } from "react";

export function GiftDialog({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const { mounted, exiting } = usePresence(open);

  useEffect(() => {
    if (!mounted || exiting) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, mounted, exiting]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-8 ${exiting ? "is-exit" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`anim-sheet w-full max-w-[320px] overflow-hidden rounded-[16px] bg-[#1e1e1e] p-5 ${exiting ? "is-exit" : ""}`}
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1e1e1e 0%, #1e1e1e 45%, #6b1519 100%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-[18px] leading-none font-bold text-white">
          {title}
        </h2>
        <div className="mt-4 text-[14px] leading-relaxed text-white/80">{children}</div>
        <div className="mt-5">{footer}</div>
      </div>
    </div>
  );
}

export function GiftDialogButtons({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  busy = false,
  confirmDisabled = false,
}: {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={busy}
        className="anim-press flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-white/10 text-[15px] font-bold text-white disabled:opacity-50"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        disabled={busy || confirmDisabled}
        className="anim-press anim-btn-shimmer flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#d01f25] text-[15px] font-bold text-white disabled:opacity-50"
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
