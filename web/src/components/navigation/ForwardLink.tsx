"use client";

import { useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { NAV_FORWARD } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  href: ComponentProps<typeof Link>["href"];
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function ForwardLink({ href, className, children, "aria-label": ariaLabel }: Props) {
  const { setNavDirection } = useNavDirection();
  const hrefString = typeof href === "string" ? href : href.pathname ? String(href.pathname) : "/";
  const trigger = useNavTrigger(hrefString, NAV_FORWARD, true);
  usePrefetch(hrefString, true);

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      aria-label={ariaLabel}
      onClick={(event) => {
        setNavDirection(NAV_FORWARD);
        trigger.onClick(event);
      }}
      onPointerDown={trigger.onPointerDown}
    >
      {children}
    </Link>
  );
}
