export const AUTH_COOKIE_NAME = "av_customer_token";

/** Customer tokens from the backend last 30 days (ApiTokenService::CUSTOMER_TOKEN_LIFETIME_DAYS). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
};
