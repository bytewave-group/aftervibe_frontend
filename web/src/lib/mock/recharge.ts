import { formatInteger } from "@/lib/format/datetime";

/**
 * Types and helpers for the recharge page.
 *
 * Real endpoints (use these first):
 *   GET  /api/customer/balance        — { balance, available_balance, reserved_coins }
 *   GET  /api/customer/coin-packages  — { coin_rate, packages: [{ id, coins, bonus_coins, price }] }
 *   GET  /api/customer/coin-orders    — { payment_available, orders }
 *   POST /api/customer/coin-orders    — { package_id } or { amount } + return_url → order.payment_url
 *   GET  /api/customer/coin-orders/{orderNo} — poll payment status + balance
 *
 * coin_rate is coins per 1 RM ("$1 = N diamonds"). Fall back to 1 if missing.
 * Custom amounts are posted as `{ amount }` (tenant currency, default 10..1,000,000).
 * Card amounts are diamonds; the deposit input is currency at `{symbol}1 = coin_rate` diamonds.
 *
 * Coins are credited only after the gateway marks the order paid. The retired
 * POST /api/customer/balance/topup is gone (410).
 */

export const RECHARGE_CURRENCY = "RM";

export const RECHARGE_MIN_AMOUNT = 10;
export const RECHARGE_MAX_AMOUNT = 1_000_000;

export type RechargePackage = {
  id: number;
  coins: number;
  price: number;
  bonus: number;
  /** Live backend package id, or null when the row is not payable as a package. */
  backendId: number | null;
};

export type RechargeBalance = {
  balance: number;
  available: number;
};

export type RechargeData = {
  balance: RechargeBalance;
  packages: RechargePackage[];
  paymentAvailable: boolean;
  currency: string;
  /** Coins granted per 1 currency unit. */
  coinRate: number;
  /** Custom deposit bounds from the catalog API (defaults 10..1,000,000). */
  minAmount: number;
  maxAmount: number;
  /** True when the package catalog could not be loaded. */
  loadError: boolean;
};

export const emptyRechargeData = (overrides: Partial<RechargeData> = {}): RechargeData => ({
  balance: { balance: 0, available: 0 },
  packages: [],
  paymentAvailable: false,
  currency: RECHARGE_CURRENCY,
  coinRate: 1,
  minAmount: RECHARGE_MIN_AMOUNT,
  maxAmount: RECHARGE_MAX_AMOUNT,
  loadError: false,
  ...overrides,
});

/**
 * Dev-only stand-in catalog (src/lib/mock/devFallback.ts). Packages have no
 * backendId and payment is off, so nothing here can start a real payment.
 */
export const mockRechargeData = (): RechargeData =>
  emptyRechargeData({
    balance: { balance: 1280, available: 1280 },
    packages: [
      { id: 1, coins: 100, price: 10, bonus: 0, backendId: null },
      { id: 2, coins: 300, price: 30, bonus: 10, backendId: null },
      { id: 3, coins: 500, price: 50, bonus: 30, backendId: null },
      { id: 4, coins: 1000, price: 100, bonus: 80, backendId: null },
      { id: 5, coins: 2000, price: 200, bonus: 200, backendId: null },
      { id: 6, coins: 5000, price: 500, bonus: 600, backendId: null },
    ],
    paymentAvailable: false,
    coinRate: 10,
  });

export function normalizeCoinRate(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function formatCoinRate(rate: number): string {
  const n = normalizeCoinRate(rate);
  if (Number.isInteger(n)) {
    return String(n);
  }
  return String(parseFloat(n.toFixed(4)));
}

export function formatInt(value: number): string {
  return formatInteger(Math.trunc(Math.abs(value)));
}

/** Whole currency units a package costs at the given coin rate. */
export function amountForCoins(coins: number, rate: number): number {
  const r = normalizeCoinRate(rate);
  return coins / r;
}

/** Diamonds granted for a typed currency amount (no bonus). */
export function diamondsForAmount(amount: number, rate: number): number {
  return Math.floor(amount * normalizeCoinRate(rate));
}

export function parseAmountInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function normalizeAmountBound(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function isAmountInRange(
  amount: number,
  min: number = RECHARGE_MIN_AMOUNT,
  max: number = RECHARGE_MAX_AMOUNT,
): boolean {
  return Number.isInteger(amount) && amount >= min && amount <= max;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: "RM",
  RM: "RM",
  USD: "$",
  SGD: "S$",
  HKD: "HK$",
  TWD: "NT$",
  CNY: "¥",
  JPY: "¥",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  THB: "฿",
  IDR: "Rp",
  VND: "₫",
  KRW: "₩",
};

/**
 * Display symbol for a tenant currency setting (ISO code, "RM", or an already-entered symbol).
 * Falls back to the backend value when Intl / the map cannot resolve a symbol.
 */
export function currencySymbol(code: string | null | undefined): string {
  const raw = (code ?? "").trim();
  if (!raw) {
    return RECHARGE_CURRENCY;
  }
  const upper = raw.toUpperCase();
  if (CURRENCY_SYMBOLS[upper]) {
    return CURRENCY_SYMBOLS[upper];
  }
  if (/^[A-Z]{3}$/i.test(raw)) {
    try {
      const parts = new Intl.NumberFormat("en", {
        style: "currency",
        currency: upper,
        currencyDisplay: "narrowSymbol",
      }).formatToParts(0);
      const symbol = parts.find((part) => part.type === "currency")?.value;
      if (symbol) {
        return symbol;
      }
    } catch {
      /* not a valid ISO currency */
    }
  }
  return raw;
}

export function packageCoversShortfall(item: RechargePackage, shortfall: number): boolean {
  return item.coins >= shortfall;
}
