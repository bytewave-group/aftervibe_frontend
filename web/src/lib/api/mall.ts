import { displayImageUrl } from "@/lib/api/images";
import { apiGet, apiPost, ApiError } from "@/lib/api/browser";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { loadMe } from "@/lib/api/me-cache";
import type {
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
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

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
  const mediaPath =
    pkg.image_url || pkg.image_path || pkg.media?.file_path || pkg.media?.url || null;
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
    const [rewards, customer] = await Promise.all([
      apiGet<RewardsResponse>("/api/customer/rewards", "optional"),
      loadMe(),
    ]);
    const data: MallData = {
      enabled: rewards.enabled !== false,
      points: Number(customer?.reward_points) || 0,
      packages: (rewards.packages ?? []).map(mapPackage),
    };
    if (!data.enabled) return data;
    return devMockIfEmpty("mall", data, data.packages.length === 0, () => ({
      ...structuredClone(mockMallData),
      points: data.points,
    }));
  } catch (error) {
    logApiFallback("[mall] GET /api/customer/rewards failed", error);
    return devMockOnError("mall", error, () => structuredClone(mockMallData), () => ({
      enabled: false,
      points: 0,
      packages: [],
    }));
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
