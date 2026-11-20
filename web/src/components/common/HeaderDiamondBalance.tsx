"use client";

import { useTranslations } from "@/i18n/locale-provider";
import { formatInteger } from "@/lib/format/datetime";

/**
 * Diamond balance for a page header's right slot (选择礼物, 充值详情, …).
 * One component so every header balance has the same icon size, type, colour and gap.
 */
export function HeaderDiamondBalance({ amount }: { amount: number }) {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-1" aria-label={t("gifts.balanceAria", { n: amount })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/diamond.png" alt="" width={16} height={16} className="size-4 object-contain" />
      <span className="text-[14px] leading-none font-bold text-white tabular-nums">
        {formatInteger(Math.trunc(amount))}
      </span>
    </div>
  );
}
