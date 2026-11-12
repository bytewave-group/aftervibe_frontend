"use server";

import { apiPost, ApiError } from "@/lib/api/server";
import type { LoginResponse, LogoutResponse, RegisterResponse } from "@/lib/api/types";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/cookies";
import { isMockableAuthFailure, startDevMockSession } from "@/lib/auth/dev-mock-session";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { isDevMockForced, isDevMockSession } from "@/lib/mock/devFallback";
import { DEV_MOCK_LOGIN_COOKIE } from "@/lib/mock/devMode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type LoginState = {
  error: string;
} | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  // Dev only: the "Dev: mock login" button, or forced mock mode (?mock=force).
  if (formData.get("intent") === "dev-mock" || (await isDevMockForced())) {
    if (!(await startDevMockSession("dev login"))) {
      return { error: "generic" };
    }
    redirect(redirectTo);
  }

  if (!phone || !password) {
    return { error: "missing" };
  }

  let mockLogin = false;
  try {
    const payload = await apiPost<LoginResponse>(
      "/api/customer/login",
      { phone, password },
      "none",
    );

    if (!payload?.token || typeof payload.token !== "string") {
      return { error: "generic" };
    }

    const store = await cookies();
    store.set(AUTH_COOKIE_NAME, payload.token, authCookieOptions);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { error: "credentials" };
      }
      if (error.status === 403) {
        return { error: "inactive" };
      }
    }
    // Dev only: backend down / 5xx -> sign in as the mock customer. Wrong password etc. still show.
    if (isMockableAuthFailure(error)) {
      mockLogin = await startDevMockSession("login backend unavailable");
    }
    if (!mockLogin) {
      return { error: error instanceof ApiError ? "generic" : "network" };
    }
  }

  redirect(redirectTo);
}


export type RegisterState = {
  error: string;
} | null;

function registerErrorFromMessage(message: string): string {
  const value = message.toLowerCase();
  if (value.includes("verification code") || value.includes("otp")) {
    return "otp";
  }
  if (value.includes("phone") && value.includes("taken")) {
    return "phone_taken";
  }
  if (value.includes("username") && value.includes("taken")) {
    return "username_taken";
  }
  return "generic";
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();
  const redirectTo = safeRedirectPath(formData.get("redirect"));

  if (!username || !password || !passwordConfirmation || !phone || !otp) {
    return { error: "missing" };
  }
  if (await isDevMockForced()) {
    if (!(await startDevMockSession("dev register"))) {
      return { error: "generic" };
    }
    redirect(redirectTo);
  }
  if (password.length < 6) {
    return { error: "short_password" };
  }
  if (password !== passwordConfirmation) {
    return { error: "mismatch" };
  }

  try {
    const payload = await apiPost<RegisterResponse>(
      "/api/customer/register",
      {
        phone,
        username,
        name: username,
        password,
        password_confirmation: passwordConfirmation,
        otp,
      },
      "none",
    );

    if (!payload?.token || typeof payload.token !== "string") {
      return { error: "generic" };
    }

    const store = await cookies();
    store.set(AUTH_COOKIE_NAME, payload.token, authCookieOptions);
  } catch (error) {
    // Dev only: backend down / 5xx -> sign in as the mock customer; validation errors still show.
    const mocked = isMockableAuthFailure(error) && (await startDevMockSession("register backend unavailable"));
    if (!mocked) {
      if (error instanceof ApiError) {
        return { error: registerErrorFromMessage(error.message) };
      }
      return { error: "network" };
    }
  }

  redirect(redirectTo);
}

export async function logoutAction(): Promise<void> {
  // A dev mock login has no backend session to revoke.
  if (!(await isDevMockSession())) {
    try {
      await apiPost<LogoutResponse>("/api/customer/logout", {}, "optional");
    } catch (error) {
      // Still clear the local session if the backend rejected a stale token.
      if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
        console.error("Customer logout failed", error);
      }
    }
  }

  const store = await cookies();
  store.delete({ name: AUTH_COOKIE_NAME, path: "/" });
  store.delete({ name: DEV_MOCK_LOGIN_COOKIE, path: "/" });
  redirect("/");
}
