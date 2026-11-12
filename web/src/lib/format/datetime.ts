import type { Locale } from "@/i18n/config";

const TIME_ZONE = "Asia/Kuala_Lumpur";

const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const EN_MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Numeric calendar/clock fields in Malaysia time. Digit values are stable
 * across Node and browser ICU; callers compose labels so month names and
 * spaces never depend on the runtime's locale data (e.g. U+202F before AM/PM).
 */
export function zonedParts(date: Date): ZonedParts | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }
  // Some ICU builds emit 24:xx for midnight under hourCycle h23.
  const hour24 = hour === 24 ? 0 : hour;
  return { year, month, day, hour: hour24, minute };
}

export function formatZonedDate(parts: ZonedParts, locale: Locale, withYear = false): string {
  if (locale === "zh") {
    return withYear
      ? `${parts.year}年${parts.month}月${parts.day}日`
      : `${parts.month}月${parts.day}日`;
  }
  const month = EN_MONTHS_SHORT[parts.month - 1];
  return withYear ? `${month} ${parts.day}, ${parts.year}` : `${month} ${parts.day}`;
}

export function formatZonedTime(parts: ZonedParts, locale: Locale): string {
  if (locale === "zh") {
    return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  }
  const ampm = parts.hour >= 12 ? "PM" : "AM";
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  return `${pad2(hour12)}:${pad2(parts.minute)} ${ampm}`;
}

/** Group an integer with ASCII commas (never ICU narrow/NNBSP grouping). */
export function formatInteger(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.trunc(Math.abs(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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

  const parts = zonedParts(date);
  return parts ? formatZonedDate(parts, locale, true) : "";
}

export function formatDateTime(
  value: string | null | undefined,
  locale: Locale,
): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }

  const parts = zonedParts(date);
  return parts ? `${formatZonedDate(parts, locale)} ${formatZonedTime(parts, locale)}` : "";
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

export function formatSlashDate(value: string | null | undefined): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }

  const parts = zonedParts(date);
  if (!parts) {
    return "";
  }
  return `${pad2(parts.month)}/${pad2(parts.day)}/${parts.year}`;
}

export function formatSlashDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const from = formatSlashDate(start);
  const to = formatSlashDate(end);
  if (from && to) {
    return `${from}-${to}`;
  }
  return from || to;
}

/**
 * Last calendar day the item can be redeemed, in an ISO timestamp.
 * Prefer POS `last_redeem_at` (expired_date minus 1ms). Otherwise subtract 1ms
 * from `expired_date` so Asia/Kuala_Lumpur formatting shows that last day.
 */
export function lastRedeemableAt(
  expiredDate?: string | null,
  lastRedeemAt?: string | null,
): string | null {
  if (lastRedeemAt && lastRedeemAt.trim()) {
    return lastRedeemAt;
  }
  const date = parseDateTime(expiredDate);
  if (!date) {
    return null;
  }
  return new Date(date.getTime() - 1).toISOString();
}

/**
 * Figma record-detail format: "15:25, September 15, 2026" (en)
 * or "15:25, 2026年9月15日" (zh), in Asia/Kuala_Lumpur.
 */
export function formatHistoryDetailDateTime(
  value: string | null | undefined,
  locale: Locale,
): string {
  const date = parseDateTime(value);
  if (!date) {
    return "";
  }
  const parts = zonedParts(date);
  if (!parts) {
    return "";
  }
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  if (locale === "zh") {
    return `${time}, ${parts.year}年${parts.month}月${parts.day}日`;
  }
  return `${time}, ${EN_MONTHS_LONG[parts.month - 1]} ${parts.day}, ${parts.year}`;
}
