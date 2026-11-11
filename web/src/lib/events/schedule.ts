import type { Locale } from "@/i18n/config";
import type { EventItem } from "@/lib/mock/events";

const TIME_ZONE = "Asia/Kuala_Lumpur";

function parseEventDate(value: string | null | undefined): Date | null {
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

function dateLabel(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function timeLabel(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "zh",
  }).format(date);
}

/** Admin `schedule_text` when set; otherwise starts/ends in Malaysia time. */
export function formatEventSchedule(
  event: Pick<EventItem, "scheduleText" | "startsAt" | "endsAt">,
  locale: Locale,
): string {
  if (event.scheduleText?.trim()) {
    return event.scheduleText.trim();
  }

  const start = parseEventDate(event.startsAt);
  const end = parseEventDate(event.endsAt);
  if (!start) {
    return "";
  }

  if (!end) {
    return `${dateLabel(start, locale)} ${timeLabel(start, locale)}`;
  }

  return dateLabel(start, locale) === dateLabel(end, locale)
    ? `${dateLabel(start, locale)} ${timeLabel(start, locale)} – ${timeLabel(end, locale)}`
    : `${dateLabel(start, locale)} ${timeLabel(start, locale)} – ${dateLabel(end, locale)} ${timeLabel(end, locale)}`;
}
