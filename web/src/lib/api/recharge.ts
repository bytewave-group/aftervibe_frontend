import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet, apiPost, ApiError } from "@/lib/api/browser";
import { loadMe } from "@/lib/api/me-cache";
import type { CoinOrderDto, CoinOrdersResponse } from "@/lib/api/types";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  RECHARGE_CURRENCY,
  emptyRechargeData,
  mockRechargeData,
  normalizeAmountBound,
  normalizeCoinRate,
  RECHARGE_MAX_AMOUNT,
  RECHARGE_MIN_AMOUNT,
  type RechargeBalance,
  type RechargeData,
  type RechargePackage,
} from "@/lib/mock/recharge";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

export type { RechargeBalance, RechargeData, RechargePackage };

type BalanceResponse = {
  success?: boolean;
  balance?: number;
  available_balance?: number;
  reserved_coins?: number;
};

type CoinPackageDto = {
  id: number;
  coins?: number | string;
  price?: number | string;
  bonus_coins?: number | string;
  bonus?: number | string;
};

type CoinPackagesResponse = {
  success?: boolean;
  coin_rate?: number | string;
  currency?: string;
  min_amount?: number | string;
  max_amount?: number | string;
  packages?: CoinPackageDto[];
};

type CreateOrderResponse = {
  success?: boolean;
  message?: string;
  order?: CoinOrderDto;
};

type CoinOrderShowResponse = {
  success?: boolean;
  order?: CoinOrderDto;
  balance?: number;
};

export type CreateCoinOrderResult =
  | { ok: true; paymentUrl: string; orderNo: string }
  | { ok: false; reason: "unavailable" | "error"; message: string };

export type CoinOrderStatusResult = {
  status: string;
  coins: number;
  bonusCoins: number;
  balance: number | null;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapPackage(dto: CoinPackageDto): RechargePackage | null {
  const id = asNumber(dto.id, 0);
  if (!id) {
    return null;
  }
  return {
    id,
    coins: asNumber(dto.coins, 0),
    price: asNumber(dto.price, 0),
    bonus: Math.max(0, asNumber(dto.bonus_coins ?? dto.bonus, 0)),
    backendId: id,
  };
}

async function fetchBalance(): Promise<RechargeBalance> {
  try {
    const payload = await apiGet<BalanceResponse>("/api/customer/balance", "required");
    const balance = asNumber(payload.balance, 0);
    const reserved = asNumber(payload.reserved_coins, 0);
    const available =
      payload.available_balance == null
        ? Math.max(0, balance - reserved)
        : Math.max(0, asNumber(payload.available_balance, 0));
    return { balance, available };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    logApiFallback(
      "[recharge] GET /api/customer/balance failed; falling back to /api/customer/me",
      error,
    );
    const customer = await loadMe();
    const balance = asNumber(customer?.balance, 0);
    return { balance, available: balance };
  }
}

export async function loadRecharge(): Promise<RechargeData> {
  try {
    const [balance, packages, orders] = await Promise.all([
      fetchBalance(),
      apiGet<CoinPackagesResponse>("/api/customer/coin-packages", "required"),
      apiGet<CoinOrdersResponse>("/api/customer/coin-orders", "required").catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          throw error;
        }
        logApiFallback(
          "[recharge] GET /api/customer/coin-orders failed; assuming payment may still be available",
          error,
        );
        return { success: true, payment_available: true, orders: [] } satisfies CoinOrdersResponse;
      }),
    ]);
    const list = (packages.packages ?? [])
      .map(mapPackage)
      .filter((item): item is RechargePackage => item !== null)
      .sort((a, b) => a.coins - b.coins);
    const currency = (packages.currency ?? "").trim() || RECHARGE_CURRENCY;
    return devMockIfEmpty("recharge.packages", {
      balance,
      packages: list,
      paymentAvailable: orders.payment_available !== false,
      currency,
      coinRate: normalizeCoinRate(packages.coin_rate),
      minAmount: normalizeAmountBound(packages.min_amount, RECHARGE_MIN_AMOUNT),
      maxAmount: normalizeAmountBound(packages.max_amount, RECHARGE_MAX_AMOUNT),
      loadError: false,
    }, list.length === 0, () => ({ ...mockRechargeData(), balance }));
  } catch (error) {
    redirectIfUnauthorized(error, "/recharge");
    logApiFallback("[recharge] coin package/balance APIs failed; showing empty error state", error);
    return devMockOnError("recharge", error, mockRechargeData, () => emptyRechargeData({ loadError: true }));
  }
}

function isSafeReturnUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return safeRedirectPath(url.pathname, "") === url.pathname && url.pathname.startsWith("/recharge");
  } catch {
    return false;
  }
}

export type CreateCoinOrderInput =
  | { packageId: number; amount?: undefined }
  | { amount: number; packageId?: undefined };

/**
 * Starts a gateway payment for a backend package or a custom currency amount.
 */
export async function createCoinOrderAction(
  input: CreateCoinOrderInput,
  returnUrl: string,
): Promise<CreateCoinOrderResult> {
  const body: Record<string, unknown> = { return_url: returnUrl };
  if ("packageId" in input && input.packageId != null) {
    if (!Number.isFinite(input.packageId) || input.packageId <= 0) {
      return { ok: false, reason: "error", message: "Invalid package." };
    }
    body.package_id = input.packageId;
  } else if ("amount" in input && input.amount != null) {
    if (!Number.isFinite(input.amount) || input.amount < RECHARGE_MIN_AMOUNT || input.amount > RECHARGE_MAX_AMOUNT) {
      return { ok: false, reason: "error", message: "Invalid amount." };
    }
    body.amount = input.amount;
  } else {
    return { ok: false, reason: "error", message: "Invalid package." };
  }
  if (!isSafeReturnUrl(returnUrl)) {
    return { ok: false, reason: "error", message: "Invalid return URL." };
  }
  try {
    const payload = await apiPost<CreateOrderResponse>(
      "/api/customer/coin-orders",
      body,
      "required",
    );
    const paymentUrl = payload.order?.payment_url;
    const orderNo = payload.order?.order_no;
    if (!paymentUrl || !orderNo) {
      return { ok: false, reason: "error", message: payload.message || "Unable to start the payment." };
    }
    return { ok: true, paymentUrl, orderNo };
  } catch (error) {
    redirectIfUnauthorized(error, "/recharge");
    if (error instanceof ApiError && error.status === 503) {
      return { ok: false, reason: "unavailable", message: error.message };
    }
    logApiFallback("[recharge] POST /api/customer/coin-orders failed", error);
    return {
      ok: false,
      reason: "error",
      message: error instanceof ApiError ? error.message : "Unable to start the payment.",
    };
  }
}

export async function checkCoinOrderAction(
  orderNo: string,
): Promise<CoinOrderStatusResult | null> {
  const trimmed = orderNo.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const payload = await apiGet<CoinOrderShowResponse>(
      `/api/customer/coin-orders/${encodeURIComponent(trimmed)}`,
      "required",
    );
    return {
      status: payload.order?.status || "unknown",
      coins: asNumber(payload.order?.coins, 0),
      bonusCoins: asNumber(payload.order?.bonus_coins, 0),
      balance: payload.balance == null ? null : asNumber(payload.balance, 0),
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/recharge");
    logApiFallback("[recharge] GET /api/customer/coin-orders/{orderNo} failed", error);
    return null;
  }
}
