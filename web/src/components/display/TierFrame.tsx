"use client";

/* eslint-disable @next/next/no-img-element */
import { tierTheme } from "@/components/profile/tier";
import { useLoopAnimation } from "@/components/profile/useLoopAnimation";
import { parseTier } from "@/lib/tier";
import { useRef } from "react";

const SPIN: Keyframe[] = [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }];

/**
 * Big-screen tier frame drawn over a round avatar (parent must be `position: relative` and the
 * avatar's size). Same look as the web TierAvatar: ring in the tier colour, glow, the tier icon as an
 * emblem at the bottom; middle-and-up tiers rotate when `animate` (respects reduced motion).
 * Lengths are CSS lengths so the rank board can scale them with its font size.
 */
export function TierFrame({
  value,
  ringWidth,
  outset,
  emblemSize,
  animate = false,
  glowScale = 1,
}: {
  /** Raw `membership_tier` from the API (parsed defensively). */
  value: unknown;
  ringWidth: string;
  outset: string;
  emblemSize: string;
  animate?: boolean;
  glowScale?: number;
}) {
  const tier = parseTier(value);
  const theme = tier ? tierTheme(tier) : null;
  const ringRef = useRef<HTMLSpanElement>(null);
  useLoopAnimation(ringRef, SPIN, 6000, Boolean(theme?.animated && animate));
  if (!tier || !theme) return null;

  const width = `calc(${ringWidth} * ${(1 + theme.rank * 0.6).toFixed(2)})`;
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${width}), #000 calc(100% - ${width} + 0.5px))`;
  const glow = theme.glow.replace(/(\d+)px/, (_, px: string) => `${Math.round(Number(px) * glowScale)}px`);

  return (
    <>
      <span
        aria-hidden="true"
        data-tier-level={tier.level}
        style={{
          position: "absolute",
          inset: `calc(-1 * ${outset})`,
          borderRadius: "50%",
          filter: glow,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <span
          ref={ringRef}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: theme.ring,
            WebkitMask: mask,
            mask,
          }}
        />
      </span>
      {tier.iconUrl ? (
        <img
          src={tier.iconUrl}
          alt={tier.name}
          style={{
            position: "absolute",
            left: "50%",
            bottom: `calc(-0.38 * ${emblemSize} - ${outset})`,
            width: emblemSize,
            height: emblemSize,
            transform: "translateX(-50%)",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.7))",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      ) : null}
    </>
  );
}

/** Tier colour for accents (gift-card initials), or null. */
export function tierAccent(value: unknown): string | null {
  const tier = parseTier(value);
  return tier ? tierTheme(tier).diamondTint : null;
}
