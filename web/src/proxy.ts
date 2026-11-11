import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { isPublicPath, loginUrl } from "@/lib/auth/redirect";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
