"use server";

import { apiFetch, apiGet, apiPost, ApiError } from "@/lib/api/server";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import type { MeResponse, ProfileUpdateResponse } from "@/lib/api/types";
import { mapCustomerToProfile } from "@/lib/api/profile";
import { profileData, type ProfileData } from "@/lib/mock/profile";
import { devMockOnError } from "@/lib/mock/devFallback";
import { revalidatePath } from "next/cache";

export interface ProfileEditInput {
  username: string;
  name: string;
  avatar?: string;
  avatarFile?: File | null;
}

export async function loadProfileForEdit(): Promise<ProfileData> {
  try {
    const payload = await apiGet<MeResponse>("/api/customer/me", "required");
    if (!payload?.customer) {
      throw new ApiError("Missing customer payload.", 500, payload);
    }
    return mapCustomerToProfile(payload.customer);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/edit");
    logApiFallback("[profile-edit] GET /api/customer/me failed", error);
    // Production surfaces the real error rather than letting someone edit a blank profile.
    return devMockOnError("profile", error, () => structuredClone(profileData), () => {
      throw error;
    });
  }
}

function revalidateProfile(): void {
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
}

export async function saveProfile(input: ProfileEditInput): Promise<ProfileData> {
  try {
    const payload = await apiPost<ProfileUpdateResponse>(
      "/api/customer/profile",
      { username: input.username, name: input.name || input.username },
      "required",
    );

    let customer = payload.customer;

    if (input.avatarFile) {
      const formData = new FormData();
      formData.append("profile_image", input.avatarFile);
      const avatarPayload = await apiFetch<ProfileUpdateResponse>(
        "/api/customer/profile/avatar",
        { method: "POST", auth: "required", formData },
      );
      customer = avatarPayload.customer ?? customer;
    }

    revalidateProfile();
    return mapCustomerToProfile(customer);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/edit");
    throw new Error(
      error instanceof ApiError ? error.message : "Unable to update your profile.",
    );
  }
}

export interface ChangePasswordInput {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * POST /api/customer/profile/password
 *   { current_password, password, password_confirmation }
 * CustomerAuthController::updatePassword does not revoke the current token.
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  try {
    await apiPost(
      "/api/customer/profile/password",
      {
        current_password: input.currentPassword,
        password: input.password,
        password_confirmation: input.passwordConfirmation,
      },
      "required",
    );
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/edit");
    throw new Error(
      error instanceof ApiError ? error.message : "Unable to update your password.",
    );
  }
}
