import "server-only";

import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/cookies";
import {
  DEV_MOCK_LOGIN_COOKIE,
  DEV_MOCK_TOKEN_PREFIX,
  isDevMockEnabled,
} from "@/lib/mock/devMode";
import { cookies } from "next/headers";

const DEV_MOCK_SESSION_MAX_AGE = 60 * 60 * 12;

/**
 * Dev-only: signs in as the mock customer (src/lib/mock/profile.ts) by storing a
 * fake "dev-mock." token plus a marker cookie. Returns false (and sets nothing)
 * outside development or when the dev mock switch is off.
 */
export async function startDevMockSession(reason: string): Promise<boolean> {
  if (!isDevMockEnabled()) {
    return false;
  }
  const options = { ...authCookieOptions, maxAge: DEV_MOCK_SESSION_MAX_AGE };
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, `${DEV_MOCK_TOKEN_PREFIX}customer`, options);
  store.set(DEV_MOCK_LOGIN_COOKIE, "1", options);
  console.warn(`[dev-mock] login: signed in as the MOCK customer (${reason})`);
  return true;
}

/** Whether a failed login/register call may fall back to the mock customer. */
export function isMockableAuthFailure(error: unknown): boolean {
  if (!isDevMockEnabled()) {
    return false;
  }
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status: unknown }).status)
      : NaN;
  return !Number.isFinite(status) || status === 408 || status >= 500;
}
