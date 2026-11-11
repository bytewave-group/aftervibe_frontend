"use client";

import { BackLink } from "@/components/navigation/BackLink";
import { useTranslations } from "@/i18n/locale-provider";

export function ProfileHeader({ showBack = true }: { showBack?: boolean }) {
  const t = useTranslations();

  return (
    <header className="relative z-20 px-6 pt-[16px] pb-[8px] [padding-top:max(16px,env(safe-area-inset-top))]">
      <div className="relative flex h-[32px] items-center">
        {showBack ? (
          <BackLink
            href="/"
            ariaLabel={t("common.back")}
            className="anim-press relative z-10 flex h-[24px] w-[14px] items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/icon-back.svg" alt="" width={13.9167} height={23.8333} />
          </BackLink>
        ) : null}
        <h1 className="absolute inset-x-0 text-center text-[20px] leading-none font-bold text-white">
          {t("profile.title")}
        </h1>
      </div>
    </header>
  );
}
