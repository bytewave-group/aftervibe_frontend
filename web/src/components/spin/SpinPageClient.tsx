"use client";

import { MotionBurst } from "@/components/motion/MotionBurst";
import { AppDialog } from "@/components/ui/AppDialog";
import { useTranslations } from "@/i18n/locale-provider";
import { performSpin } from "@/lib/api/spin";
import {
  SLOT_ANGLE,
  SPIN_DURATION_MS,
  type SpinPrize,
  type SpinResult,
  type SpinStatus,
} from "@/lib/mock/spin";
import { useEffect, useState, useSyncExternalStore } from "react";

const WHEEL_SIZE = 300;

function prizeLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  prize: SpinPrize,
): string {
  return prize.type === "coins"
    ? t("spin.prizeCoins", { n: prize.amount })
    : t("spin.prizePoints", { n: prize.amount });
}

function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
}


function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function SpinPageClient({ initialStatus }: { initialStatus: SpinStatus }) {
  const t = useTranslations();
  const [status, setStatus] = useState(initialStatus);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heldResult, setHeldResult] = useState<SpinResult | null>(result);
  if (result && heldResult !== result) {
    setHeldResult(result);
  }
  const dialogResult = result ?? heldResult;
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (status.nextSpinSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setStatus((current) => ({
        ...current,
        nextSpinSeconds: Math.max(0, current.nextSpinSeconds - 1),
      }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [status.nextSpinSeconds]);

  const paidOptions = (["coins", "points"] as const).filter(
    (type) => status.cost[type] != null,
  );
  const canAfford = (type: "coins" | "points") =>
    type === "coins"
      ? status.balance >= (status.cost.coins ?? 0)
      : status.rewardPoints >= (status.cost.points ?? 0);

  const runSpin = async (payWith?: "coins" | "points" | null) => {
    if (spinning) {
      return;
    }
    setSpinning(true);
    setError(null);
    setResult(null);

    try {
      const next = await performSpin(status, payWith);
      const duration = reduceMotion ? 200 : SPIN_DURATION_MS;

      setRotation((prev) => {
        const current = ((prev % 360) + 360) % 360;
        const target = (360 - next.prizeIndex * SLOT_ANGLE) % 360;
        return prev + 1440 + ((target - current + 360) % 360);
      });

      window.setTimeout(() => {
        setStatus((current) => ({
          ...current,
          chances: next.chances,
          balance: next.balance,
          rewardPoints: next.rewardPoints,
          nextSpinSeconds: next.chances > 0 ? 0 : current.nextSpinSeconds || 1,
        }));
        setResult(next);
        setSpinning(false);
      }, duration);
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : t("spin.error"),
      );
      setSpinning(false);
    }
  };

  const centerLabel =
    status.dailyChances > 0
      ? status.chances > 0
        ? t("spin.now")
        : formatCountdown(status.nextSpinSeconds)
      : t("spin.paid");
  const centerCaption =
    status.dailyChances > 0 ? t("spin.nextFree") : t("spin.paid");

  return (
    <div className="flex flex-col items-center px-6 pb-8">
      <div
        className="relative mt-6"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${(reduceMotion ? 200 : SPIN_DURATION_MS) / 1000}s cubic-bezier(0.08, 0.85, 0.12, 1)`
              : "none",
            background:
              "conic-gradient(from -22.5deg, #d01f25 0deg 45deg, #2a0c0e 45deg 90deg, #d01f25 90deg 135deg, #2a0c0e 135deg 180deg, #d01f25 180deg 225deg, #2a0c0e 225deg 270deg, #d01f25 270deg 315deg, #2a0c0e 315deg 360deg)",
            boxShadow:
              "0 0 0 6px #fda565, 0 0 0 10px #5a2208, 0 10px 28px rgba(0,0,0,0.55)",
          }}
        >
          {status.prizes.map((prize, index) => {
            const angle = index * SLOT_ANGLE;
            const radius = WHEEL_SIZE * 0.32;
            const rad = ((angle - 90) * Math.PI) / 180;
            const x = WHEEL_SIZE / 2 + radius * Math.cos(rad);
            const y = WHEEL_SIZE / 2 + radius * Math.sin(rad);
            return (
              <span
                key={`${prize.type}-${prize.amount}-${index}`}
                className={`absolute w-[72px] text-center text-[12px] leading-tight font-bold ${
                  prize.type === "coins" ? "text-[#fda565]" : "text-white"
                }`}
                style={{
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  textShadow: "0 1px 4px rgba(0,0,0,0.65)",
                }}
              >
                {prizeLabel(t, prize)}
              </span>
            );
          })}
        </div>

        <div
          className="absolute top-[-10px] left-1/2 z-10 -translate-x-1/2"
          aria-hidden="true"
        >
          <div
            className="h-0 w-0"
            style={{
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "18px solid #ffffff",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
          />
        </div>

        <div className="absolute top-1/2 left-1/2 z-10 flex size-[100px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[#170304] ring-[6px] ring-[#fda565]">
          <span className="text-[9px] leading-none font-bold tracking-wide text-[#fda565] uppercase">
            {centerCaption}
          </span>
          <strong className="mt-1.5 text-[16px] leading-none font-bold text-white tabular-nums">
            {centerLabel}
          </strong>
        </div>
      </div>

      <p className={`mt-8 rounded-full bg-[#d01f25] px-5 py-2 text-[13px] leading-none font-bold text-white ${status.chances > 0 ? "anim-glow" : ""}`}>
        {status.chances > 0
          ? t("spin.chances", { n: status.chances })
          : t("spin.chancesZero")}
      </p>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-white/70">
        {t("spin.myCoins", { n: status.balance })}
        <span className="mx-2 text-white/30">·</span>
        {t("spin.myPoints", { n: status.rewardPoints })}
      </p>

      {error ? (
        <p className="mt-3 text-center text-[13px] font-bold text-[#f0454a]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex w-full max-w-[320px] flex-col gap-3">
        {status.chances > 0 || paidOptions.length === 0 ? (
          <button
            type="button"
            disabled={spinning || status.chances <= 0}
            onClick={() => void runSpin()}
            className="anim-press anim-btn-shimmer flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#d01f25] text-[16px] leading-none font-bold text-white disabled:opacity-50"
          >
            {spinning
              ? t("spin.spinning")
              : status.chances > 0
                ? t("spin.freeSpin")
                : t("spin.unavailable")}
          </button>
        ) : (
          paidOptions.map((type) => {
            const enough = canAfford(type);
            const label = !enough
              ? type === "coins"
                ? t("spin.notEnoughCoins")
                : t("spin.notEnoughPoints")
              : type === "coins"
                ? t("spin.spinPaidCoins", { n: status.cost.coins ?? 0 })
                : t("spin.spinPaidPoints", { n: status.cost.points ?? 0 });
            return (
              <button
                key={type}
                type="button"
                disabled={spinning || !enough}
                onClick={() => void runSpin(type)}
                className="anim-press anim-btn-shimmer flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#d01f25] text-[16px] leading-none font-bold text-white disabled:opacity-50"
              >
                {spinning ? t("spin.spinning") : label}
              </button>
            );
          })
        )}
      </div>

      {dialogResult ? (
        <AppDialog
          open={result !== null}
          title={t("spin.resultTitle")}
          onClose={() => setResult(null)}
          footer={
            <button
              type="button"
              className="anim-press anim-btn-shimmer flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#d01f25] text-[16px] leading-none font-bold text-white"
              onClick={() => setResult(null)}
            >
              {t("spin.resultClose")}
            </button>
          }
        >
          <div className="relative py-4">
            <MotionBurst variant="confetti" />
            <p className="anim-scale-in relative z-10 text-center text-[28px] leading-none font-bold text-[#fda565]">
              {prizeLabel(t, dialogResult.prize)}
            </p>
          </div>
        </AppDialog>
      ) : null}
    </div>
  );
}
