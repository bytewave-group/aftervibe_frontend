import "server-only";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import {
  DEV_MOCK_COOKIE,
  devMockFlag,
  isDevMockEnabled,
  isDevMockToken,
} from "@/lib/mock/devMode";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

export { DEV_MOCK_COOKIE, isDevMockEnabled };

/**
 * Dev-only mock fallback for read (GET) loaders.
 *
 * - On only when NODE_ENV is "development" and NEXT_PUBLIC_DEV_MOCK_FALLBACK
 *   is not "0" / "false" / "off" (on by default in dev). Production never mocks.
 * - Mocks on network errors, timeouts and 5xx, and (per call) on empty lists.
 *   Never on 401 (callers redirect to login first) or other 4xx.
 * - Mutations (send gift, recharge, spin, redeem, check-in, comments, auth)
 *   never use this; they always hit the real backend.
 * - "Force" mode (dev only): `?mock=force` sets the av_dev_mock cookie (see
 *   src/proxy.ts) or NEXT_PUBLIC_DEV_MOCK_FALLBACK=force; every GET then acts
 *   as if the backend were down. `?mock=off` clears it.
 * - A dev mock login (src/lib/auth/dev-mock-session.ts) stores a fake
 *   "dev-mock." token; it is never sent to the backend: reads use mock data,
 *   mutations fail with DEV_MOCK_ACTION_MESSAGE (see src/lib/api/server.ts).
 * - Each use is logged with console.warn and recorded for <DevMockBadge />.
 */

/** True when the current request carries a dev mock login token. */
export async function isDevMockSession(): Promise<boolean> {
  if (!isDevMockEnabled()) {
    return false;
  }
  try {
    return isDevMockToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  } catch {
    return false;
  }
}

export async function isDevMockForced(): Promise<boolean> {
  if (!isDevMockEnabled()) {
    return false;
  }
  if (devMockFlag() === "force") {
    return true;
  }
  try {
    return (await cookies()).get(DEV_MOCK_COOKIE)?.value === "force";
  } catch {
    return false;
  }
}

function statusOf(error: unknown): number | null {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

/** Network failure / timeout (no HTTP status), 408, or 5xx. */
export function isMockableError(error: unknown): boolean {
  const status = statusOf(error);
  return status === null || status === 408 || status >= 500;
}

function describe(error: unknown): string {
  const status = statusOf(error);
  if (status !== null) {
    return `HTTP ${status}`;
  }
  if (error instanceof Error) {
    return error.name === "Error" ? error.message : `${error.name}: ${error.message}`;
  }
  return "request failed";
}

/** Sources that used mock data in the current server render (request-scoped). */
const usedSources = cache((): Set<string> => new Set());

export async function getDevMockSources(): Promise<string[]> {
  if (!isDevMockEnabled()) {
    return [];
  }
  const sources = [...usedSources()].sort();
  return (await isDevMockSession()) ? ["login", ...sources] : sources;
}

function takeMock<T>(source: string, reason: string, mock: () => T): T {
  usedSources().add(source);
  console.warn(`[dev-mock] ${source}: showing MOCK data (${reason})`);
  return mock();
}

/**
 * For a loader's catch block, after any 401 redirect. In dev, a network/5xx
 * failure returns `mock()`; anything else (and always in production) returns
 * `fallback()`, which may also throw to surface the real error.
 */
export function devMockOnError<T>(
  source: string,
  error: unknown,
  mock: () => T,
  fallback: () => T,
): T {
  unstable_rethrow(error);
  if (isDevMockEnabled() && isMockableError(error)) {
    return takeMock(source, describe(error), mock);
  }
  return fallback();
}

/** In dev, swaps an empty real result for `mock()`; otherwise returns `value`. */
export function devMockIfEmpty<T>(
  source: string,
  value: T,
  isEmpty: boolean,
  mock: () => T,
): T {
  if (isEmpty && isDevMockEnabled()) {
    return takeMock(source, "empty response", mock);
  }
  return value;
}
