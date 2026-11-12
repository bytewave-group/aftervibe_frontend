import type { CheckinStatusResponse, RewardGrantDto } from "@/lib/api/types";
import {
  DEFAULT_CHECKIN_REWARDS,
  coinsGrant,
  type CheckinDay,
  type CheckinStatus,
  type DayState,
  type RewardGrant,
} from "@/lib/mock/checkin";

export type {
  CheckinDay,
  CheckinStatus,
  DayState,
  RewardGrant,
} from "@/lib/mock/checkin";

const MAX_CYCLE_LENGTH = 31;

function defaultGrants(length: number): RewardGrant[] {
  const defaults = [...DEFAULT_CHECKIN_REWARDS];
  const last = defaults[defaults.length - 1] ?? 5;
  return Array.from({ length }, (_, index) =>
    coinsGrant(defaults[index] ?? last),
  );
}

function packageSummary(
  value: unknown,
): RewardGrant["package"] {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = Number(record.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return {
    id,
    name: typeof record.name === "string" ? record.name : "",
    image: typeof record.image === "string" ? record.image : null,
  };
}

export function normalizeGrant(
  value: unknown,
  fallback?: RewardGrant,
): RewardGrant {
  if (typeof value === "number" && Number.isFinite(value)) {
    return coinsGrant(value);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const type =
      typeof record.type === "string" && record.type ? record.type : "coins";
    const amount = Number(record.amount);
    const rawMin = record.amount_min ?? record.amountMin;
    const rawMax = record.amount_max ?? record.amountMax;
    const min = rawMin == null ? null : Number(rawMin);
    const max = rawMax == null ? null : Number(rawMax);
    return {
      type,
      amount: Number.isFinite(amount) ? amount : 0,
      amountMin: min != null && Number.isFinite(min) ? min : null,
      amountMax: max != null && Number.isFinite(max) ? max : null,
      label: typeof record.label === "string" ? record.label : "",
      package: packageSummary(record.package),
    };
  }
  return fallback ?? coinsGrant(0);
}

export function normalizeGrants(
  rewards: unknown,
  cycleLength: number = DEFAULT_CHECKIN_REWARDS.length,
): RewardGrant[] {
  const length = Math.min(MAX_CYCLE_LENGTH, Math.max(1, cycleLength));
  const defaults = defaultGrants(length);
  if (Array.isArray(rewards)) {
    return defaults.map((fallback, index) =>
      normalizeGrant(rewards[index], fallback),
    );
  }
  if (rewards && typeof rewards === "object") {
    const record = rewards as Record<string, unknown>;
    return defaults.map((fallback, index) => {
      const day = index + 1;
      return normalizeGrant(record[String(day)] ?? record[index], fallback);
    });
  }
  return defaults;
}

/** Legacy helper: amounts only. Prefer normalizeGrants for typed rewards. */
export function normalizeRewards(rewards: unknown): number[] {
  return normalizeGrants(rewards).map((grant) => grant.amount);
}

export function grantCaption(
  t: (key: string, vars?: Record<string, string | number>) => string,
  grant: RewardGrant,
): string {
  switch (grant.type) {
    case "coins":
      return t("checkin.rewardCoins", { n: grant.amount });
    case "points":
      return t("checkin.rewardPoints", { n: grant.amount });
    case "spin_chances":
      return t("checkin.rewardSpinChances", { n: grant.amount });
    case "none":
      return t("checkin.rewardNone");
    case "reward_package":
      return grant.package?.name || grant.label || t("spin.prizePackage", { name: "" });
    default:
      return grant.label || String(grant.amount);
  }
}

export function claimedRewardText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  status: Pick<CheckinStatus, "claimedGrant" | "claimedBonus" | "reward">,
): string {
  const parts: string[] = [];
  if (status.claimedGrant) {
    parts.push(grantCaption(t, status.claimedGrant));
  }
  if (status.claimedBonus) {
    parts.push(grantCaption(t, status.claimedBonus));
  }
  if (parts.length > 0) {
    return parts.join(" + ");
  }
  return status.reward ?? "";
}

function resolveCycleLength(payload: {
  cycle_length?: number;
  rewards?: unknown;
}): number {
  const fromPayload = Number(payload.cycle_length);
  if (Number.isFinite(fromPayload) && fromPayload >= 1) {
    return Math.min(MAX_CYCLE_LENGTH, Math.floor(fromPayload));
  }
  if (Array.isArray(payload.rewards) && payload.rewards.length > 0) {
    return Math.min(MAX_CYCLE_LENGTH, payload.rewards.length);
  }
  return DEFAULT_CHECKIN_REWARDS.length;
}

export function mapCheckinStatus(
  payload: CheckinStatusResponse | {
    checked_in: boolean;
    current_day: number;
    cycle_length?: number;
    mode?: string;
    streak_count?: number;
    campaign_active?: boolean;
    campaign_starts_at?: string | null;
    campaign_ends_at?: string | null;
    bonus_day?: number | null;
    bonus?: RewardGrantDto | RewardGrant | null;
    grant?: RewardGrantDto | RewardGrant | null;
    bonus_grant?: RewardGrantDto | RewardGrant | null;
    reward?: string | null;
    rewards?: unknown;
  },
): CheckinStatus {
  const cycleLength = resolveCycleLength(payload);
  const currentDay = Math.min(
    cycleLength,
    Math.max(1, Number(payload.current_day) || 1),
  );
  const grants = normalizeGrants(payload.rewards, cycleLength);
  const checkedIn = Boolean(payload.checked_in);
  const bonusDay =
    payload.bonus_day != null && Number(payload.bonus_day) > 0
      ? Number(payload.bonus_day)
      : null;

  const days: CheckinDay[] = grants.map((grant, index) => {
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
      reward: grant.amount,
      grant,
      isBonusDay: bonusDay === day,
      state,
    };
  });

  return {
    checkedIn,
    currentDay,
    cycleLength,
    mode: payload.mode || "weekly_count",
    streakCount: Math.max(0, Number(payload.streak_count) || 0),
    campaignActive: payload.campaign_active !== false,
    campaignStartsAt: payload.campaign_starts_at ?? null,
    campaignEndsAt: payload.campaign_ends_at ?? null,
    bonusDay,
    bonus: payload.bonus ? normalizeGrant(payload.bonus) : null,
    claimedGrant: payload.grant ? normalizeGrant(payload.grant) : null,
    claimedBonus: payload.bonus_grant
      ? normalizeGrant(payload.bonus_grant)
      : null,
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
    ...status,
    checkedIn: true,
    currentDay,
    reward: reward ?? status.reward,
    days: status.days.map((day) => ({
      ...day,
      state: day.day <= currentDay ? "claimed" : "locked",
    })),
  };
}
