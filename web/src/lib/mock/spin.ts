/**
 * Static stand-in for the lucky spin wheel.
 *
 * Maps to:
 *   GET  /api/customer/spin-wheel          — CustomerSpinApiController::status
 *   POST /api/customer/spin-wheel/spin     — { pay_with?: "coins" | "points" }
 *
 * Prize labels are built from type + amount. Win odds stay server-side; this
 * mock always lands on a fixed slot so the animation is predictable.
 */

export type SpinPrizeType = "coins" | "points";
export type SpinPayWith = "free" | "coins" | "points";

export interface SpinPrize {
  type: SpinPrizeType;
  amount: number;
}

export interface SpinStatus {
  chances: number;
  dailyChances: number;
  nextSpinSeconds: number;
  cost: { coins: number | null; points: number | null };
  balance: number;
  rewardPoints: number;
  prizes: SpinPrize[];
}

export interface SpinResult {
  prizeIndex: number;
  prize: SpinPrize;
  paidWith: SpinPayWith;
  costAmount: number;
  balance: number;
  rewardPoints: number;
  chances: number;
}

export const SLOT_COUNT = 8;
export const SLOT_ANGLE = 360 / SLOT_COUNT;
export const SPIN_DURATION_MS = 4000;

/** Default 8-slot wheel, same order as Reward::DEFAULT_SPIN_PRIZES. */
export const mockSpinPrizes: SpinPrize[] = [
  { type: "points", amount: 5 },
  { type: "points", amount: 10 },
  { type: "points", amount: 15 },
  { type: "coins", amount: 5 },
  { type: "points", amount: 20 },
  { type: "coins", amount: 10 },
  { type: "points", amount: 30 },
  { type: "coins", amount: 20 },
];

export const mockSpinStatus: SpinStatus = {
  chances: 2,
  dailyChances: 3,
  nextSpinSeconds: 0,
  cost: { coins: 20, points: 50 },
  balance: 10,
  rewardPoints: 120,
  prizes: mockSpinPrizes,
};

/** Slot 5 = 10 coins. Predictable so the result popup matches the wheel stop. */
const MOCK_PRIZE_INDEX = 5;

export function mockPerformSpin(
  status: SpinStatus,
  payWith?: "coins" | "points" | null,
): SpinResult {
  const prize = status.prizes[MOCK_PRIZE_INDEX] ?? status.prizes[0];
  const isFree = status.chances > 0;
  const paidWith: SpinPayWith = isFree
    ? "free"
    : payWith === "points"
      ? "points"
      : "coins";
  const costAmount = isFree
    ? 0
    : paidWith === "points"
      ? (status.cost.points ?? 0)
      : (status.cost.coins ?? 0);

  let balance = status.balance;
  let rewardPoints = status.rewardPoints;
  if (!isFree && paidWith === "coins") {
    balance -= costAmount;
  }
  if (!isFree && paidWith === "points") {
    rewardPoints -= costAmount;
  }
  if (prize.type === "coins") {
    balance += prize.amount;
  } else {
    rewardPoints += prize.amount;
  }

  return {
    prizeIndex: MOCK_PRIZE_INDEX,
    prize,
    paidWith,
    costAmount,
    balance,
    rewardPoints,
    chances: isFree ? Math.max(0, status.chances - 1) : status.chances,
  };
}
