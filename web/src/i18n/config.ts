export const locales = ["zh", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

export const localeCookieName = "locale";

/**
 * Add a locale by:
 * 1. appending its id to `locales` above
 * 2. adding messages/{id}.json (same shape as messages/zh.json)
 * 3. registering it in `dictionaries` and `localeHtmlLang`
 *
 * Thai (`th`) and Vietnamese (`vi`) can be added this way when needed.
 */
export const localeHtmlLang: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

export function nextLocale(current: Locale): Locale {
  const index = locales.indexOf(current);
  return locales[(index + 1) % locales.length];
}
