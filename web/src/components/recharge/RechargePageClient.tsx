"use client";

import { DiamondBalance, GiftFlowHeader } from "@/components/gifts/GiftFlowHeader";
import { PageMain } from "@/components/layout/AppShell";
import { useTranslations } from "@/i18n/locale-provider";
import {
  checkCoinOrderAction,
  createCoinOrderAction,
} from "@/lib/api/recharge";
import { safeRedirectPath } from "@/lib/auth/redirect";
import type { RechargeData, RechargePackage } from "@/lib/mock/recharge";
import { useEffect, useMemo, useState, useTransition } from "react";

function pickPackageId(packages: RechargePackage[], shortfall: number | null): number | null {
  if (packages.length === 0) {
    return null;
  }
  if (shortfall == null || shortfall <= 0) {
    return packages[0]?.id ?? null;
  }
  const covering = packages
    .filter((item) => item.coins >= shortfall)
    .sort((a, b) => a.coins - b.coins);
  if (covering[0]) {
    return covering[0].id;
  }
  return [...packages].sort((a, b) => b.coins - a.coins)[0]?.id ?? null;
}

function formatPrice(currency: string, price: number): string {
  const formatted = Number.isInteger(price)
    ? String(price)
    : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${formatted}`;
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
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    pickPackageId(initialData.packages, shortfall),
  );
  const [message, setMessage] = useState<string | null>(
    shortfall != null && shortfall > 0 ? t("recharge.shortfallHint", { n: shortfall }) : null,
  );
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "error">(
    shortfall != null && shortfall > 0 ? "info" : "info",
  );
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => data.packages.find((item) => item.id === selectedId) ?? null,
    [data.packages, selectedId],
  );

  useEffect(() => {
    if (!returnedOrderNo) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      attempts += 1;
      const result = await checkCoinOrderAction(returnedOrderNo);
      if (cancelled) {
        return;
      }
      if (!result) {
        setMessageTone("error");
        setMessage(t("recharge.errorCheck"));
        return;
      }
      if (result.status === "paid") {
        if (result.balance != null) {
          setData((prev) => ({
            ...prev,
            balance: { balance: result.balance ?? prev.balance.balance, available: result.balance ?? prev.balance.available },
          }));
        }
        setMessageTone("ok");
        setMessage(t("recharge.paid", { n: result.coins }));
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
      setMessageTone("error");
      setMessage(
        result.status === "pending" ? t("recharge.stillPending") : t("recharge.notCompleted"),
      );
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [returnedOrderNo, t]);

  const startPayment = () => {
    if (!selected || !data.paymentAvailable || pending) {
      return;
    }
    startTransition(async () => {
      const returnUrl = `${window.location.origin}/recharge`;
      const result = await createCoinOrderAction(selected.id, returnUrl);
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

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        backgroundImage:
          "linear-gradient(180deg, #1e1e1e 0%, #1e1e1e 45%, #6b1519 100%)",
      }}
    >
      <GiftFlowHeader
        titleKey="recharge.title"
        backHref={safeRedirectPath(backHref, "/")}
        right={<DiamondBalance amount={data.balance.available} />}
      />
      <PageMain>
        <div className="px-6 pt-4 pb-8">
          {message ? (
            <p
              className={`mb-4 text-[13px] leading-relaxed ${
                messageTone === "error"
                  ? "font-bold text-[#f0454a]"
                  : messageTone === "ok"
                    ? "font-bold text-white"
                    : "text-white/70"
              }`}
              role={messageTone === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}

          <h2 className="mb-3 text-[14px] font-bold text-white">{t("recharge.packages")}</h2>
          {!data.paymentAvailable ? (
            <p className="mb-4 text-[13px] text-white/55">{t("recharge.unavailable")}</p>
          ) : null}

          {data.packages.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-white/50">
              {t("recharge.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {data.packages.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`anim-press flex flex-col items-center rounded-[14px] px-3 py-4 ${
                      isSelected
                        ? "bg-[#d01f25]/15 ring-2 ring-[#D01F25]"
                        : "bg-white/5 ring-1 ring-white/10"
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
                    <span className="mt-2 text-[20px] leading-none font-bold text-white tabular-nums">
                      {item.coins}
                    </span>
                    <span className="mt-1 text-[11px] text-white/55">{t("recharge.diamonds")}</span>
                    <span className="mt-3 flex h-[28px] items-center justify-center rounded-full bg-white/10 px-3 text-[13px] font-bold text-white">
                      {formatPrice(data.currency, item.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={!selected || !data.paymentAvailable || pending}
            onClick={startPayment}
            className="anim-press anim-btn-shimmer mt-6 flex h-[48px] w-full items-center justify-center rounded-[12px] bg-[#d01f25] text-[16px] font-bold text-white disabled:opacity-40"
          >
            {pending ? t("recharge.starting") : t("recharge.pay")}
          </button>
        </div>
      </PageMain>
    </div>
  );
}
