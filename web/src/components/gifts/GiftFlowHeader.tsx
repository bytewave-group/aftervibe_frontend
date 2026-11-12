"use client";

import { BackLink } from "@/components/navigation/BackLink";
import { useTranslations } from "@/i18n/locale-provider";
import type { ReactNode } from "react";

export function GiftFlowHeader({
  titleKey,
  backHref,
  right,
  children,
}: {
  titleKey: string;
  backHref: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations();

  return (
    <header className="relative z-20 px-6 pt-[16px] pb-[8px] [padding-top:max(16px,env(safe-area-inset-top))]">
      <div className="relative flex h-[32px] items-center">
        <BackLink href={backHref} ariaLabel={t("common.back")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/icon-back.svg" alt="" width={13.9167} height={23.8333} />
        </BackLink>
        <h1 className={`pointer-events-none absolute inset-x-8 text-center text-[20px] leading-none font-bold text-white ${right ? "px-10" : ""}`}>
          {t(titleKey)}
        </h1>
        {right ? (
          <div className="relative z-10 ml-auto flex items-center">{right}</div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function DiamondBalance({ amount }: { amount: number }) {
  const t = useTranslations();
  return (
    <div
      className="flex items-center gap-1"
      aria-label={t("gifts.balanceAria", { n: amount })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/diamond.png" alt="" width={16} height={16} className="size-4 object-contain" />
      <span className="text-[14px] leading-none font-bold text-white tabular-nums">
        {amount}
      </span>
    </div>
  );
}
