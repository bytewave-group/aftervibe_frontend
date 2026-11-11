"use server";

import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet, apiPost, ApiError } from "@/lib/api/server";
import type { CoinOrderDto, CoinOrdersResponse, MeResponse } from "@/lib/api/types";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  RECHARGE_CURRENCY,
  mockRechargeData,
  type RechargeBalance,
  type RechargeData,
  type RechargePackage,
} from "@/lib/mock/recharge";

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
};

type CoinPackagesResponse = {
  success?: boolean;
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
    const me = await apiGet<MeResponse>("/api/customer/me", "required");
    const balance = asNumber(me.customer?.balance, 0);
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
    return {
      balance,
      packages: list,
      paymentAvailable: orders.payment_available !== false,
      currency: orders.orders?.[0]?.currency === "MYR" ? "RM" : RECHARGE_CURRENCY,
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/recharge");
    logApiFallback(
      "[recharge] coin package/balance APIs failed; falling back to mock recharge data",
      error,
    );
    return structuredClone(mockRechargeData);
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

export async function createCoinOrderAction(
  packageId: number,
  returnUrl: string,
): Promise<CreateCoinOrderResult> {
  if (!Number.isFinite(packageId) || packageId <= 0) {
    return { ok: false, reason: "error", message: "Invalid package." };
  }
  if (!isSafeReturnUrl(returnUrl)) {
    return { ok: false, reason: "error", message: "Invalid return URL." };
  }
  try {
    const payload = await apiPost<CreateOrderResponse>(
      "/api/customer/coin-orders",
      { package_id: packageId, return_url: returnUrl },
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
      balance: payload.balance == null ? null : asNumber(payload.balance, 0),
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/recharge");
    logApiFallback("[recharge] GET /api/customer/coin-orders/{orderNo} failed", error);
    return null;
  }
}
