import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, type Locale } from "./config";
import { getMessages, translate, type TranslateVars } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(localeCookieName)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getT() {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, vars?: TranslateVars) =>
    translate(messages, key, vars);
  return { locale, messages, t };
}
