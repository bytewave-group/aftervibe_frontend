import { resolveMediaUrl } from "@/lib/api/images";

/**
 * Customer VIP tier as sent by the backend (`membership_tier`, MembershipService::tierPayload) on
 * GET /api/customer/me, home `spenders[]` and event comment authors. Tiers are tenant-configured,
 * so UI keys off `level` of `levels` and the tier colour, never the name.
 */
export interface CustomerTier {
  name: string;
  level: number;
  levels: number;
  color: string | null;
  iconUrl: string | null;
}

interface TierPayload {
  name?: unknown;
  level?: unknown;
  levels?: unknown;
  color?: unknown;
  icon?: { url?: unknown } | null;
}

/** Defensive parse of a `membership_tier` value; null when absent or malformed. */
export function parseTier(value: unknown): CustomerTier | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as TierPayload;
  if (typeof raw.name !== "string" || !raw.name) return null;
  const levels = Math.max(1, Math.trunc(Number(raw.levels) || 1));
  const level = Math.min(levels - 1, Math.max(0, Math.trunc(Number(raw.level) || 0)));
  const icon = raw.icon && typeof raw.icon === "object" ? raw.icon.url : null;
  return {
    name: raw.name,
    level,
    levels,
    color: typeof raw.color === "string" ? raw.color : null,
    iconUrl: resolveMediaUrl(typeof icon === "string" ? icon : null),
  };
}

/** Reads `membership_tier` off any API object that may carry it (not all DTO types declare it yet). */
export function tierOf(source: unknown): CustomerTier | null {
  if (!source || typeof source !== "object") return null;
  return parseTier((source as { membership_tier?: unknown }).membership_tier);
}
