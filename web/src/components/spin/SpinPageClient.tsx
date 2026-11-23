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
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";

const WHEEL_SIZE = 300;
const RIM_SIZE = 348;
/** Smallest wheel on very short screens (px). */
const RIM_MIN = 200;
/** Height the header, title, text block and button need besides the wheel (px). */
const RIM_HEIGHT_RESERVE = 340;
/** Prize label centre, as a fraction of the wheel size from its centre. */
const LABEL_RADIUS = 0.32;

/**
 * Design px (at the full 348px rim) → px at the measured rim size, so every layer scales together.
 * Not `cqw`: container query units need Safari 16+, and on iOS 15 every size using them was
 * dropped (giant pointer, collapsed hub, missing lights, oversized labels).
 */
function scaleToRim(px: number, rimPx: number): string {
  return `${Math.round((px / RIM_SIZE) * rimPx * 100) / 100}px`;
}

/** Rendered rim width in px (layout size, ignores transforms); RIM_SIZE until measured. */
function useRimSize(): [(node: HTMLDivElement | null) => void, number] {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState(RIM_SIZE);
  useLayoutEffect(() => {
    if (!node) return;
    const update = () => {
      if (node.offsetWidth > 0) setSize(node.offsetWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, size];
}

/** Design px (at the full 348px rim) → percentage of the rim. */
function pct(px: number): string {
  return `${(px / RIM_SIZE) * 100}%`;
}
const LIGHT_COUNT = 20;

function prizeLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  prize: SpinPrize,
  resolved = false,
): string {
  const min = prize.amountMin;
  const max = prize.amountMax;
  const showRange =
    !resolved &&
    min != null &&
    max != null &&
    Number(min) !== Number(max);

  if (showRange) {
    if (prize.type === "coins") {
      return t("spin.prizeRangeCoins", { min, max });
    }
    if (prize.type === "points") {
      return t("spin.prizeRangePoints", { min, max });
    }
  }

  if (prize.type === "coins") {
    return t("spin.prizeCoins", { n: prize.amount });
  }
  if (prize.type === "points") {
    return t("spin.prizePoints", { n: prize.amount });
  }
  if (prize.type === "none") {
    return prize.label || t("spin.prizeNone");
  }
  if (prize.type === "reward_package") {
    return t("spin.prizePackage", {
      name: prize.package?.name || prize.label || "",
    });
  }
  if (prize.type === "spin_chances") {
    return t("spin.prizeSpinChances", { n: prize.amount });
  }
  return prize.label || prize.package?.name || String(prize.amount);
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

const btnClass =
  "anim-press anim-btn-shimmer flex h-[52px] w-full items-center justify-center rounded-[8px] border-2 border-white bg-[#c62828] text-[18px] leading-none font-bold text-white shadow-[4px_5px_0_0_#3a070c] disabled:opacity-50";

function ArchTitle({ text }: { text: string }) {
  return (
    <svg
      viewBox="0 0 360 78"
      className="mt-1 h-[72px] w-full max-w-[360px]"
      aria-hidden="true"
    >
      <defs>
        <path id="spin-arch" d="M 18 70 Q 180 -8 342 70" fill="none" />
      </defs>
      <text
        fill="#e31b23"
        stroke="#ffffff"
        strokeWidth="5"
        paintOrder="stroke"
        fontSize="24"
        fontWeight="800"
        fontFamily="var(--font-noto-sans-sc), 'PingFang SC', 'Noto Sans SC', sans-serif"
      >
        <textPath href="#spin-arch" startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

/** Placeholder swapped for the emphasised count inside the translated free-spin line. */
const CHANCE_SLOT = "\u0001";

/** Free-spin line with the highlight on the glyphs (gold/white gradient text + red glow), not a band. */
function FreeChanceText({ text, n }: { text: string; n: number }) {
  const slot = text.indexOf(CHANCE_SLOT);
  return (
    <span className="spin-chance-text">
      {slot < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, slot)}
          <span className="spin-chance-num">{n}</span>
          {text.slice(slot + CHANCE_SLOT.length)}
        </>
      )}
    </span>
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
  const [rimRef, rimPx] = useRimSize();
  const cq = (px: number) => scaleToRim(px, rimPx);

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
          paidSpinsRemaining: next.paidSpinsRemaining ?? current.paidSpinsRemaining,
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

  return (
    <div className="relative flex flex-col items-center px-6 pb-8">
      <h2 className="sr-only">{t("spin.tagline")}</h2>
      <ArchTitle text={t("spin.tagline")} />

      <div className="relative -mt-3 flex w-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/spin-chevron.png"
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 w-[170%] max-w-none opacity-45 mix-blend-screen"
          style={{ transform: "translate(-50%, -46%)" }}
        />
      <div
        className="relative shrink-0"
        ref={rimRef}
        data-spin-rim
        style={{
          // One square for every wheel layer. Shrinks with the screen width and, on short screens,
          // with the height so the text and 转起来 button below stay in view.
          width: `min(100%, ${RIM_SIZE}px, max(${RIM_MIN}px, calc(100dvh - ${RIM_HEIGHT_RESERVE}px)))`,
          aspectRatio: "1 / 1",
        }}
      >
        <div
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,#8a1520_0%,#4a0a10_58%,#2a0508_100%)]"
          style={{
            boxShadow: `0 10px 28px rgba(0,0,0,0.55), inset 0 0 0 ${cq(4)} #2a0508, inset 0 0 0 ${cq(7)} #c9a14a`,
          }}
          aria-hidden="true"
        />

        {Array.from({ length: LIGHT_COUNT }, (_, index) => {
          const on = index % 2 === 0;
          const step = 360 / LIGHT_COUNT;
          return (
            <span
              key={index}
              className="absolute inset-0"
              style={{ transform: `rotate(${index * step}deg)` }}
              aria-hidden="true"
            >
              <span
                className={
                  on
                    ? "absolute left-1/2 rounded-full bg-[#ffe58a] shadow-[0_0_8px_2px_rgba(255,214,80,0.95)]"
                    : "absolute left-1/2 rounded-full bg-[#fff7d6] shadow-[0_0_4px_1px_rgba(255,255,255,0.55)]"
                }
                style={{
                  top: pct(11),
                  width: cq(10),
                  height: cq(10),
                  transform: "translate(-50%, -50%)",
                }}
              />
            </span>
          );
        })}

        <div
          className="absolute overflow-hidden rounded-full bg-[conic-gradient(from_-22.5deg,#e31b23_0deg_45deg,#ffffff_45deg_90deg,#e31b23_90deg_135deg,#ffffff_135deg_180deg,#e31b23_180deg_225deg,#ffffff_225deg_270deg,#e31b23_270deg_315deg,#ffffff_315deg_360deg)] shadow-[inset_0_0_0_3px_rgba(80,8,12,0.35)]"
          style={{
            width: pct(WHEEL_SIZE),
            height: pct(WHEEL_SIZE),
            left: pct((RIM_SIZE - WHEEL_SIZE) / 2),
            top: pct((RIM_SIZE - WHEEL_SIZE) / 2),
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${(reduceMotion ? 200 : SPIN_DURATION_MS) / 1000}s cubic-bezier(0.08, 0.85, 0.12, 1)`
              : "none",
          }}
        >
          {status.prizes.map((prize, index) => {
            const angle = index * SLOT_ANGLE;
            const onRed = index % 2 === 0;
            const image = prize.package?.image;
            return (
              <span
                key={`${prize.type}-${prize.amount}-${index}`}
                className="absolute inset-0"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className={`absolute left-1/2 flex flex-col items-center text-center leading-tight font-bold ${
                    onRed
                      ? "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
                      : "text-[#8b1018]"
                  }`}
                  style={{
                    top: `${50 - LABEL_RADIUS * 100}%`,
                    width: cq(76),
                    fontSize: cq(11),
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={image}
                      alt=""
                      width={28}
                      height={28}
                      className="mb-0.5 object-contain"
                      style={{ width: cq(28), height: cq(28) }}
                    />
                  ) : prize.type === "coins" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src="/images/diamond.png"
                      alt=""
                      width={22}
                      height={22}
                      className="mb-0.5 object-contain"
                      style={{ width: cq(22), height: cq(22) }}
                    />
                  ) : null}
                  {prizeLabel(t, prize)}
                </span>
              </span>
            );
          })}
        </div>

        <div
          className="absolute left-1/2 z-20"
          style={{ top: pct(6), width: cq(32), transform: "translateX(-50%)" }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 32 36"
            fill="none"
            style={{ display: "block", width: "100%", height: "auto" }}
          >
            <path
              d="M16 34 L2 6 Q16 0 30 6 Z"
              fill="#c62828"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="12" r="3.2" fill="#ffffff" />
          </svg>
        </div>

        <div
          className="absolute top-1/2 left-1/2 z-10 flex items-center justify-center rounded-full bg-[#c62828]"
          style={{
            transform: "translate(-50%, -50%)",
            width: cq(92),
            height: cq(92),
            boxShadow: `0 0 0 ${cq(5)} #ffffff, 0 4px 14px rgba(0,0,0,0.5)`,
          }}
        >
          <span
            className="leading-none font-bold text-white [text-shadow:0_2px_0_rgba(0,0,0,0.25)]"
            style={{ fontSize: cq(30) }}
          >
            {t("spin.hub")}
          </span>
        </div>
      </div>
      </div>

      <div className="mt-4 w-full max-w-[320px] text-center">
        {status.cost.points != null ? (
          <p className="text-[16px] leading-none font-bold text-white">
            {t("spin.costPoints", { n: status.cost.points })}
          </p>
        ) : null}
        {status.cost.coins != null ? (
          <p
            className={`text-[16px] leading-none font-bold text-white ${
              status.cost.points != null ? "mt-1.5 text-[13px] text-white/85" : ""
            }`}
          >
            {t("spin.costCoins", { n: status.cost.coins })}
          </p>
        ) : null}
        <p className="mt-2 text-[13px] leading-none text-white/90">
          {status.dailyChances > 0
            ? t(
                status.freeSpinPeriod === "weekly"
                  ? "spin.freeWeekly"
                  : "spin.freeDaily",
                { n: status.dailyChances },
              )
            : t(
                status.freeSpinPeriod === "weekly"
                  ? "spin.chancesZeroWeekly"
                  : "spin.chancesZero",
              )}
        </p>
        {status.chances > 0 ? (
          <p className="mt-3 text-[13px] leading-none font-bold text-white">
            <FreeChanceText
              text={t(
                status.freeSpinPeriod === "weekly"
                  ? "spin.chancesWeekly"
                  : "spin.chances",
                { n: CHANCE_SLOT },
              )}
              n={status.chances}
            />
          </p>
        ) : status.nextSpinSeconds > 0 ? (
          <p className="mt-3 text-[13px] leading-none text-white/80">
            {t("spin.nextFree")} {formatCountdown(status.nextSpinSeconds)}
          </p>
        ) : null}
        {status.paidSpinsRemaining != null && status.chances <= 0 ? (
          <p className="mt-2 text-[12px] leading-none text-white/70">
            {t("spin.paidCap", { n: status.paidSpinsRemaining })}
          </p>
        ) : null}
        <p className="mt-3 text-[12px] leading-none text-white/65">
          {t("spin.myCoins", { n: status.balance })}
          <span className="mx-2 text-white/30">·</span>
          {t("spin.myPoints", { n: status.rewardPoints })}
        </p>
      </div>

      {error ? (
        <p className="mt-3 text-center text-[13px] font-bold text-[#ffd0d0]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3">
        {status.chances > 0 || paidOptions.length === 0 ? (
          <button
            type="button"
            disabled={spinning || status.chances <= 0}
            onClick={() => void runSpin()}
            className={btnClass}
          >
            {spinning
              ? t("spin.spinning")
              : status.chances > 0
                ? t("spin.go")
                : t("spin.unavailable")}
          </button>
        ) : (
          paidOptions.map((type) => {
            const enough = canAfford(type);
            const paidCapped = status.paidSpinsRemaining === 0;
            const label = paidCapped
              ? t("spin.paidCap", { n: 0 })
              : !enough
                ? type === "coins"
                  ? t("spin.notEnoughCoins")
                  : t("spin.notEnoughPoints")
                : paidOptions.length === 1
                  ? t("spin.go")
                  : type === "coins"
                    ? t("spin.spinPaidCoins", { n: status.cost.coins ?? 0 })
                    : t("spin.spinPaidPoints", { n: status.cost.points ?? 0 });
            return (
              <button
                key={type}
                type="button"
                disabled={spinning || !enough || paidCapped}
                onClick={() => void runSpin(type)}
                className={btnClass}
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
              className={btnClass}
              onClick={() => setResult(null)}
            >
              {t("spin.resultClose")}
            </button>
          }
        >
          <div className="relative py-4">
            <MotionBurst variant="confetti" />
            {dialogResult.prize.package?.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={dialogResult.prize.package.image}
                alt=""
                width={64}
                height={64}
                className="anim-scale-in relative z-10 mx-auto mb-3 size-16 object-contain"
              />
            ) : null}
            <p className="anim-scale-in relative z-10 text-center text-[28px] leading-none font-bold text-[#fda565]">
              {prizeLabel(t, dialogResult.prize, true)}
            </p>
          </div>
        </AppDialog>
      ) : null}
    </div>
  );
}
