export const KTV_MIN_DURATION = 1;
export const KTV_MAX_DURATION = 720;
export const KTV_GRACE_MINUTES = 15;
export const KTV_WARNING_SECONDS = 300;

const pad = (value) => String(value).padStart(2, "0");

export function formatDateTimeLocal(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseEndTime(endTime) {
  if (!endTime) {
    return null;
  }

  const text = String(endTime).trim().replace("T", " ").slice(0, 16);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})$/);
  if (!match) {
    const fallback = new Date(endTime);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

export function addMinutes(date, minutes) {
  const next = new Date(date.getTime());
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

export function previewEndTimeFromNow(minutes) {
  const value = Number(minutes);
  if (!Number.isInteger(value) || value < KTV_MIN_DURATION) {
    return "";
  }

  return formatDateTimeLocal(addMinutes(new Date(), value));
}

export function previewEndTimeFrom(endTime, minutes) {
  const start = parseEndTime(endTime);
  const value = Number(minutes);
  if (!start || !Number.isInteger(value) || value < KTV_MIN_DURATION) {
    return "";
  }

  return formatDateTimeLocal(addMinutes(start, value));
}

export function getSessionTiming(endTime, now = new Date()) {
  const end = parseEndTime(endTime);
  if (!end) {
    return { remainingSeconds: 0, state: "ended", isUrgent: false };
  }

  const remainingSeconds = Math.floor((end.getTime() - now.getTime()) / 1000);
  if (remainingSeconds > 0) {
    return {
      remainingSeconds,
      state: "active",
      isUrgent: remainingSeconds < KTV_WARNING_SECONDS,
    };
  }

  if (remainingSeconds > -(KTV_GRACE_MINUTES * 60)) {
    return { remainingSeconds: 0, state: "overtime", isUrgent: true };
  }

  return { remainingSeconds: 0, state: "ended", isUrgent: false };
}

export function formatCountdown(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${pad(minutes)}:${pad(secs)}`;
}

export function formatDurationInput(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (digits === "") {
    return "";
  }

  return String(Math.min(KTV_MAX_DURATION, parseInt(digits, 10)));
}

export function formatAmountInput(value) {
  let formatted = String(value ?? "").replace(/[^\d.]/g, "");
  const parts = formatted.split(".");
  if (parts.length > 2) {
    formatted = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (parts.length > 1) {
    formatted = `${parts[0]}.${parts[1].slice(0, 2)}`;
  }

  return formatted;
}

export function isValidDuration(value) {
  const duration = Number(value);
  return Number.isInteger(duration) && duration >= KTV_MIN_DURATION && duration <= KTV_MAX_DURATION;
}

export function isValidAmount(value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0;
}
