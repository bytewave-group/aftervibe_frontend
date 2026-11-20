"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { type CustomerTier, tierTheme } from "@/components/profile/tier";
import { useLoopAnimation } from "@/components/profile/useLoopAnimation";
import { useRef, type ReactNode } from "react";

const SPIN: Keyframe[] = [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }];

/** Below this box size the frame is static (no rotation) and slimmer. */
const LARGE = 48;

interface TierAvatarProps {
  avatar: string | null;
  tier: CustomerTier | null;
  /** Layout box (px). The profile avatar is 55; list avatars ~36–40. */
  size?: number;
  /** How far the ring sits outside the box (px). Profile: 2 (59px ring around a 55px box). Lists: 0. */
  ringOutset?: number;
  /** Plain red ring when there is no tier (profile look). Lists keep a bare circle. */
  plainRing?: boolean;
  /** Show the tier icon as an emblem on the ring (when the tier has one). */
  emblem?: boolean;
  objectPosition?: string;
  imageClassName?: string;
  /** Rendered inside the circle when there is no avatar image (e.g. an initial). */
  fallback?: ReactNode;
}

/** Customer avatar whose frame follows the customer's tier colour / ladder position. */
export function TierAvatar({
  avatar,
  tier,
  size = 55,
  ringOutset = 2,
  plainRing = true,
  emblem = true,
  objectPosition,
  imageClassName = "object-cover object-top",
  fallback = null,
}: TierAvatarProps) {
  const theme = tier ? tierTheme(tier) : null;
  const large = size >= LARGE;
  const ringRef = useRef<HTMLDivElement>(null);
  useLoopAnimation(ringRef, SPIN, 6000, Boolean(theme?.animated && large));

  const ring = size + ringOutset * 2;
  const ringWidth = theme ? (large ? theme.ringWidth : Math.max(1.5, theme.ringWidth * 0.75)) : 0;
  const inner = theme
    ? ringOutset > 0
      ? size - 4
      : size - 2 * (ringWidth + 1.5)
    : plainRing
      ? size - 4
      : size;
  const emblemSize = Math.round(ring * 0.42);
  const showEmblem = Boolean(theme && emblem && tier?.iconUrl);
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${ringWidth}px), #000 calc(100% - ${ringWidth}px + 0.5px))`;
  const glow = theme && !large ? theme.glow.replace(/(\d+)px/, (_, px: string) => `${Math.max(2, Math.round(Number(px) / 2))}px`) : theme?.glow;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      data-tier-level={tier ? tier.level : undefined}
    >
      {theme ? (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: ring, height: ring, filter: glow }}
          aria-hidden="true"
        >
          <div
            ref={ringRef}
            className="absolute inset-0 rounded-full"
            style={{ background: theme.ring, WebkitMask: mask, mask }}
          />
        </div>
      ) : plainRing ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/images/avatar-ring.svg"
          alt=""
          width={ring}
          height={ring}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: ring, height: ring }}
        />
      ) : null}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-[#3a3a3a]"
        style={{ width: inner, height: inner }}
      >
        {avatar ? (
          <SafeImage
            src={avatar}
            alt=""
            fill
            sizes={`${Math.ceil(inner)}px`}
            className={imageClassName}
            style={objectPosition ? { objectPosition } : undefined}
          />
        ) : (
          fallback
        )}
      </div>
      {showEmblem && tier?.iconUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={tier.iconUrl}
          alt={tier.name}
          title={tier.name}
          width={emblemSize}
          height={emblemSize}
          className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 object-contain"
          style={{
            width: emblemSize,
            height: emblemSize,
            bottom: -Math.round(emblemSize * 0.38) - ringOutset,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.65))",
          }}
        />
      ) : null}
    </div>
  );
}
