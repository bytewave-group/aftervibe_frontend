"use client";

import { useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { NAV_BACK } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    setNavDirection(NAV_BACK);
    trigger.onClick(event);
  };

  return (
    <Link
      href={href}
      prefetch
      onClick={handleClick}
      onPointerDown={trigger.onPointerDown}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
