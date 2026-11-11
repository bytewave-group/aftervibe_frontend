/**
 * History page data access (gift records + recharge records).
 *
 * Gift list:
 *   GET /api/customer/gifts  (CustomerGiftApiController::index, auth required)
 *   Paginated playlists the customer sent, excluding cancelled, newest first.
 *
 * Recharge list:
 *   GET /api/customer/coin-orders  (CoinOrderApiController::index, auth required)
 *   Returns the latest 20 orders (not a paginator). Payment method/gateway
 *   is stored on CoinOrder but is not included in CoinOrderService::toPayload.
 */
import { displayImageUrl } from "@/lib/api/images";
import {
  collectPages,
  logApiFallback,
  redirectIfUnauthorized,
} from "@/lib/api/paginate";
import { apiGet } from "@/lib/api/server";
import type {
  CoinOrderDto,
  CoinOrdersResponse,
  CustomerGiftDto,
  CustomerGiftsResponse,
} from "@/lib/api/types";
import {
  GIFT_PLACEHOLDER_IMAGE,
  mockGiftRecords,
  mockRechargeRecords,
  type GiftRecord,
  type HistoryData,
  type RechargeMethod,
  type RechargeRecord,
} from "@/lib/mock/history";

export type { GiftRecord, HistoryData, RechargeRecord };

function stableOrderId(orderNo: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < orderNo.length; i += 1) {
    hash = (hash * 31 + orderNo.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || index + 1;
}

function displayCurrency(currency: string | undefined): string {
  const value = (currency ?? "").trim();
  if (!value || value.toUpperCase() === "MYR") {
    return "RM";
  }
  return value;
}

function mapPaymentMethod(gateway: string | null | undefined): {
  method: RechargeMethod;
  provider: string;
} {
  const name = (gateway ?? "").trim();
  const lower = name.toLowerCase();
  const bankHints = [
    "bank",
    "fpx",
    "maybank",
    "cimb",
    "rhb",
    "public",
    "hong leong",
    "islam",
  ];
  const ewalletHints = [
    "tng",
    "touch",
    "grab",
    "boost",
    "shopee",
    "ewallet",
    "e-wallet",
    "wallet",
  ];
  if (bankHints.some((hint) => lower.includes(hint))) {
    return { method: "bank", provider: name };
  }
  if (ewalletHints.some((hint) => lower.includes(hint))) {
    return { method: "ewallet", provider: name };
  }
  return { method: "ewallet", provider: name || "Online payment" };
}

function mapRecharge(order: CoinOrderDto, index: number): RechargeRecord {
  const payment = mapPaymentMethod(order.gateway);
  return {
    id: stableOrderId(order.order_no || String(index + 1), index),
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
    image: displayImageUrl(item.image, GIFT_PLACEHOLDER_IMAGE),
  };
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
    return rows.map(mapGift);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/history");
    logApiFallback(
      "[history] GET /api/customer/gifts failed; falling back to mock gift records",
      error,
    );
    return structuredClone(mockGiftRecords).map((item) => ({
      ...item,
      image: displayImageUrl(item.image, GIFT_PLACEHOLDER_IMAGE),
    }));
  }
}

async function loadRechargeRecords(): Promise<RechargeRecord[]> {
  try {
    const payload = await apiGet<CoinOrdersResponse>(
      "/api/customer/coin-orders",
      "required",
    );
    return (payload.orders ?? [])
      .filter((order) => order.status === "paid")
      .map(mapRecharge);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/history");
    logApiFallback(
      "[history] GET /api/customer/coin-orders failed; falling back to mock recharge records",
      error,
    );
    return structuredClone(mockRechargeRecords);
  }
}

export async function loadHistory(): Promise<HistoryData> {
  const [gifts, recharges] = await Promise.all([
    loadGiftRecords(),
    loadRechargeRecords(),
  ]);
  return { gifts, recharges };
}
