"use server";

import { displayImageUrl } from "@/lib/api/images";
import { apiGet, apiPost, ApiError } from "@/lib/api/server";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import type {
  MeResponse,
  RewardPackageDto,
  RewardRedeemResponse,
  RewardsResponse,
} from "@/lib/api/types";
import {
  mockMallData,
  type MallData,
  type MallPackage,
  type MallPackageType,
  type RedeemResult,
} from "@/lib/mock/mall";
import { revalidatePath } from "next/cache";

export type { MallData, RedeemResult };

const MALL_PLACEHOLDER = "/images/giftbox.png";

const PACKAGE_TYPES: MallPackageType[] = [
  "free_drink",
  "free_food",
  "discount",
  "voucher",
];

function asPackageType(value: string | undefined): MallPackageType {
  return PACKAGE_TYPES.includes(value as MallPackageType)
    ? (value as MallPackageType)
    : "voucher";
}

function mapPackage(pkg: RewardPackageDto): MallPackage {
  const mediaPath = pkg.media?.file_path || pkg.media?.url || null;
  return {
    id: pkg.id,
    name: pkg.name,
    type: asPackageType(pkg.type),
    pointsRequired: Number(pkg.points_required) || 0,
    stock: pkg.stock == null ? null : Number(pkg.stock),
    image: displayImageUrl(mediaPath, MALL_PLACEHOLDER),
    description: pkg.description ?? null,
  };
}

export async function loadMall(): Promise<MallData> {
  try {
    const [rewards, me] = await Promise.all([
      apiGet<RewardsResponse>("/api/customer/rewards", "required"),
      apiGet<MeResponse>("/api/customer/me", "required"),
    ]);
    return {
      enabled: rewards.enabled !== false,
      points: Number(me.customer?.reward_points) || 0,
      packages: (rewards.packages ?? []).map(mapPackage),
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/mall");
    logApiFallback(
      "[mall] GET /api/customer/rewards failed; falling back to mock mall data",
      error,
    );
    return structuredClone(mockMallData);
  }
}

export async function redeemMallPackage(
  _data: MallData,
  packageId: number,
): Promise<RedeemResult> {
  try {
    const payload = await apiPost<RewardRedeemResponse>(
      `/api/customer/rewards/${packageId}/redeem`,
      {},
      "required",
    );
    revalidatePath("/mall");
    revalidatePath("/inventory");
    revalidatePath("/profile");
    return {
      points: Number(payload.reward_points) || 0,
      packageId,
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/mall");
    if (error instanceof ApiError && /insufficient/i.test(error.message)) {
      throw new Error("not_enough");
    }
    throw new Error(
      error instanceof ApiError ? error.message : "Unable to redeem this reward.",
    );
  }
}
