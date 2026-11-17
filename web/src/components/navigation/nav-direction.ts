export const NAV_FORWARD = "nav-forward";
export const NAV_BACK = "nav-back";

/** `/inventory/` and `/inventory` are the same route. Root stays `/`. */
export function canonicalPath(pathname: string): string {
  if (!pathname) return "/";
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function pathOf(href: string): string {
  try {
    if (/^https?:\/\//i.test(href)) {
      return canonicalPath(new URL(href).pathname || "/");
    }
  } catch {
    /* ignore malformed URLs and fall through */
  }
  const path = href.split("?")[0]?.split("#")[0] ?? "/";
  return canonicalPath(path);
}

export function inferTransitionTypes(
  fromPath: string,
  href: string,
): string[] | undefined {
  const dest = pathOf(href);
  const from = pathOf(fromPath);
  if (dest === from) return undefined;
  if (dest === "/" && from !== "/") return [NAV_BACK];
  if (from !== "/" && (from.startsWith(`${dest}/`) || dest === from.slice(0, from.lastIndexOf("/")))) {
    return [NAV_BACK];
  }
  const fromSegs = from.split("/").filter(Boolean);
  const toSegs = dest.split("/").filter(Boolean);
  if (toSegs.length < fromSegs.length && dest !== from) return [NAV_BACK];
  return [NAV_FORWARD];
}
