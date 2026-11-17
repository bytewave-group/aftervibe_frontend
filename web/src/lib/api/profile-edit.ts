import { apiFetch, apiPost, ApiError } from "@/lib/api/browser";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import type { ProfileUpdateResponse } from "@/lib/api/types";
import { loadMe } from "@/lib/api/me-cache";
import { mapCustomerToProfile } from "@/lib/api/profile";
import { profileData, type ProfileData } from "@/lib/mock/profile";
import { devMockOnError } from "@/lib/mock/devFallback";

export interface ProfileEditInput {
  username: string;
  name: string;
  avatar?: string;
  avatarFile?: File | null;
}

export async function loadProfileForEdit(): Promise<ProfileData> {
  try {
    const customer = await loadMe();
    if (!customer) {
      throw new ApiError("Missing customer payload.", 401);
    }
    return mapCustomerToProfile(customer);
  } catch (error) {
    redirectIfUnauthorized(error, "/profile/edit");
    logApiFallback("[profile-edit] GET /api/customer/me failed", error);
    // Production surfaces the real error rather than letting someone edit a blank profile.
    return devMockOnError("profile", error, () => structuredClone(profileData), () => {
      throw error;
    });
  }
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

    void loadMe(true);
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
