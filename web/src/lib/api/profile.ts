import { apiGet, ApiError } from "@/lib/api/server";
import { avatarUrl } from "@/lib/api/images";
import type { CustomerPayload, MeResponse } from "@/lib/api/types";
import { redirectToLogin } from "@/lib/auth/unauthorized";
import { profileData, type ProfileData } from "@/lib/mock/profile";
import { devMockOnError } from "@/lib/mock/devFallback";

export function mapCustomerToProfile(customer: CustomerPayload): ProfileData {
  return {
    id: customer.member_code || String(customer.id),
    username: customer.username,
    name: customer.name,
    phone: customer.phone ?? "",
    memberCode: customer.member_code,
    foodcourtCustomerId: customer.foodcourt_customer_uuid,
    avatar: avatarUrl(customer.profile_image),
    balance: Number(customer.available_balance ?? customer.balance) || 0,
    rewardPoints: Number(customer.reward_points) || 0,
    membership: customer.membership,
  };
}

export async function loadProfile(): Promise<ProfileData> {
  try {
    const payload = await apiGet<MeResponse>("/api/customer/me", "required");
    if (!payload?.customer) {
      throw new ApiError("Missing customer payload.", 500, payload);
    }
    if (process.env.NODE_ENV !== "production") {
      console.info("[profile] loaded GET /api/customer/me", {
        id: payload.customer.id,
        username: payload.customer.username,
        profile_image: payload.customer.profile_image,
      });
    }
    return mapCustomerToProfile(payload.customer);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("/?tab=me");
    }
    return devMockOnError("profile", error, () => structuredClone(profileData), () => {
      throw error;
    });
  }
}
