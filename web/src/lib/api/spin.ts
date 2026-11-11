"use server";

import { apiGet, apiPost, ApiError } from "@/lib/api/server";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import type {
  SpinPrizeDto,
  SpinWheelResponse,
  SpinWheelSpinResponse,
} from "@/lib/api/types";
import {
  mockSpinStatus,
  type SpinPrize,
  type SpinPrizeType,
  type SpinPayWith,
  type SpinResult,
  type SpinStatus,
} from "@/lib/mock/spin";
import { revalidatePath } from "next/cache";

export type { SpinResult, SpinStatus };

function asPrizeType(value: string | undefined): SpinPrizeType {
  return value === "coins" ? "coins" : "points";
}

function mapPrize(prize: SpinPrizeDto): SpinPrize {
  return {
    type: asPrizeType(prize.type),
    amount: Number(prize.amount) || 0,
  };
}

function mapStatus(payload: SpinWheelResponse): SpinStatus {
  return {
    chances: Number(payload.chances) || 0,
    dailyChances: Number(payload.daily_chances) || 0,
    nextSpinSeconds: Number(payload.next_spin_seconds) || 0,
    cost: {
      coins: payload.cost?.coins ?? null,
      points: payload.cost?.points ?? null,
    },
    balance: Number(payload.balance) || 0,
    rewardPoints: Number(payload.reward_points) || 0,
    prizes: (payload.prizes ?? []).map(mapPrize),
  };
}

function mapPaidWith(value: string | undefined): SpinPayWith {
  if (value === "coins" || value === "points" || value === "free") {
    return value;
  }
  return "free";
}

export async function loadSpinStatus(): Promise<SpinStatus> {
  try {
    const payload = await apiGet<SpinWheelResponse>(
      "/api/customer/spin-wheel",
      "required",
    );
    return mapStatus(payload);
  } catch (error) {
    redirectIfUnauthorized(error, "/spin");
    logApiFallback(
      "[spin] GET /api/customer/spin-wheel failed; falling back to mock spin data",
      error,
    );
    return structuredClone(mockSpinStatus);
  }
}

export async function performSpin(
  _status: SpinStatus,
  payWith?: "coins" | "points" | null,
): Promise<SpinResult> {
  try {
    const payload = await apiPost<SpinWheelSpinResponse>(
      "/api/customer/spin-wheel/spin",
      payWith ? { pay_with: payWith } : {},
      "required",
    );
    revalidatePath("/spin");
    revalidatePath("/profile");
    revalidatePath("/profile/history");
    return {
      prizeIndex: Number(payload.prize_index) || 0,
      prize: mapPrize(payload.prize),
      paidWith: mapPaidWith(payload.paid_with),
      costAmount: Number(payload.cost_amount) || 0,
      balance: Number(payload.balance) || 0,
      rewardPoints: Number(payload.reward_points) || 0,
      chances: Number(payload.chances) || 0,
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/spin");
    throw new Error(
      error instanceof ApiError ? error.message : "Unable to spin right now.",
    );
  }
}
