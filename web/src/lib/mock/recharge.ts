/**
 * Fallbacks for the recharge page when a live customer API is unreachable.
 *
 * Real endpoints (use these first):
 *   GET  /api/customer/balance        — { balance, available_balance, reserved_coins }
 *   GET  /api/customer/coin-packages  — active packages [{ id, coins, price }]
 *   GET  /api/customer/coin-orders    — { payment_available, orders }
 *   POST /api/customer/coin-orders    — { package_id, return_url } → order.payment_url
 *   GET  /api/customer/coin-orders/{orderNo} — poll payment status + balance
 *
 * Coins are credited only after the gateway marks the order paid. The retired
 * POST /api/customer/balance/topup is gone (410).
 */

export const RECHARGE_CURRENCY = "RM";

export type RechargePackage = {
  id: number;
  coins: number;
  price: number;
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
};

export const mockRechargeData: RechargeData = {
  balance: { balance: 120, available: 120 },
  packages: [
    { id: 1, coins: 100, price: 10 },
    { id: 2, coins: 200, price: 20 },
    { id: 3, coins: 500, price: 50 },
    { id: 4, coins: 1000, price: 100 },
  ],
  paymentAvailable: false,
  currency: RECHARGE_CURRENCY,
};
