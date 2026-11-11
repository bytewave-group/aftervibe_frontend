"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { localeHtmlLang, type Locale } from "./config";
import { translate, type Messages, type TranslateVars } from "./dictionaries";
import { setLocaleAction } from "./actions";

interface LocaleContextValue {
  locale: Locale;
  t: (key: string, vars?: TranslateVars) => string;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang[locale];
  }, [locale]);


  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, vars) => translate(messages, key, vars),
      setLocale: (next) => {
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        });
      },
      isPending,
    }),
    [locale, messages, router, isPending],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

export function useTranslations() {
  return useLocale().t;
}
