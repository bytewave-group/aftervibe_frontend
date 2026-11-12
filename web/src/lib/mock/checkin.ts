export const DEFAULT_CHECKIN_REWARDS = [5, 5, 5, 10, 10, 15, 20] as const;

export type DayState = "claimed" | "today" | "locked";
export type CheckinMode = "weekly_count" | "consecutive_streak";

export interface RewardPackageSummary {
  id: number;
  name: string;
  image: string | null;
}

export interface RewardGrant {
  type: string;
  amount: number;
  amountMin?: number | null;
  amountMax?: number | null;
  label: string;
  package?: RewardPackageSummary | null;
}

export function coinsGrant(amount: number): RewardGrant {
  return { type: "coins", amount, label: `${amount} Coins` };
}

export interface CheckinDay {
  day: number;
  label: string;
  reward: number;
  grant: RewardGrant;
  isBonusDay?: boolean;
  state: DayState;
}

export interface CheckinStatus {
  checkedIn: boolean;
  currentDay: number;
  cycleLength: number;
  mode: CheckinMode | string;
  streakCount: number;
  campaignActive: boolean;
  campaignStartsAt: string | null;
  campaignEndsAt: string | null;
  bonusDay: number | null;
  bonus: RewardGrant | null;
  claimedGrant?: RewardGrant | null;
  claimedBonus?: RewardGrant | null;
  reward: string | null;
  days: CheckinDay[];
}

function daysFromRewards(
  rewards: readonly number[],
  currentDay: number,
  checkedIn: boolean,
): CheckinDay[] {
  return rewards.map((reward, index) => {
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
      grant: coinsGrant(reward),
      state,
    };
  });
}

const defaultMeta = {
  cycleLength: DEFAULT_CHECKIN_REWARDS.length,
  mode: "weekly_count" as const,
  streakCount: 0,
  campaignActive: true,
  campaignStartsAt: null,
  campaignEndsAt: null,
  bonusDay: null,
  bonus: null,
};

/** Preview / fallback week: day 1 is today and unclaimed. */
export const mockCheckinStatus: CheckinStatus = {
  checkedIn: false,
  currentDay: 1,
  reward: null,
  ...defaultMeta,
  days: daysFromRewards(DEFAULT_CHECKIN_REWARDS, 1, false),
};

/** Dev-preview week: days 1-2 claimed, day 3 claimable today, the rest locked. */
export const previewCheckinStatus: CheckinStatus = {
  checkedIn: false,
  currentDay: 3,
  reward: null,
  ...defaultMeta,
  streakCount: 2,
  days: daysFromRewards(DEFAULT_CHECKIN_REWARDS, 3, false),
};
