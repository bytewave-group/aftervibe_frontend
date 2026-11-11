/**
 * Static stand-in for the customer profile payload.
 *
 * Maps to GET /api/customer/me (`CustomerAuthController::me` → `customerPayload`):
 *   id, phone, username, name, member_code, profile_image, balance,
 *   reward_points, membership, created_at, bar_id
 *
 * Related endpoints (for later wiring, not used on this page yet):
 *   GET  /api/customer/balance            — coin balance summary
 *   POST /api/customer/profile            — update username / name
 *   POST /api/customer/profile/avatar     — upload profile_image
 *   POST /api/customer/logout             — log out
 *   GET  /api/customer/balance/transactions — history
 *
 * `balance` is an integer coin count on the API. The Figma screen shows a
 * two-decimal amount (10.00), so the UI formats with two fraction digits.
 */

export interface ProfileData {
  id: string;
  username: string;
  name: string;
  phone: string;
  memberCode: string | null;
  avatar: string;
  balance: number;
  rewardPoints: number;
  membership: string | null;
  notificationsEnabled: boolean;
  giftConfirmEnabled: boolean;
}

export const profileData: ProfileData = {
  id: "65514151165",
  username: "Kongfuben88",
  name: "Kongfuben88",
  phone: "0123456789",
  memberCode: "65514151165",
  avatar: "/images/avatar-profile.png",
  balance: 10,
  rewardPoints: 0,
  membership: null,
  notificationsEnabled: true,
  giftConfirmEnabled: true,
};

export function formatBalance(balance: number): string {
  return balance.toFixed(2);
}
