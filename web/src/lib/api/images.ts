const PLACEHOLDER_AVATAR = "/images/avatar-profile.png";
const PLACEHOLDER_BANNER = "/images/banner-dj-night.png";

function trimTrailingSlashes(value: string): string {
  let result = value;
  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result;
}

function trimLeadingSlashes(value: string): string {
  let result = value;
  while (result.startsWith("/")) {
    result = result.slice(1);
  }
  return result;
}

function apiOrigin(): string {
  return trimTrailingSlashes((process.env.API_BASE_URL ?? "").trim());
}

function upgradeLocalHttp(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (
      parsed.protocol === "http:" &&
      (host === "aftervibe_backend.test" || host.endsWith(".aftervibe_backend.test"))
    ) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Turn a backend media value into a browser-loadable URL.
 * - absolute http(s) URLs are kept (Herd http is upgraded to https)
 * - `/storage/...` and other non-app relative paths are resolved against API_BASE_URL
 * - `/images/...` and other Next public assets are left as-is
 * - empty/null stays null (do not invent a portrait)
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) {
    return null;
  }

  const value = url.trim();

  if (value.startsWith("//")) {
    return upgradeLocalHttp(`https:${value}`);
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return upgradeLocalHttp(value);
  }

  const origin = apiOrigin();

  if (value.startsWith("/")) {
    const isAppAsset =
      value.startsWith("/images/") ||
      value.startsWith("/_next/") ||
      value === "/favicon.ico";
    if (isAppAsset || !origin) {
      return value;
    }
    return upgradeLocalHttp(`${origin}${value}`);
  }

  if (!origin) {
    return value;
  }

  return upgradeLocalHttp(`${origin}/storage/${trimLeadingSlashes(value)}`);
}

export function displayImageUrl(
  url: string | null | undefined,
  fallback: string,
): string {
  return resolveMediaUrl(url) ?? fallback;
}

export function avatarUrl(url: string | null | undefined): string {
  return resolveMediaUrl(url) ?? "";
}

export function bannerUrl(url: string | null | undefined): string {
  return displayImageUrl(url, PLACEHOLDER_BANNER);
}

export { PLACEHOLDER_AVATAR, PLACEHOLDER_BANNER };

function posAssetOrigin(): string {
  return trimTrailingSlashes((process.env.NEXT_PUBLIC_POS_ASSET_BASE_URL ?? "").trim());
}

/**
 * Resolve a POS media value (typically product_image_url) for the browser.
 * - absolute http(s) URLs pass through
 * - `/uploads/...` and other non-app relative paths use NEXT_PUBLIC_POS_ASSET_BASE_URL
 * - Next public assets such as `/images/...` are left as-is
 */
export function resolvePosAssetUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) {
    return null;
  }

  const value = url.trim();

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const isAppAsset =
    value.startsWith("/images/") ||
    value.startsWith("/_next/") ||
    value === "/favicon.ico";
  if (isAppAsset) {
    return value;
  }

  const origin = posAssetOrigin();
  if (!origin) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  return `${origin}/${trimLeadingSlashes(value)}`;
}

export function displayPosAssetUrl(
  url: string | null | undefined,
  fallback: string,
): string {
  return resolvePosAssetUrl(url) ?? fallback;
}
