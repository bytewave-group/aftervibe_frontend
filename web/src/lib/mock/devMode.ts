/**
 * Dev mock switches shared by server code, the proxy and client components.
 * On only when NODE_ENV is "development" and NEXT_PUBLIC_DEV_MOCK_FALLBACK is
 * not "0" / "false" / "off" / "no". Production never enables any of it.
 */

/** `?mock=force` cookie: every API read falls back to mock data. */
export const DEV_MOCK_COOKIE = "av_dev_mock";
/** Marker cookie set alongside a dev mock login token. */
export const DEV_MOCK_LOGIN_COOKIE = "av_dev_mock_login";
/** Prefix of the fake customer token a dev mock login stores; never sent to the backend. */
export const DEV_MOCK_TOKEN_PREFIX = "dev-mock.";
/** Shown when a mutation is skipped because the session is a dev mock login. */
export const DEV_MOCK_ACTION_MESSAGE = "Mock login: action not sent to backend";

const OFF_VALUES = new Set(["0", "false", "off", "no"]);

export function devMockFlag(): string {
  return (process.env.NEXT_PUBLIC_DEV_MOCK_FALLBACK ?? "").trim().toLowerCase();
}

export function isDevMockEnabled(): boolean {
  return process.env.NODE_ENV === "development" && !OFF_VALUES.has(devMockFlag());
}

export function isDevMockToken(token: string | null | undefined): boolean {
  return isDevMockEnabled() && typeof token === "string" && token.startsWith(DEV_MOCK_TOKEN_PREFIX);
}
