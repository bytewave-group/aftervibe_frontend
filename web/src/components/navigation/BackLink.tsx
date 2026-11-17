"use client";

import { BACK_HIT_LINK_STYLE } from "@/components/navigation/back-hit";
import { useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { NAV_BACK } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import Link from "next/link";
import type { ComponentProps, MouseEvent, PointerEvent, ReactNode } from "react";

type Props = {
  href: ComponentProps<typeof Link>["href"];
  className?: string;
  ariaLabel: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function BackLink({ href, className, ariaLabel, children, onClick }: Props) {
  const { setNavDirection } = useNavDirection();
  const hrefString = typeof href === "string" ? href : href.pathname ? String(href.pathname) : "/";
  const trigger = useNavTrigger(hrefString, NAV_BACK, true);
  usePrefetch(hrefString, true);

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    // Keep the left-edge swipe-back zone from capturing this press.
    event.stopPropagation();
    trigger.onPointerDown(event);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    setNavDirection(NAV_BACK);
    trigger.onClick(event);
  };

  return (
    <Link
      href={href}
      prefetch={false}
      data-nav-back="1"
      data-nav-no-swipe=""
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      className={["anim-press", "back-hit", className].filter(Boolean).join(" ")}
      style={BACK_HIT_LINK_STYLE}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
