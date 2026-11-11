import {
  DEFAULT_CHECKIN_REWARDS,
  type CheckinDay,
  type CheckinStatus,
  type DayState,
} from "@/lib/mock/checkin";

export type { CheckinDay, CheckinStatus, DayState } from "@/lib/mock/checkin";

export function normalizeRewards(rewards: unknown): number[] {
  const defaults = [...DEFAULT_CHECKIN_REWARDS];
  if (Array.isArray(rewards)) {
    return defaults.map((fallback, index) => {
      const value = Number(rewards[index]);
      return Number.isFinite(value) ? value : fallback;
    });
  }
  if (rewards && typeof rewards === "object") {
    const record = rewards as Record<string, unknown>;
    return defaults.map((fallback, index) => {
      const day = index + 1;
      const value = Number(record[String(day)] ?? record[index]);
      return Number.isFinite(value) ? value : fallback;
    });
  }
  return defaults;
}

export function mapCheckinStatus(payload: {
  checked_in: boolean;
  current_day: number;
  reward?: string | null;
  rewards?: unknown;
}): CheckinStatus {
  const currentDay = Math.min(7, Math.max(1, Number(payload.current_day) || 1));
  const rewards = normalizeRewards(payload.rewards);
  const checkedIn = Boolean(payload.checked_in);

  const days: CheckinDay[] = rewards.map((reward, index) => {
    const day = index + 1;
    let state: DayState;
    if (checkedIn) {
      state = day <= currentDay ? "claimed" : "locked";
    } else if (day < currentDay) {
      state = "claimed";
    } else if (day === currentDay) {
      state = "today";
    } else {
      state = "locked";
    }
    return {
      day,
      label: String(day).padStart(2, "0"),
      reward,
      state,
    };
  });

  return {
    checkedIn,
    currentDay,
    reward: payload.reward ?? null,
    days,
  };
}

export function markDayClaimed(
  status: CheckinStatus,
  currentDay = status.currentDay,
  reward?: string | null,
): CheckinStatus {
  return {
    checkedIn: true,
    currentDay,
    reward: reward ?? status.reward,
    days: status.days.map((day) => ({
      ...day,
      state: day.day <= currentDay ? "claimed" : "locked",
    })),
  };
}
