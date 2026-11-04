import { match } from "path-to-regexp";

export function formatAmount(
  amount,
  fractionDigits = 2,
  useThousandSeparator = true,
  currency = "",
  locale,
  fallback = "",
) {
  const finalLocale = locale || "en-US";

  const parsed = Number(amount);

  if (typeof parsed !== "number" || isNaN(parsed)) {
    return fallback;
  }

  const options = {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: useThousandSeparator,
    ...(currency && {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }),
  };

  return (parseFloat(amount) || 0).toLocaleString(finalLocale, options);
}

const normalizePath = (p = "") => p.replace(/\/+$/, "") || "/";

const isPatternPath = (path) => {
  return path.includes(":") || path.includes("*");
};

/**
 * Compare whether two URL paths match, supporting both exact paths and path-to-regexp patterns.
 *
 * This function supports:
 * - Strict string comparison (no pattern)
 * - Prefix matching when `exact = false`
 * - Pattern matching using `path-to-regexp` (e.g. /user/:id, /files/*)
 *
 * @param {string} currentPath - The current URL path (e.g. window.location.pathname)
 * @param {string} target - The target path or pattern to match against
 * @param {Object} [options]
 * @param {boolean} [options.exact=true] - If true, requires exact match; if false, allows prefix matching or partial pattern match
 *
 * @returns {boolean} Whether the paths match according to the rules above
 *
 * @example
 * isSamePath("/user/123", "/user/:id") // true
 *
 * @example
 * isSamePath("/user/123/profile", "/user/:id", { exact: false }) // true
 *
 * @example
 * isSamePath("/about", "/about", { exact: true }) // true
 *
 * @example
 * isSamePath("/about/team", "/about", { exact: false }) // true
 */
export function isSamePath(currentPath, target, { exact = true } = {}) {
  const a = normalizePath(currentPath);

  const b = normalizePath(target);

  const bIsPattern = isPatternPath(b);

  if (bIsPattern) {
    const matcher = match(b, {
      decode: decodeURIComponent,
      end: exact,
    });

    return matcher(a) !== false;
  }

  if (exact) return a === b;

  return a === b || a.startsWith(b + "/");
}
