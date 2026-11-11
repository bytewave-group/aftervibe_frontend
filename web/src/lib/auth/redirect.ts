/**
 * Accept only same-origin relative paths to avoid open redirects.
 * Allows "/profile" and "/gifts?x=1#y"; rejects "//evil", protocol-relative
 * and backslash tricks, and absolute URLs such as "https://example.com".
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const path = value.trim();
  if (!path.startsWith("/")) {
    return fallback;
  }
  if (path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  if (path.includes("\\") || path.includes("://")) {
    return fallback;
  }

  return path;
}

function authUrl(mode: "login" | "register", target?: unknown): string {
  const redirect = safeRedirectPath(target, "/");
  if (redirect === "/") {
    return `/?auth=${mode}`;
  }
  return `/?auth=${mode}&redirect=${encodeURIComponent(redirect)}`;
}

/** Home-page login popup, e.g. /?auth=login&redirect=/profile */
export function loginUrl(target?: unknown): string {
  return authUrl("login", target);
}

/** Home-page register popup, e.g. /?auth=register&redirect=/profile */
export function registerUrl(target?: unknown): string {
  return authUrl("register", target);
}

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login") {
    return true;
  }
  // Placeholder target for the "forgot username/password" link; no page yet.
  if (pathname === "/forgot-password") {
    return true;
  }
  if (pathname.startsWith("/api/auth/clear")) {
    return true;
  }
  return false;
}
