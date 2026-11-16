/**
 * One deployment serves one tenant, same as tobc_website.
 * `NEXT_PUBLIC_*` is inlined by `next build`, so Cloudflare does not need `.env.local`.
 * The unprefixed names remain as a fallback for older local env files.
 * The AfterVibe API reads the tenant from the `X-Tenant-ID` header, not a body field.
 */

export function apiBaseUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "").trim();
  return base.replace(/\/+$/, "");
}

export function apiTenantId(): string {
  return (process.env.NEXT_PUBLIC_API_TENANT_ID || process.env.API_TENANT_ID || "").trim();
}
