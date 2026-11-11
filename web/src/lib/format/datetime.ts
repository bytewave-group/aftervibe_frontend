import type { Locale } from "@/i18n/config";

const TIME_ZONE = "Asia/Kuala_Lumpur";

export function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: string | null | undefined,
  locale: Locale,
): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(
  value: string | null | undefined,
  locale: Locale,
): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "zh",
  }).format(date);
}

export function formatRelativeTime(
  value: string | null | undefined,
  locale: Locale,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) {
    return t("notificationsPage.justNow");
  }
  if (minutes < 60) {
    return t("notificationsPage.minutesAgo", { n: minutes });
  }
  if (minutes < 1440) {
    return t("notificationsPage.hoursAgo", { n: Math.floor(minutes / 60) });
  }
  if (minutes < 10080) {
    return t("notificationsPage.daysAgo", { n: Math.floor(minutes / 1440) });
  }

  return formatDate(value, locale);
}
