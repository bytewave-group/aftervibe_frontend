"use server";

import { ApiError, fetchCheckinStatus, postCheckin } from "@/lib/api/checkin";
import { mapCheckinStatus, markDayClaimed, type CheckinStatus } from "@/lib/checkin";
import { redirectToLogin } from "@/lib/auth/unauthorized";

export type CheckinStatusResult =
  | { ok: true; status: CheckinStatus }
  | { ok: false; reason: "error" };

export type CheckinClaimResult =
  | { ok: true; status: CheckinStatus; reward: string }
  | { ok: false; reason: "already_claimed" | "error"; status?: CheckinStatus };

function handleAuth(error: unknown): never | void {
  if (error instanceof ApiError && error.status === 401) {
    redirectToLogin("/?checkin=1");
  }
}

export async function loadCheckinStatusAction(): Promise<CheckinStatusResult> {
  try {
    const status = await fetchCheckinStatus();
    return { ok: true, status };
  } catch (error) {
    handleAuth(error);
    console.error("Failed to load check-in status", error);
    return { ok: false, reason: "error" };
  }
}

export async function claimCheckinAction(
  current: CheckinStatus,
): Promise<CheckinClaimResult> {
  try {
    const payload = await postCheckin();
    return {
      ok: true,
      reward: payload.reward,
      status: mapCheckinStatus({
        checked_in: true,
        current_day: payload.current_day,
        reward: payload.reward,
        rewards: current.days.map((day) => day.reward),
      }),
    };
  } catch (error) {
    handleAuth(error);
    if (error instanceof ApiError && error.status === 422) {
      return {
        ok: false,
        reason: "already_claimed",
        status: markDayClaimed(current),
      };
    }
    console.error("Failed to claim check-in", error);
    return { ok: false, reason: "error" };
  }
}
