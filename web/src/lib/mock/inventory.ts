/**
 * Static stand-in for the customer's item inventory.
 *
 * Maps primarily to GET /api/customer/storage (bottle / item storage:
 * product_name, quantity, remaining_qty, stored_at, last_redeem_at,
 * is_active, is_expired, branch_name). Redeemed mall rewards can also
 * appear here later via GET /api/customer/reward-redemptions.
 */

export type InventoryStatus = "active" | "finished" | "expired";

export interface InventoryItem {
  id: string;
  name?: string;
  nameKey?: "hennessy" | "moet" | "beer" | "voucher" | "snack";
  image: string;
  quantity: number;
  remainingQty: number;
  storedAt: string;
  expiresAt: string | null;
  branchName: string | null;
  status: InventoryStatus;
}

export interface InventoryData {
  enabled: boolean;
  memberCode?: string | null;
  items: InventoryItem[];
}

export const mockInventoryData: InventoryData = {
  enabled: true,
  items: [
    {
      id: "item-1",
      nameKey: "hennessy",
      image: "/images/giftbox.png",
      quantity: 2,
      remainingQty: 1,
      storedAt: "2026-11-01 21:30:00",
      expiresAt: "2027-11-01 00:00:00",
      branchName: "VOXX KL",
      status: "active",
    },
    {
      id: "item-2",
      nameKey: "moet",
      image: "/images/icon-beer.png",
      quantity: 1,
      remainingQty: 1,
      storedAt: "2026-10-18 23:10:00",
      expiresAt: "2027-04-18 00:00:00",
      branchName: "VOXX KL",
      status: "active",
    },
    {
      id: "item-3",
      nameKey: "beer",
      image: "/images/icon-beer.png",
      quantity: 4,
      remainingQty: 4,
      storedAt: "2026-11-08 20:00:00",
      expiresAt: "2026-12-08 00:00:00",
      branchName: null,
      status: "active",
    },
    {
      id: "item-4",
      nameKey: "voucher",
      image: "/images/icon-mall.png",
      quantity: 1,
      remainingQty: 0,
      storedAt: "2026-09-12 19:00:00",
      expiresAt: "2026-10-12 00:00:00",
      branchName: null,
      status: "finished",
    },
    {
      id: "item-5",
      nameKey: "snack",
      image: "/images/checkin-chest.png",
      quantity: 1,
      remainingQty: 0,
      storedAt: "2026-08-02 22:00:00",
      expiresAt: "2026-09-02 00:00:00",
      branchName: "VOXX KL",
      status: "expired",
    },
  ],
};
