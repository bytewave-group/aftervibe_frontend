"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslations } from "@/i18n/locale-provider";

export function LogoutButton() {
  const t = useTranslations();
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="anim-press anim-btn-shimmer anim-fade-up mx-6 mt-[75px] flex h-[45px] w-[calc(100%-48px)] items-center justify-center rounded-[10px] bg-[red] text-[20px] leading-none font-bold text-white [--stagger:3]"
    >
      {t("profile.logout")}
    </button>
  );
}
