"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { defaultLocale, isLocale, localeCookieName, localeHtmlLang, type Locale } from "./config";
import { getMessages, translate, type TranslateVars } from "./dictionaries";

interface LocaleContextValue {
  locale: Locale;
  t: (key: string, vars?: TranslateVars) => string;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const LOCALE_CHANGED_EVENT = "av-locale-changed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") {
    return defaultLocale;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${localeCookieName}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : "";
  return isLocale(value) ? value : defaultLocale;
}

function subscribeLocale(onChange: () => void): () => void {
  window.addEventListener(LOCALE_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(LOCALE_CHANGED_EVENT, onChange);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, readLocaleCookie, () => defaultLocale);

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = localeHtmlLang[next];
    window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
  }, []);

  const messages = getMessages(locale);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key, vars) => translate(messages, key, vars),
      setLocale,
      isPending: false,
    }),
    [locale, messages, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
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
