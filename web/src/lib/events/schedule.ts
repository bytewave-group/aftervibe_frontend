import type { Locale } from "@/i18n/config";
import type { EventItem } from "@/lib/mock/events";
import { formatZonedDate, formatZonedTime, parseDateTime, zonedParts } from "@/lib/format/datetime";

function dateLabel(date: Date, locale: Locale): string {
  const parts = zonedParts(date);
  return parts ? formatZonedDate(parts, locale) : "";
}

function timeLabel(date: Date, locale: Locale): string {
  const parts = zonedParts(date);
  return parts ? formatZonedTime(parts, locale) : "";
}

/** Admin `schedule_text` when set; otherwise starts/ends in Malaysia time. */
export function formatEventSchedule(
  event: Pick<EventItem, "scheduleText" | "startsAt" | "endsAt">,
  locale: Locale,
): string {
  if (event.scheduleText?.trim()) {
    return event.scheduleText.trim();
  }

  const start = parseDateTime(event.startsAt);
  const end = parseDateTime(event.endsAt);
  if (!start) {
    return "";
  }

  const startDate = dateLabel(start, locale);
  const startTime = timeLabel(start, locale);
  if (!startDate || !startTime) {
    return "";
  }

  if (!end) {
    return `${startDate} ${startTime}`;
  }

  const endDate = dateLabel(end, locale);
  const endTime = timeLabel(end, locale);
  if (!endDate || !endTime) {
    return `${startDate} ${startTime}`;
  }

  return startDate === endDate
    ? `${startDate} ${startTime} – ${endTime}`
    : `${startDate} ${startTime} – ${endDate} ${endTime}`;
}
