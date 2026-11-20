"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { TierAvatar } from "@/components/profile/TierAvatar";
import { useLocale } from "@/i18n/locale-provider";
import { formatInteger, formatZonedDate, parseDateTime, zonedParts } from "@/lib/format/datetime";
import type { ReceivedGiftRecord } from "@/lib/mock/history";
import { GIFT_PLACEHOLDER_IMAGE } from "@/lib/mock/history";
import { parseTier } from "@/lib/tier";

function giftDateLabel(value: string, locale: "zh" | "en"): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }
  const parts = zonedParts(date);
  return parts ? formatZonedDate(parts, locale) : "";
}

function senderInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/**
 * 收到的礼物 (/profile/received-gifts): gifts other customers sent me, same card style as the
 * history gift rows plus the sender's tier-framed avatar and the reward points I earned.
 */
export function ReceivedGiftsList({ received }: { received: ReceivedGiftRecord[] }) {
  const { locale, t } = useLocale();

  if (received.length === 0) {
    return <p className="px-6 py-10 text-center text-[13px] text-white/50">{t("history.emptyReceived")}</p>;
  }

  return (
    <div className="px-6 pb-8">
      <ul className="anim-stagger mt-4 flex flex-col gap-3">
        {received.map((item) => (
          <li
            key={item.id}
            className="flex items-center rounded-[12px] border border-white/20 bg-[#141010] py-3 pr-3 pl-3"
          >
            <TierAvatar
              avatar={item.senderAvatar}
              tier={parseTier(item.senderTier)}
              size={40}
              ringOutset={0}
              fallback={
                <span className="flex size-full items-center justify-center bg-[#2a1f1f] text-[15px] font-bold text-white">
                  {senderInitial(item.senderName)}
                </span>
              }
            />
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-[13px] leading-relaxed text-white">
                {t("history.giftPrefix")}
                <strong className="font-bold whitespace-nowrap">{giftDateLabel(item.sentAt, locale)}</strong>
                {t("history.receivedMid")}
                <span className="whitespace-nowrap">【<strong className="font-bold">{item.senderName}</strong>】</span>
                {t("history.receivedVerb")}
                <span className="whitespace-nowrap">【<strong className="font-bold">{item.giftName}</strong>】{t("history.giftQty", { n: item.quantity })}</span>
              </p>
              {item.pointsEarned > 0 || (item.totalAmount != null && item.totalAmount > 0) ? (
                <p className="mt-1 flex items-center gap-3 text-[12px] leading-none text-white/70">
                  {item.totalAmount != null && item.totalAmount > 0 ? (
                    <span className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/diamond.png" alt="" width={12} height={12} className="size-3 object-contain" />
                      <span className="tabular-nums">{formatInteger(item.totalAmount)}</span>
                    </span>
                  ) : null}
                  {item.pointsEarned > 0 ? (
                    <span className="font-bold text-[#fda565] tabular-nums">
                      {t("history.receivedPoints", { n: formatInteger(item.pointsEarned) })}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
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
    </div>
  );
}
