/**
 * Static stand-in for the profile history page (gift records + recharge records).
 *
 * Gift records — no customer "gifts I sent" list endpoint exists yet.
 *   Gifts are queued with POST /api/playlists/start (PlaylistAPIController::store:
 *   sender, target staff/customer, interaction). When a list API is added
 *   (e.g. GET /api/customer/gifts), map recipient, gift name, quantity, image
 *   and sent_at here. Do not use GET /api/customer/balance/transactions for
 *   this UI; that is the coin ledger, not gift/recharge records.
 *
 * Recharge records:
 *   GET /api/customer/coin-orders  — CoinOrderApiController::index
 *   → orders[{ id, order_no, coins, amount, currency, status, paid_at, created_at, payment_method }]
 *   GET /api/customer/coin-orders/{id|orderNo} — show, same order payload.
 *   payment_method is { category: bank|ewallet|card, provider } when the gateway
 *   payload stores it; otherwise null (the `gateway` column is only the driver).
 */

export type HistoryTab = "gift" | "recharge";
export type RechargeMethod = "bank" | "ewallet";
export type RechargeCategory = "bank" | "ewallet" | "card";

export interface GiftRecord {
  id: number;
  sentAt: string;
  recipientName: string;
  giftName: string;
  quantity: number;
  /** Coins for the whole entry (unit price × quantity); null when the API doesn't send it. */
  totalAmount?: number | null;
  image: string;
}

export interface RechargeRecord {
  id: string;
  orderNo: string;
  category: RechargeCategory | null;
  method: RechargeMethod | null;
  provider: string | null;
  amount: number;
  currency: string;
  createdAt: string;
}

export const GIFT_PLACEHOLDER_IMAGE = "/images/history-gift.png";

export const mockGiftRecords: GiftRecord[] = [
  {
    id: 1,
    sentAt: "2026-10-24 21:18:00",
    recipientName: "柳如烟",
    giftName: "黄金轿车",
    quantity: 1,
    image: GIFT_PLACEHOLDER_IMAGE,
  },
  {
    id: 2,
    sentAt: "2026-10-18 23:05:00",
    recipientName: "夜未央",
    giftName: "玫瑰花束",
    quantity: 3,
    image: GIFT_PLACEHOLDER_IMAGE,
  },
  {
    id: 3,
    sentAt: "2026-09-30 20:42:00",
    recipientName: "苏晴",
    giftName: "香槟塔",
    quantity: 1,
    image: GIFT_PLACEHOLDER_IMAGE,
  },
];

export const mockRechargeRecords: RechargeRecord[] = [
  {
    id: "CO-MOCK-1",
    orderNo: "CO-MOCK-1",
    category: "bank",
    method: "bank",
    provider: "Maybank",
    amount: 10,
    currency: "RM",
    createdAt: "2026-09-20 14:00:00",
  },
  {
    id: "CO-MOCK-2",
    orderNo: "CO-MOCK-2",
    category: "ewallet",
    method: "ewallet",
    provider: "Touch'n Go",
    amount: 50,
    currency: "RM",
    createdAt: "2026-08-12 18:30:00",
  },
  {
    id: "CO-MOCK-3",
    orderNo: "CO-MOCK-3",
    category: "bank",
    method: "bank",
    provider: "CIMB",
    amount: 20,
    currency: "RM",
    createdAt: "2026-07-03 11:15:00",
  },
];

export interface HistoryData {
  gifts: GiftRecord[];
  recharges: RechargeRecord[];
}

export const mockHistoryData: HistoryData = {
  gifts: mockGiftRecords,
  recharges: mockRechargeRecords,
};
