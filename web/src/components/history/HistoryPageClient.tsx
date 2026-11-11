"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { useLocale } from "@/i18n/locale-provider";
import type { GiftRecord, HistoryTab, RechargeRecord } from "@/lib/mock/history";
import { GIFT_PLACEHOLDER_IMAGE } from "@/lib/mock/history";
import { parseDateTime } from "@/lib/format/datetime";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TIME_ZONE = "Asia/Kuala_Lumpur";

function tabFromSearch(search: URLSearchParams): HistoryTab {
  return search.get("tab") === "recharge" ? "recharge" : "gift";
}

function giftDateLabel(value: string, locale: "zh" | "en"): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }
  if (locale === "zh") {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: TIME_ZONE,
      month: "numeric",
      day: "numeric",
    })
      .format(date)
      .replace(/\//g, "月")
      .replace(/月(\d+)$/, "月$1日");
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Design format: "Sep 20 ,2026" (space before the comma). */
function rechargeDateLabel(value: string): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${month} ${day} ,${year}`;
}

function formatAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function HistoryPageClient({
  gifts,
  recharges,
}: {
  gifts: GiftRecord[];
  recharges: RechargeRecord[];
}) {
  const { locale, t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabFromSearch(searchParams);

  const setTab = (next: HistoryTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="px-6 pb-8">
      <div className="mt-4 flex gap-3">
        {(["gift", "recharge"] as const).map((value) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`anim-press h-[40px] flex-1 rounded-[8px] text-[14px] leading-none font-bold transition-colors duration-[var(--motion-base)] ease-[var(--ease-motion)] motion-reduce:transition-none ${
                active
                  ? "bg-[#c62828] text-white"
                  : "border border-white/20 bg-[#140808] text-white"
              }`}
            >
              {value === "gift" ? t("history.tabGift") : t("history.tabRecharge")}
            </button>
          );
        })}
      </div>

      {tab === "gift" ? (
        gifts.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-white/50">{t("history.emptyGift")}</p>
        ) : (
          <>
            <ul className="anim-stagger mt-5 flex flex-col gap-3">
              {gifts.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center rounded-[12px] border border-white/20 bg-[#141010] py-3 pr-3 pl-4"
                >
                  <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-white">
                    {t("history.giftPrefix")}
                    <strong className="font-bold whitespace-nowrap">{giftDateLabel(item.sentAt, locale)}</strong>
                    {t("history.giftMid")}
                    <span className="whitespace-nowrap">【<strong className="font-bold">{item.recipientName}</strong>】</span><span className="whitespace-nowrap">【<strong className="font-bold">{item.giftName}</strong>】{t("history.giftQty", { n: item.quantity })}</span>
                  </p>
                  <div className="relative ml-3 size-[56px] shrink-0 overflow-hidden">
                    <SafeImage
                      src={item.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain"
                      fallback={GIFT_PLACEHOLDER_IMAGE}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-center text-[12px] leading-none text-white/45">
              {t("history.retention")}
            </p>
          </>
        )
      ) : recharges.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/50">{t("history.emptyRecharge")}</p>
      ) : (
        <ul className="anim-stagger mt-5 flex flex-col gap-3">
          {recharges.map((item) => (
            <li
              key={item.id}
              className="flex items-center rounded-[12px] border border-white/20 bg-[#141010] px-4 py-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.method === "bank" ? "/images/icon-bank.svg" : "/images/icon-ewallet.svg"}
                alt=""
                width={32}
                height={32}
                className="shrink-0"
              />
              <div className="ml-3 min-w-0 flex-1">
                <p className="truncate text-[14px] leading-none font-bold text-white">
                  {item.method === "bank"
                    ? t("history.methodBank", { name: item.provider })
                    : t("history.methodEwallet", { name: item.provider })}
                </p>
                <p className="mt-2 text-[12px] leading-none text-white/50">
                  {rechargeDateLabel(item.createdAt)}
                </p>
              </div>
              <p className="ml-3 shrink-0 text-[15px] leading-none font-bold text-white tabular-nums">
                {formatAmount(item.currency, item.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
