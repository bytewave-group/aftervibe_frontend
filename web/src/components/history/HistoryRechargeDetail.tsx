"use client";

import { useLocale, useTranslations } from "@/i18n/locale-provider";
import { formatHistoryDetailDateTime } from "@/lib/format/datetime";
import type { RechargeRecord } from "@/lib/mock/history";

function formatAmount(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function HistoryRechargeDetail({ record }: { record: RechargeRecord }) {
  const t = useTranslations();
  const { locale } = useLocale();

  const categoryLabel =
    record.category === "bank"
      ? t("history.categoryBank")
      : record.category === "ewallet"
        ? t("history.categoryEwallet")
        : record.category === "card"
          ? t("history.categoryCard")
          : null;
  const provider = record.provider?.trim() || null;
  const paymentLines = [categoryLabel, provider].filter((line): line is string => Boolean(line));
  const paymentValue = paymentLines.length > 0 ? paymentLines.join("\n") : t("history.dash");
  const when = formatHistoryDetailDateTime(record.createdAt, locale) || t("history.dash");

  const rows: { label: string; value: string; amount?: boolean }[] = [
    { label: t("history.transactionType"), value: t("history.typeRecharge") },
    { label: t("history.paymentMethod"), value: paymentValue },
    { label: t("history.dateTime"), value: when },
    { label: t("history.transactionNo"), value: record.orderNo || t("history.dash") },
    { label: t("history.transactionAmount"), value: formatAmount(record.currency, record.amount), amount: true },
  ];

  return (
    <div className="px-6 pt-4 pb-8">
      <dl>
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex items-start justify-between gap-6 ${
              index === 0 ? "pt-0 pb-3.5" : index === rows.length - 1 ? "pt-3.5" : "py-3.5"
            } ${index < rows.length - 1 ? "border-b border-[#555555]" : ""}`}
          >
            <dt className="shrink-0 text-[16px] leading-[19px] font-normal text-white">{row.label}</dt>
            <dd
              className={`min-w-0 text-right whitespace-pre-line text-white ${
                row.amount
                  ? "text-[24px] leading-[29px] font-bold tabular-nums"
                  : "text-[16px] leading-[19px] font-normal"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
