"use client";

import { usePresence } from "@/components/ui/usePresence";
import { useTranslations } from "@/i18n/locale-provider";
import { formatInt } from "@/lib/mock/recharge";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type RechargeResult =
  | { kind: "paid"; diamonds: number; balance: number | null }
  /** Failed, cancelled, still pending after polling, or the status check failed: all shown as "not completed". */
  | { kind: "failed" };

/**
 * Outcome popup after returning from the payment page.
 * iOS 15-safe: inline rgba backdrop (no color-mix), explicit top/right/bottom/left (no `inset`),
 * absolute badge placed with px offsets (no translate utilities), portal to <body>.
 */
export function RechargeResultDialog({
  result,
  onClose,
}: {
  result: RechargeResult | null;
  onClose: () => void;
}) {
  const t = useTranslations();
  const titleId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const { mounted, exiting } = usePresence(result !== null);
  const canPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Keep the last result on screen during the close animation.
  const [last, setLast] = useState<RechargeResult | null>(result);
  if (result && result !== last) {
    setLast(result);
  }
  const shown = result ?? last;

  useEffect(() => {
    if (!mounted || exiting) {
      return;
    }
    okRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, exiting, onClose]);

  if (!mounted || !shown || !canPortal) {
    return null;
  }

  const paid = shown.kind === "paid";
  const title = paid ? t("recharge.resultPaidTitle") : t("recharge.resultFailedTitle");
  const body = shown.kind === "paid" ? t("recharge.paid", { n: formatInt(shown.diamonds) }) : t("recharge.notCompleted");

  return createPortal(
    <div
      className={`anim-backdrop z-50 flex items-center justify-center px-8 ${exiting ? "is-exit" : ""}`}
      style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0, 0, 0, 0.75)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`anim-sheet w-full max-w-[300px] rounded-[16px] px-5 pt-6 pb-5 text-center ${exiting ? "is-exit" : ""}`}
        style={{
          background: "linear-gradient(180deg, #2a0709 0%, #170304 100%)",
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.15)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto" style={{ width: 64, height: 64 }}>
          {paid ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/diamond.png" alt="" width={64} height={64} style={{ display: "block", width: 64, height: 64, objectFit: "contain" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/checkin-check.svg"
                alt=""
                width={24}
                height={24}
                className="anim-scale-in"
                style={{ position: "absolute", right: -4, bottom: -2, width: 24, height: 24 }}
              />
            </>
          ) : (
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" style={{ display: "block" }}>
              <circle cx="32" cy="32" r="30" fill="#D01F25" />
              <circle cx="32" cy="32" r="28.5" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="3" />
              <path d="M23 23l18 18M41 23L23 41" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <h2 id={titleId} className="mt-4 text-[18px] leading-snug font-bold text-white">
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-white/80">{body}</p>
        {paid && shown.balance != null ? (
          <p className="mt-1 text-[12px] leading-relaxed text-white/55">
            {t("recharge.resultBalance", { n: formatInt(shown.balance) })}
          </p>
        ) : null}

        <button
          ref={okRef}
          type="button"
          onClick={onClose}
          className="anim-press mt-5 flex h-[44px] w-full items-center justify-center rounded-full text-[16px] font-bold text-white"
          style={{ backgroundColor: "#c62828" }}
        >
          {t("recharge.resultOk")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
