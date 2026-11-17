"use client";

import { useTranslations } from "@/i18n/locale-provider";
import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-[16px] leading-snug font-bold text-white">{t("common.pageError")}</p>
      <button
        type="button"
        className="anim-press mt-6 rounded-full bg-white px-6 py-2 text-[14px] font-bold text-black"
        onClick={reset}
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
