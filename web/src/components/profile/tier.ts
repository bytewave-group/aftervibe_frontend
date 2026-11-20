import type { CustomerPayload } from "@/lib/api/types";
import { type CustomerTier, tierOf } from "@/lib/tier";

export type { CustomerTier };

/** The logged-in customer's tier from GET /api/customer/me (`membership_tier`), or null. */
export function customerTier(customer: CustomerPayload | null | undefined): CustomerTier | null {
  return tierOf(customer);
}

type Rgb = [number, number, number];

/** Used when a tier has no colour: steel → bronze → silver → gold → violet by ladder position. */
const LADDER: Rgb[] = [
  [138, 148, 166],
  [194, 124, 74],
  [201, 209, 220],
  [242, 193, 78],
  [185, 140, 255],
];

function parseHex(value: string | null): Rgb | null {
  if (!value) return null;
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as Rgb;
}

function rgba(c: Rgb, alpha = 1): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

export interface TierTheme {
  /** 0 (lowest tier) … 1 (highest tier). */
  rank: number;
  isTop: boolean;
  /** Animated shine/sweep for the upper half of the ladder. */
  animated: boolean;
  card: string;
  pattern: string;
  diamondTint: string;
  button: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  ring: string;
  ringWidth: number;
  glow: string;
}

export function tierTheme(tier: CustomerTier): TierTheme {
  const rank = tier.levels > 1 ? tier.level / (tier.levels - 1) : 0;
  const base = parseHex(tier.color) ?? LADDER[Math.round(rank * (LADDER.length - 1))];
  const deep = mix(base, BLACK, 0.72);
  const mid = mix(base, BLACK, 0.42);
  const light = mix(base, WHITE, 0.55);
  const isTop = tier.levels > 1 && tier.level === tier.levels - 1;

  return {
    rank,
    isTop,
    animated: tier.levels > 1 && rank >= 0.5,
    card: [
      `radial-gradient(120% 150% at 88% 15%, ${rgba(base, 0.55)} 0%, ${rgba(base, 0)} 58%)`,
      `linear-gradient(118deg, ${rgba(deep)} 0%, ${rgba(mid)} 55%, ${rgba(mix(base, BLACK, 0.18))} 100%)`,
    ].join(", "),
    pattern: `repeating-linear-gradient(135deg, ${rgba(WHITE, 0.035 + rank * 0.035)} 0 2px, transparent 2px 11px)`,
    diamondTint: rgba(base),
    button: rgba(WHITE, 0.16),
    badgeBg: rgba(deep, 0.55),
    badgeBorder: rgba(light, 0.7),
    badgeText: rgba(light),
    ring: `conic-gradient(from 210deg, ${rgba(light)}, ${rgba(base)} 25%, ${rgba(mid)} 50%, ${rgba(base)} 75%, ${rgba(light)})`,
    ringWidth: 2 + Math.round(rank * 2),
    glow: `drop-shadow(0 0 ${3 + Math.round(rank * 6)}px ${rgba(base, 0.55 + rank * 0.35)})`,
  };
}
