/**
 * History page data access (gift records + recharge records).
 *
 * Gift list:
 *   GET /api/customer/gifts  (CustomerGiftApiController::index, auth required)
 *   Paginated playlists the customer sent, excluding cancelled, newest first.
 * Received gifts (own page, /profile/received-gifts):
 *   GET /api/customer/gifts?direction=received  (same controller, receivedPayload)
 *   Gifts other customers sent me: sender_name/avatar/membership_tier, points_earned.
 *
 * Recharge list:
 *   GET /api/customer/coin-orders  (CoinOrderApiController::index, auth required)
 *   Returns the latest 20 orders (not a paginator), including payment_method
 *   when the gateway payload has a category/provider.
 * Recharge detail:
 *   GET /api/customer/coin-orders/{id|orderNo}
 */
import { displayImageUrl, resolveMediaUrl } from "@/lib/api/images";
import {
  collectPages,
  logApiFallback,
  redirectIfUnauthorized,
} from "@/lib/api/paginate";
import { ApiError, apiGet } from "@/lib/api/browser";
import type {
  CoinOrderDto,
  CoinOrderPaymentMethodDto,
  CoinOrderShowResponse,
  CoinOrdersResponse,
  CustomerGiftDto,
  CustomerGiftsResponse,
} from "@/lib/api/types";
import {
  GIFT_PLACEHOLDER_IMAGE,
  mockGiftRecords,
  mockRechargeRecords,
  type GiftRecord,
  mockReceivedGiftRecords,
  type HistoryData,
  type ReceivedGiftRecord,
  type RechargeMethod,
  type RechargeRecord,
} from "@/lib/mock/history";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

export type { GiftRecord, HistoryData, ReceivedGiftRecord, RechargeRecord };

/** Row of GET /api/customer/gifts?direction=received (CustomerGiftApiController::receivedPayload). */
interface CustomerReceivedGiftDto {
  id: number;
  direction?: "received";
  sent_at: string | null;
  sender_customer_id?: number | null;
  sender_name: string;
  sender_avatar?: string | null;
  sender_membership_tier?: unknown;
  gift_name: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  image: string | null;
  points_earned?: number;
}

function displayCurrency(currency: string | undefined): string {
  const value = (currency ?? "").trim();
  if (!value || value.toUpperCase() === "MYR") {
    return "RM";
  }
  return value;
}

function mapPaymentMethod(
  payment: CoinOrderPaymentMethodDto | null | undefined,
): {
  category: RechargeRecord["category"];
  method: RechargeMethod | null;
  provider: string | null;
} {
  if (!payment) {
    return { category: null, method: null, provider: null };
  }
  const raw = payment.category;
  const category = raw === "bank" || raw === "ewallet" || raw === "card" ? raw : null;
  const method: RechargeMethod | null =
    category === "bank" || category === "ewallet" ? category : null;
  const provider = payment.provider?.trim() || null;
  return { category, method, provider };
}

export function mapRecharge(order: CoinOrderDto, index = 0): RechargeRecord {
  const payment = mapPaymentMethod(order.payment_method);
  const orderNo = (order.order_no || String(order.id || index + 1)).trim();
  return {
    id: orderNo,
    orderNo,
    category: payment.category,
    method: payment.method,
    provider: payment.provider,
    amount: Number(order.amount) || 0,
    currency: displayCurrency(order.currency),
    createdAt: order.paid_at || order.created_at || "",
  };
}

function mapGift(item: CustomerGiftDto): GiftRecord {
  return {
    id: item.id,
    sentAt: item.sent_at || "",
    recipientName: item.recipient_name || "",
    giftName: item.gift_name || "",
    quantity: Number(item.quantity) || 1,
    totalAmount:
      item.total_amount == null || !Number.isFinite(Number(item.total_amount))
        ? null
        : Number(item.total_amount),
    image: displayImageUrl(item.image, GIFT_PLACEHOLDER_IMAGE),
  };
}

function mapReceivedGift(item: CustomerReceivedGiftDto): ReceivedGiftRecord {
  return {
    id: item.id,
    sentAt: item.sent_at || "",
    senderName: item.sender_name || "",
    senderAvatar: resolveMediaUrl(item.sender_avatar),
    senderTier: item.sender_membership_tier ?? null,
    giftName: item.gift_name || "",
    quantity: Number(item.quantity) || 1,
    totalAmount:
      item.total_amount == null || !Number.isFinite(Number(item.total_amount))
        ? null
        : Number(item.total_amount),
    image: displayImageUrl(item.image, GIFT_PLACEHOLDER_IMAGE),
    pointsEarned: Math.max(0, Number(item.points_earned) || 0),
  };
}

function mockReceivedGifts(): ReceivedGiftRecord[] {
  return structuredClone(mockReceivedGiftRecords).map((item) => ({
    ...item,
    image: displayImageUrl(item.image, GIFT_PLACEHOLDER_IMAGE),
  }));
}

/** 收到的礼物 page: only the received list (the history page no longer loads it). */
export async function loadReceivedGifts(): Promise<ReceivedGiftRecord[]> {
  try {
    const rows = await collectPages(async (page) => {
      const payload = await apiGet<{
        success: boolean;
        gifts: { data?: CustomerReceivedGiftDto[]; current_page?: number; last_page?: number };
      }>(`/api/customer/gifts?direction=received&page=${page}`, "required");
      return payload.gifts ?? {};
    });
    const records = rows.map(mapReceivedGift);
    return devMockIfEmpty("history.received", records, records.length === 0, mockReceivedGifts);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/received-gifts");
    logApiFallback("[history] GET /api/customer/gifts?direction=received failed", error);
    return devMockOnError("history.received", error, mockReceivedGifts, () => []);
  }
}

function mockGifts(): GiftRecord[] {
  return structuredClone(mockGiftRecords).map((item) => ({
    ...item,
    image: displayImageUrl(item.image, GIFT_PLACEHOLDER_IMAGE),
  }));
}

async function loadGiftRecords(): Promise<GiftRecord[]> {
  try {
    const rows = await collectPages(async (page) => {
      const payload = await apiGet<CustomerGiftsResponse>(
        `/api/customer/gifts?page=${page}`,
        "required",
      );
      return payload.gifts ?? {};
    });
    const records = rows.map(mapGift);
    return devMockIfEmpty("history.gifts", records, records.length === 0, mockGifts);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/history");
    logApiFallback("[history] GET /api/customer/gifts failed", error);
    return devMockOnError("history.gifts", error, mockGifts, () => []);
  }
}

async function loadRechargeRecords(): Promise<RechargeRecord[]> {
  try {
    const payload = await apiGet<CoinOrdersResponse>(
      "/api/customer/coin-orders",
      "required",
    );
    const records = (payload.orders ?? [])
      .filter((order) => order.status === "paid")
      .map(mapRecharge);
    return devMockIfEmpty("history.recharges", records, records.length === 0, () =>
      structuredClone(mockRechargeRecords),
    );
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/history");
    logApiFallback("[history] GET /api/customer/coin-orders failed", error);
    return devMockOnError("history.recharges", error, () => structuredClone(mockRechargeRecords), () => []);
  }
}

export async function loadHistory(): Promise<HistoryData> {
  const [gifts, recharges] = await Promise.all([
    loadGiftRecords(),
    loadRechargeRecords(),
  ]);
  return { gifts, recharges };
}

export async function loadCoinOrder(orderNoOrId: string): Promise<RechargeRecord | null> {
  const trimmed = orderNoOrId.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const payload = await apiGet<CoinOrderShowResponse>(
      `/api/customer/coin-orders/${encodeURIComponent(trimmed)}`,
      "required",
    );
    if (!payload.order) {
      return null;
    }
    return mapRecharge(payload.order);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/history?tab=recharge");
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    logApiFallback(
      "[history] GET /api/customer/coin-orders/{id} failed",
      error,
    );
    return devMockOnError(
      "history.recharge",
      error,
      () => structuredClone(mockRechargeRecords.find((item) => item.id === trimmed) ?? null),
      () => null,
    );
  }
}
