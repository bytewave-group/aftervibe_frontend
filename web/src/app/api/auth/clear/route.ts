import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { DEV_MOCK_LOGIN_COOKIE } from "@/lib/mock/devMode";
import { NextResponse } from "next/server";

/**
 * Clears the httpOnly auth cookie, then redirects. Used when a server
 * component gets a 401 and cannot mutate cookies during render.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = safeRedirectPath(url.searchParams.get("redirect"), "/?auth=login");
  const response = NextResponse.redirect(new URL(dest, url.origin));
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.delete(DEV_MOCK_LOGIN_COOKIE);
  return response;
}
