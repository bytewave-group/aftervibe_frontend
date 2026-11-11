"use client";

import { logoutAction } from "@/lib/auth/actions";
import { useTranslations } from "@/i18n/locale-provider";

export function LogoutButton() {
  const t = useTranslations();

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="anim-press anim-btn-shimmer anim-fade-up mx-6 mt-[75px] flex h-[45px] w-[calc(100%-48px)] items-center justify-center rounded-[10px] bg-[red] text-[20px] leading-none font-bold text-white [--stagger:3]"
      >
        {t("profile.logout")}
      </button>
    </form>
  );
}
