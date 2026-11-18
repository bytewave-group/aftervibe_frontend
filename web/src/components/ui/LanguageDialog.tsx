"use client";

import { AppDialog } from "@/components/ui/AppDialog";
import { locales, type Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export function LanguageDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale, t, setLocale, isPending } = useLocale();
  const canPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const choose = (next: Locale) => {
    if (next !== locale) {
      setLocale(next);
    }
    onClose();
  };

  const dialog = (
    <AppDialog title={t("profile.language")} open={open} onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {locales.map((code) => {
          const selected = code === locale;
          return (
            <li key={code}>
              <button
                type="button"
                disabled={isPending}
                aria-current={selected ? "true" : undefined}
                className={`anim-press flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left text-[16px] leading-none font-bold ${
                  selected ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
                onClick={() => choose(code)}
              >
                {t(`languages.${code}`)}
              </button>
            </li>
          );
        })}
      </ul>
    </AppDialog>
  );

  if (!canPortal) return null;
  return createPortal(dialog, document.body);
}
