"use client";

import { HeaderDiamondBalance } from "@/components/common/HeaderDiamondBalance";
import { GiftFlowHeader } from "@/components/gifts/GiftFlowHeader";
import { PageMain } from "@/components/layout/AppShell";
import {
  RechargeResultDialog,
  type RechargeResult,
} from "@/components/recharge/RechargeResultDialog";
import { useTranslations } from "@/i18n/locale-provider";
import {
  checkCoinOrderAction,
  createCoinOrderAction,
} from "@/lib/api/recharge";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  amountForCoins,
  diamondsForAmount,
  currencySymbol,
  formatCoinRate,
  formatInt,
  isAmountInRange,
  parseAmountInput,
  type RechargeData,
  type RechargePackage,
} from "@/lib/mock/recharge";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

/** Drop `coin_order` / `status` from the URL so a refresh doesn't show the result again. */
function clearReturnParams() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("coin_order") && !url.searchParams.has("status")) {
    return;
  }
  url.searchParams.delete("coin_order");
  url.searchParams.delete("status");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function nearestAmount(coins: number, rate: number): number {
  const raw = amountForCoins(coins, rate);
  return Number.isInteger(raw) ? raw : Math.round(raw);
}

function pickInitial(
  packages: RechargePackage[],
  shortfall: number | null,
  rate: number,
  minAmount: number,
): { selectedId: number | null; amount: string } {
  if (shortfall != null && shortfall > 0) {
    const covering = packages
      .filter((item) => item.coins >= shortfall)
      .sort((a, b) => a.coins - b.coins);
    if (covering[0]) {
      return {
        selectedId: covering[0].id,
        amount: formatInt(nearestAmount(covering[0].coins, rate)),
      };
    }
    const custom = Math.max(minAmount, Math.ceil(shortfall / (rate > 0 ? rate : 1)));
    return { selectedId: null, amount: formatInt(custom) };
  }
  return { selectedId: null, amount: "" };
}

function matchPackage(
  packages: RechargePackage[],
  amount: number,
  rate: number,
): RechargePackage | null {
  return packages.find((item) => nearestAmount(item.coins, rate) === amount) ?? null;
}

export function RechargePageClient({
  initialData,
  shortfall,
  backHref,
  returnedOrderNo,
}: {
  initialData: RechargeData;
  shortfall: number | null;
  backHref: string;
  returnedOrderNo: string | null;
}) {
  const t = useTranslations();
  const [data, setData] = useState(initialData);
  const rate = data.coinRate;
  const symbol = currencySymbol(data.currency);
  const minAmount = data.minAmount;
  const maxAmount = data.maxAmount;
  const amountVars = {
    symbol,
    n: formatCoinRate(rate),
    min: formatInt(minAmount),
    max: formatInt(maxAmount),
  };
  const inRange = (value: number) => isAmountInRange(value, minAmount, maxAmount);
  const initial = useMemo(
    () => pickInitial(initialData.packages, shortfall, initialData.coinRate, initialData.minAmount),
    [initialData.coinRate, initialData.minAmount, initialData.packages, shortfall],
  );
  const [selectedId, setSelectedId] = useState<number | null>(initial.selectedId);
  const [amountText, setAmountText] = useState(initial.amount);
  const [amountTouched, setAmountTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(
    shortfall != null && shortfall > 0 ? t("recharge.shortfallHint", { n: shortfall }) : null,
  );
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "error">(
    shortfall != null && shortfall > 0 ? "info" : "info",
  );
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<RechargeResult | null>(null);
  const closeOutcome = useCallback(() => setOutcome(null), []);

  const amount = parseAmountInput(amountText);
  const amountError =
    amountTouched && amountText.trim() !== "" && (amount == null || !inRange(amount));
  const selected = useMemo(
    () => data.packages.find((item) => item.id === selectedId) ?? null,
    [data.packages, selectedId],
  );

  const previewDiamonds = (() => {
    if (amount == null || !inRange(amount)) {
      return null;
    }
    if (selected) {
      return selected.coins + selected.bonus;
    }
    return diamondsForAmount(amount, rate);
  })();

  useEffect(() => {
    if (!returnedOrderNo) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    // Final outcome: popup instead of the inline message, and forget the return params.
    const finish = (next: RechargeResult) => {
      setMessage(null);
      setOutcome(next);
      clearReturnParams();
    };

    const poll = async () => {
      attempts += 1;
      const result = await checkCoinOrderAction(returnedOrderNo);
      if (cancelled) {
        return;
      }
      if (!result) {
        finish({ kind: "failed" });
        return;
      }
      if (result.status === "paid") {
        if (result.balance != null) {
          setData((prev) => ({
            ...prev,
            balance: {
              balance: result.balance ?? prev.balance.balance,
              available: result.balance ?? prev.balance.available,
            },
          }));
        }
        finish({ kind: "paid", diamonds: result.coins + result.bonusCoins, balance: result.balance });
        return;
      }
      if (result.status === "pending" && attempts < maxAttempts) {
        setMessageTone("info");
        setMessage(t("recharge.confirming"));
        window.setTimeout(() => {
          void poll();
        }, 3000);
        return;
      }
      finish({ kind: "failed" });
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [returnedOrderNo, t]);

  const onSelectCard = (item: RechargePackage) => {
    setSelectedId(item.id);
    setAmountText(formatInt(nearestAmount(item.coins, rate)));
    setAmountTouched(true);
  };

  const onAmountChange = (value: string) => {
    const parsed = parseAmountInput(value);
    if (parsed == null) {
      setAmountText("");
      setSelectedId(null);
      return;
    }
    setAmountText(formatInt(parsed));
    const match = matchPackage(data.packages, parsed, rate);
    setSelectedId(match?.id ?? null);
  };

  const startPayment = () => {
    setAmountTouched(true);
    if (amount == null || !inRange(amount) || pending) {
      return;
    }
    if (!data.paymentAvailable) {
      setMessageTone("error");
      setMessage(t("recharge.unavailable"));
      return;
    }
    startTransition(async () => {
      const returnUrl = `${window.location.origin}/recharge`;
      const result = await createCoinOrderAction(
        selected?.backendId
          ? { packageId: selected.backendId }
          : { amount },
        returnUrl,
      );
      if (!result.ok) {
        setMessageTone("error");
        setMessage(
          result.reason === "unavailable"
            ? t("recharge.unavailable")
            : result.message || t("recharge.errorStart"),
        );
        return;
      }
      window.location.assign(result.paymentUrl);
    });
  };

  const canSubmit = !pending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GiftFlowHeader
        titleKey="recharge.title"
        backHref={safeRedirectPath(backHref, "/")}
        right={<HeaderDiamondBalance amount={data.balance.available} />}
      />
      <PageMain>
        <div className="px-6 pt-5 pb-4">
          <label
            htmlFor="recharge-amount"
            className="block text-[14px] leading-none font-medium text-white"
          >
            {t("recharge.amountLabel", amountVars)}
          </label>
          <input
            id="recharge-amount"
            inputMode="numeric"
            autoComplete="off"
            value={amountText}
            onChange={(event) => onAmountChange(event.target.value)}
            onBlur={() => setAmountTouched(true)}
            placeholder={t("recharge.amountPlaceholder", amountVars)}
            aria-invalid={amountError}
            className="mt-3 h-[48px] w-full rounded-[14px] border border-[#5a5a5a] bg-[#2a2a2a] px-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-white/50"
          />
          {amountError ? (
            <p className="mt-2 text-[12px] leading-snug font-bold text-[#f0454a]" role="alert">
              {t("recharge.amountError", amountVars)}
            </p>
          ) : null}
          {previewDiamonds != null && !amountError ? (
            <p className="mt-2 text-[12px] leading-snug text-white/55">
              {selected && selected.bonus > 0
                ? t("recharge.youReceiveBonus", {
                    n: formatInt(previewDiamonds),
                    bonus: formatInt(selected.bonus),
                  })
                : t("recharge.youReceive", { n: formatInt(previewDiamonds) })}
            </p>
          ) : null}

          {message ? (
            <p
              className={`mt-3 text-[12px] leading-relaxed ${
                messageTone === "error"
                  ? "font-bold text-[#f0454a]"
                  : messageTone === "ok"
                    ? "font-bold text-white"
                    : "text-white/55"
              }`}
              role={messageTone === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}

          {!data.paymentAvailable ? (
            <p className="mt-3 text-[12px] leading-snug text-white/45">{t("recharge.unavailable")}</p>
          ) : null}

          {data.loadError ? (
            <p className="mt-5 text-[13px] leading-relaxed text-[#f0454a]" role="alert">
              {t("recharge.loadError")}
            </p>
          ) : data.packages.length === 0 ? (
            <p className="mt-5 text-[13px] text-white/50">{t("recharge.empty")}</p>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {data.packages.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectCard(item)}
                    className={`anim-press flex min-h-[108px] flex-col items-center justify-center rounded-[14px] px-1.5 py-3 ${
                      isSelected
                        ? "bg-[#c62828]"
                        : "border border-[#5a5a5a] bg-[#252525]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/diamond.png"
                      alt=""
                      width={28}
                      height={28}
                      className="size-7 object-contain"
                    />
                    <span className="mt-1.5 text-[16px] leading-none font-bold text-white tabular-nums">
                      {formatInt(item.coins)}
                    </span>
                    {item.bonus > 0 ? (
                      <span
                        className={`mt-1.5 text-[11px] leading-none ${isSelected ? "text-white/85" : "text-white/55"}`}
                      >
                        {t("recharge.bonus", { n: formatInt(item.bonus) })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PageMain>
      <div className="px-6 pt-2 pb-2">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={startPayment}
          className="anim-press anim-btn-shimmer flex h-[48px] w-full items-center justify-center rounded-full bg-[#c62828] text-[16px] font-bold text-white disabled:opacity-70"
        >
          {pending ? t("recharge.starting") : t("recharge.pay")}
        </button>
      </div>
      <RechargeResultDialog result={outcome} onClose={closeOutcome} />
    </div>
  );
}
