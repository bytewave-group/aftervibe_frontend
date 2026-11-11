"use client";

import { claimCheckinAction, loadCheckinStatusAction } from "@/lib/api/checkin-actions";
import { mockCheckinStatus, type CheckinStatus, type DayState } from "@/lib/mock/checkin";
import { useTranslations } from "@/i18n/locale-provider";
import { MotionBurst } from "@/components/motion/MotionBurst";
import { usePresence } from "@/components/ui/usePresence";
import { useEffect, useId, useRef, useState } from "react";

interface CheckinDialogProps {
  onClose: () => void;
  open?: boolean;
  /** When set, skip the API and render this week (used by the preview path). */
  previewStatus?: CheckinStatus;
}

type Feedback = "loading" | "claiming" | "success" | "already_claimed" | "error" | "load_error" | null;

function labelBarClass(day: number, state: DayState): string {
  if (day === 7) return "bg-[#FDA565] text-white";
  if (state === "locked") return "bg-[#6B6B6B] text-white";
  return "bg-[#D01F25] text-white";
}

function dayAria(
  t: (key: string, vars?: Record<string, string | number>) => string,
  day: number,
  state: DayState,
): string {
  if (state === "claimed") return t("checkin.claimedAria", { n: day });
  if (state === "today") return t("checkin.todayAria", { n: day });
  return t("checkin.lockedAria", { n: day });
}

function feedbackText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  feedback: Feedback,
  reward: string | null,
): string | null {
  switch (feedback) {
    case "claiming":
      return t("checkin.claiming");
    case "success":
      return t("checkin.success", { reward: reward ?? "" });
    case "already_claimed":
      return t("checkin.alreadyClaimed");
    case "error":
      return t("checkin.error");
    case "load_error":
      return t("checkin.loadError");
    default:
      return null;
  }
}

export function CheckinDialog({ onClose, previewStatus, open = true }: CheckinDialogProps) {
  const t = useTranslations();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<CheckinStatus | null>(previewStatus ?? null);
  const [feedback, setFeedback] = useState<Feedback>(previewStatus ? null : "loading");
  const [reward, setReward] = useState<string | null>(previewStatus?.reward ?? null);
  const [celebratedDay, setCelebratedDay] = useState<number | null>(null);
  const { mounted, exiting } = usePresence(open);

  useEffect(() => {
    if (previewStatus || !open) return;
    let cancelled = false;
    void loadCheckinStatusAction().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus(result.status);
        setReward(result.status.reward);
        setFeedback(result.status.checkedIn ? "already_claimed" : null);
        return;
      }
      setStatus(null);
      setFeedback("load_error");
    });
    return () => {
      cancelled = true;
    };
  }, [previewStatus, open]);

  useEffect(() => {
    if (!mounted || exiting) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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

  const claimToday = async () => {
    if (!status || status.checkedIn || feedback === "claiming" || feedback === "load_error") return;
    const today = status.days.find((day) => day.state === "today");
    if (!today) return;
    setFeedback("claiming");
    const result = await claimCheckinAction(status);
    if (result.ok) {
      setStatus(result.status);
      setReward(result.reward);
      setCelebratedDay(today.day);
      setFeedback("success");
      return;
    }
    if (result.reason === "already_claimed") {
      setStatus(result.status ?? status);
      setFeedback("already_claimed");
      return;
    }
    setFeedback("error");
  };

  const days = status?.days;
  const placeholders = mockCheckinStatus.days.map((day) => ({
    ...day,
    state: "locked" as const,
  }));
  const message = feedbackText(t, feedback, reward);

  return (
    <div
      className={`anim-backdrop fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 px-6 ${exiting ? "is-exit" : ""}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`anim-sheet relative w-full max-w-[327px] ${exiting ? "is-exit" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-visible rounded-[16px] pt-[36px] pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/checkin-panel.svg"
            alt=""
            className="absolute inset-0 size-full rounded-[16px]"
          />

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
              {t("checkin.title")}
            </h2>
          </div>

          <div className="relative z-10 px-4">
            <p className="text-center text-[11px] leading-[16px] text-white/70">
              {t("checkin.subtitle")}
            </p>

            <div className="anim-stagger mt-4 grid grid-cols-4 gap-[8px]">
              {(days ?? placeholders).map((day) => (
                <DayTile
                  key={day.day}
                  label={day.label}
                  state={day.state}
                  wide={day.day === 7}
                  ariaLabel={dayAria(t, day.day, day.state)}
                  labelBarClass={labelBarClass(day.day, day.state)}
                  claiming={feedback === "claiming" && day.state === "today"}
                  celebrate={day.day === celebratedDay}
                  onClaim={status && day.state === "today" ? claimToday : undefined}
                />
              ))}
            </div>

            {feedback === "loading" ? (
              <p className="mt-3 text-center text-[12px] leading-none text-white/60">
                {t("checkin.loading")}
              </p>
            ) : message ? (
              <p
                className={`mt-3 text-center text-[12px] leading-snug ${
                  feedback === "error" || feedback === "load_error"
                    ? "text-[#F0454A]"
                    : "text-[#FDA565]"
                }`}
                role="status"
              >
                {message}
              </p>
            ) : (
              <div className="mt-3 h-[16px]" />
            )}
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          className="anim-press mx-auto mt-4 flex size-8 items-center justify-center"
          aria-label={t("checkin.closeAria")}
          onClick={onClose}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/checkin-close.svg" alt="" width={32} height={32} />
        </button>
      </div>
    </div>
  );
}

function DayTile({
  label,
  state,
  ariaLabel,
  labelBarClass,
  wide,
  claiming,
  celebrate,
  onClaim,
}: {
  label: string;
  state: DayState;
  ariaLabel: string;
  labelBarClass: string;
  wide?: boolean;
  claiming?: boolean;
  celebrate?: boolean;
  onClaim?: () => void;
}) {
  const claimedOrToday = state !== "locked";
  const clickable = Boolean(onClaim) && !claiming;

  return (
    <button
      type="button"
      disabled={!clickable}
      aria-label={ariaLabel}
      aria-disabled={!clickable}
      onClick={onClaim}
      className={`anim-press relative flex flex-col overflow-hidden rounded-[10px] bg-[#1A0A0C] ring-1 ring-white/10 ${
        wide ? "col-span-2 h-[92px]" : "h-[92px] w-full"
      } ${clickable ? "cursor-pointer" : "cursor-default"} ${claiming ? "opacity-70" : ""}`}
    >
      <span className="flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            wide
              ? "/images/checkin-chest.png"
              : claimedOrToday
                ? "/images/checkin-diamond-orange.png"
                : "/images/checkin-diamond-silver.png"
          }
          alt=""
          width={wide ? 72 : 40}
          height={wide ? 54 : 40}
          className={wide ? "h-[54px] w-[72px] object-contain" : "size-[40px] object-contain"}
        />
      </span>
      <span
        className={`flex h-[22px] w-full shrink-0 items-center justify-center text-[12px] leading-none font-bold ${labelBarClass}`}
      >
        {label}
      </span>
      {state === "claimed" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55">
          {celebrate ? <MotionBurst /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/checkin-check-overlay.svg"
            alt=""
            width={36}
            height={36}
            className={`relative z-10 size-9 ${celebrate ? "anim-tick-pop" : "anim-scale-in"}`}
          />
        </span>
      ) : null}
    </button>
  );
}
