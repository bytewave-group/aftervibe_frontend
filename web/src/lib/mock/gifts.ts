/**
 * Fallbacks for the gift-sending flow when a live customer API is unreachable.
 *
 * Real endpoints (use these first):
 *   GET  /api/customer/staff     — active staff a customer can gift
 *   GET  /api/display/gift       — gift catalog (display + interaction)
 *   GET  /api/customer/balance   — { balance, available_balance, reserved_coins }
 *   GET  /api/customer/gifts     — sent-gift history (staff_id / staff_number when present)
 *   POST /api/playlists/start    — queue a gift for a staff member
 *
 * There is no staff-search endpoint (filter client-side by username / name).
 * Confirm threshold comes from GET /api/display/gift (`confirm_threshold`,
 * per-gift `requires_confirmation`); CONFIRM_THRESHOLD is the fallback.
 */

export const GIFT_PLACEHOLDER_IMAGE = "/images/giftbox.png";
export const STAFF_PLACEHOLDER_AVATAR = "/images/avatar-profile.png";

/** Fallback when the catalog response has no confirm_threshold. */
export const CONFIRM_THRESHOLD = 588;

export type GiftStaff = {
  id: number;
  name: string;
  number: string;
  avatar: string;
  position?: { x: number; y: number } | null;
};

export type GiftItem = {
  displayId: number;
  interactionId: number;
  name: string;
  price: number;
  image: string;
  requiresConfirmation: boolean;
};

export type GiftBalance = {
  balance: number;
  available: number;
  reserved: number;
};

export const mockGiftStaff: GiftStaff[] = [
  { id: 1, name: "小美", number: "1001", avatar: "/images/avatar-1.png" },
  { id: 2, name: "小雨", number: "1002", avatar: "/images/avatar-2.png" },
  { id: 3, name: "小玲", number: "1003", avatar: "/images/avatar-3.png" },
  { id: 4, name: "小雅", number: "1004", avatar: "/images/avatar-4.png" },
  { id: 5, name: "小萱", number: "1005", avatar: "/images/avatar-1.png" },
  { id: 6, name: "小悦", number: "1006", avatar: "/images/avatar-2.png" },
  { id: 7, name: "小琪", number: "1007", avatar: "/images/avatar-3.png" },
  { id: 8, name: "小婷", number: "1008", avatar: "/images/avatar-4.png" },
];

export const mockRecentGiftStaff: GiftStaff[] = mockGiftStaff.slice(0, 4);

export const mockGiftItems: GiftItem[] = [
  { displayId: 1, interactionId: 1, name: "火箭发射", price: 588, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: true },
  { displayId: 2, interactionId: 2, name: "冲破云霄", price: 388, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: false },
  { displayId: 3, interactionId: 3, name: "新皇加冕", price: 888, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: true },
  { displayId: 4, interactionId: 4, name: "涅槃重生", price: 1288, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: true },
  { displayId: 5, interactionId: 5, name: "心动信号", price: 99, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: false },
  { displayId: 6, interactionId: 6, name: "玫瑰花束", price: 52, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: false },
  { displayId: 7, interactionId: 7, name: "香槟庆祝", price: 188, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: false },
  { displayId: 8, interactionId: 8, name: "星光点点", price: 10, image: GIFT_PLACEHOLDER_IMAGE, requiresConfirmation: false },
];

export const mockGiftBalance: GiftBalance = {
  balance: 120,
  available: 120,
  reserved: 0,
};
