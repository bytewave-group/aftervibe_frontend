"use client";

import { useTranslations } from "@/i18n/locale-provider";

/** Subtle developer credit. Pass className to override default spacing. */
export function PoweredByAfterVibe({ className }: { className?: string } = {}) {
  const t = useTranslations();

  return (
    <p
      className={`flex items-center justify-center gap-[6px] opacity-50 ${className ?? "mt-8 pb-2"}`}
    >
      <span className="text-[11px] leading-none font-medium text-white">
        {t("profile.poweredBy")}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/aftervibe-logo-h-white.webp"
        alt="AfterVibe"
        width={145}
        height={18}
        className="h-[18px] w-auto"
      />
    </p>
  );
}
