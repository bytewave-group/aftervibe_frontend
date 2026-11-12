import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { isPublicPath, loginUrl } from "@/lib/auth/redirect";
import { DEV_MOCK_COOKIE, isDevMockEnabled } from "@/lib/mock/devMode";
import { type NextRequest, NextResponse } from "next/server";


/** Dev only: `?mock=force` makes every API read fall back to mock data, `?mock=off` clears it. */
function devMockToggle(request: NextRequest): NextResponse | null {
  if (!isDevMockEnabled()) {
    return null;
  }
  const mode = request.nextUrl.searchParams.get("mock");
  if (mode !== "force" && mode !== "off") {
    return null;
  }
  const url = request.nextUrl.clone();
  url.searchParams.delete("mock");
  const response = NextResponse.redirect(url);
  if (mode === "force") {
    response.cookies.set(DEV_MOCK_COOKIE, "force", { path: "/", httpOnly: true, sameSite: "lax" });
  } else {
    response.cookies.delete(DEV_MOCK_COOKIE);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const devMock = devMockToggle(request);
  if (devMock) {
    return devMock;
  }

  if (pathname === "/login") {
    const dest = new URL(
      loginUrl(request.nextUrl.searchParams.get("redirect")),
      request.url,
    );
    const url = request.nextUrl.clone();
    url.pathname = dest.pathname;
    url.search = dest.search;
    return NextResponse.redirect(url);
  }

  // Big-screen display pages (Electron/Resolume overlay) never need a customer session.
  if (pathname === "/display" || pathname.startsWith("/display/")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    return NextResponse.next();
  }

  const target = `${pathname}${request.nextUrl.search}`;
  const dest = new URL(loginUrl(target), request.url);
  const url = request.nextUrl.clone();
  url.pathname = dest.pathname;
  url.search = dest.search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
