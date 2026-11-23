import { resolveMediaUrl } from "@/lib/api/images";
import { apiGet, apiPost, ApiError } from "@/lib/api/browser";
import { patchMe } from "@/lib/api/me-cache";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import type {
  SpinPrizeDto,
  SpinWheelResponse,
  SpinWheelSpinResponse,
} from "@/lib/api/types";
import {
  mockSpinStatus,
  type SpinPrize,
  type SpinPayWith,
  type SpinResult,
  type SpinStatus,
} from "@/lib/mock/spin";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

export type { SpinResult, SpinStatus };

function mapPrize(prize: SpinPrizeDto): SpinPrize {
  const type = typeof prize.type === "string" && prize.type ? prize.type : "none";
  const min = prize.amount_min == null ? null : Number(prize.amount_min);
  const max = prize.amount_max == null ? null : Number(prize.amount_max);
  return {
    type,
    amount: Number(prize.amount) || 0,
    amountMin: min != null && Number.isFinite(min) ? min : null,
    amountMax: max != null && Number.isFinite(max) ? max : null,
    label: prize.label,
    package: prize.package
      ? {
          ...prize.package,
          image: resolveMediaUrl(prize.package.image),
        }
      : null,
  };
}

function mapStatus(payload: SpinWheelResponse): SpinStatus {
  const prizes = (payload.prizes ?? []).map(mapPrize);
  const cost = {
    coins: payload.cost?.coins ?? null,
    points: payload.cost?.points ?? null,
  };
  const dailyChances = Number(payload.daily_chances) || 0;
  const hasPaid = cost.coins != null || cost.points != null;
  return {
    configured: payload.enabled !== false && prizes.length > 0 && (dailyChances > 0 || hasPaid),
    chances: Number(payload.chances) || 0,
    dailyChances,
    freeSpinPeriod: payload.free_spin_period === "weekly" ? "weekly" : "daily",
    nextSpinSeconds: Number(payload.next_spin_seconds) || 0,
    cost,
    balance: spendableBalance(payload),
    rewardPoints: Number(payload.reward_points) || 0,
    paidSpinsRemaining:
      payload.paid_spins_remaining === undefined
        ? null
        : payload.paid_spins_remaining,
    prizes,
  };
}

function spendableBalance(payload: { balance: number; available_balance?: number | null }): number {
  const amount = payload.available_balance ?? payload.balance;
  return Number(amount) || 0;
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
    const status = mapStatus(payload);
    if (!status.configured) return status;
    return devMockIfEmpty("spin", status, status.prizes.length === 0, () => structuredClone(mockSpinStatus));
  } catch (error) {
    redirectIfUnauthorized(error, "/spin");
    logApiFallback("[spin] GET /api/customer/spin-wheel failed", error);
    return devMockOnError("spin", error, () => structuredClone(mockSpinStatus), () => ({
      configured: false,
      chances: 0,
      dailyChances: 0,
      nextSpinSeconds: 0,
      cost: { coins: null, points: null },
      balance: 0,
      rewardPoints: 0,
      paidSpinsRemaining: null,
      prizes: [],
    }));
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
    const balance = spendableBalance(payload);
    const rewardPoints = Number(payload.reward_points) || 0;
    patchMe({
      reward_points: rewardPoints,
      balance,
      available_balance: payload.available_balance ?? balance,
    });
    return {
      prizeIndex: Number(payload.prize_index) || 0,
      prize: mapPrize(payload.prize),
      paidWith: mapPaidWith(payload.paid_with),
      costAmount: Number(payload.cost_amount) || 0,
      balance,
      rewardPoints,
      chances: Number(payload.chances) || 0,
      paidSpinsRemaining:
        payload.paid_spins_remaining === undefined
          ? null
          : payload.paid_spins_remaining,
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/spin");
    throw new Error(
      error instanceof ApiError ? error.message : "Unable to spin right now.",
    );
  }
}
