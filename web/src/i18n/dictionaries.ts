import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import type { Locale } from "./config";

export const dictionaries = {
  zh,
  en,
} as const;

export type Messages = typeof zh;

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries.zh;
}

export type TranslateVars = Record<string, string | number>;

export function translate(
  messages: Messages,
  key: string,
  vars?: TranslateVars,
): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);

  if (typeof value !== "string") {
    return key;
  }

  if (!vars) {
    return value;
  }

  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
