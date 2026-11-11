/**
 * Static stand-in for the rewards mall.
 *
 * Maps to:
 *   GET  /api/customer/rewards                      — list packages
 *   POST /api/customer/rewards/{id}/redeem          — redeem with points
 *   GET  /api/customer/reward-redemptions           — owned rewards
 *   POST /api/customer/reward-redemptions/{id}/use  — mark a reward used
 *   GET  /api/customer/me                           — reward_points
 */

export type MallPackageType = "free_drink" | "free_food" | "discount" | "voucher";

export interface MallPackage {
  id: number;
  name: string;
  nameKey?: "beer" | "cocktail" | "snack" | "discount" | "voucher" | "bottle";
  type: MallPackageType;
  pointsRequired: number;
  stock: number | null;
  image: string;
  descriptionKey?: "beer" | "cocktail" | "snack" | "discount" | "voucher" | "bottle";
  description?: string | null;
}

export interface MallData {
  enabled: boolean;
  points: number;
  packages: MallPackage[];
}

export const mockMallData: MallData = {
  enabled: true,
  points: 120,
  packages: [
    {
      id: 1,
      name: "Free Beer",
      nameKey: "beer",
      type: "free_drink",
      pointsRequired: 40,
      stock: 12,
      image: "/images/icon-beer.png",
      descriptionKey: "beer",
    },
    {
      id: 2,
      name: "Welcome Cocktail",
      nameKey: "cocktail",
      type: "free_drink",
      pointsRequired: 60,
      stock: 8,
      image: "/images/giftbox.png",
      descriptionKey: "cocktail",
    },
    {
      id: 3,
      name: "Bar Snack",
      nameKey: "snack",
      type: "free_food",
      pointsRequired: 30,
      stock: 20,
      image: "/images/checkin-chest.png",
      descriptionKey: "snack",
    },
    {
      id: 4,
      name: "10% Off",
      nameKey: "discount",
      type: "discount",
      pointsRequired: 80,
      stock: null,
      image: "/images/diamond.png",
      descriptionKey: "discount",
    },
    {
      id: 5,
      name: "Entry Voucher",
      nameKey: "voucher",
      type: "voucher",
      pointsRequired: 100,
      stock: 5,
      image: "/images/icon-mall.png",
      descriptionKey: "voucher",
    },
    {
      id: 6,
      name: "House Bottle",
      nameKey: "bottle",
      type: "voucher",
      pointsRequired: 200,
      stock: 2,
      image: "/images/giftbox.png",
      descriptionKey: "bottle",
    },
  ],
};

export interface RedeemResult {
  points: number;
  packageId: number;
}

export function mockRedeemPackage(data: MallData, packageId: number): RedeemResult {
  const pkg = data.packages.find((item) => item.id === packageId);
  if (!pkg) {
    throw new Error("not_found");
  }
  if (data.points < pkg.pointsRequired) {
    throw new Error("not_enough");
  }
  return {
    points: data.points - pkg.pointsRequired,
    packageId,
  };
}
