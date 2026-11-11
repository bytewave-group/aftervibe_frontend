export const DEFAULT_CHECKIN_REWARDS = [5, 5, 5, 10, 10, 15, 20] as const;

export type DayState = "claimed" | "today" | "locked";

export interface CheckinDay {
  day: number;
  label: string;
  reward: number;
  state: DayState;
}

export interface CheckinStatus {
  checkedIn: boolean;
  currentDay: number;
  reward: string | null;
  days: CheckinDay[];
}

/** Preview / fallback week: day 1 is today and unclaimed. */
export const mockCheckinStatus: CheckinStatus = {
  checkedIn: false,
  currentDay: 1,
  reward: null,
  days: DEFAULT_CHECKIN_REWARDS.map((reward, index) => {
    const day = index + 1;
    return {
      day,
      label: String(day).padStart(2, "0"),
      reward,
      state: day === 1 ? "today" : "locked",
    };
  }),
};

/** Dev-preview week: days 1-2 claimed, day 3 claimable today, the rest locked. */
export const previewCheckinStatus: CheckinStatus = {
  checkedIn: false,
  currentDay: 3,
  reward: null,
  days: DEFAULT_CHECKIN_REWARDS.map((reward, index) => {
    const day = index + 1;
    const state = day <= 2 ? "claimed" : day === 3 ? "today" : "locked";
    return {
      day,
      label: String(day).padStart(2, "0"),
      reward,
      state,
    };
  }),
};
