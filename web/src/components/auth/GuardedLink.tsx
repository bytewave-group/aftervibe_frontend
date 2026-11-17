"use client";

import { useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { canonicalPath, inferTransitionTypes } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent, PointerEvent } from "react";

type GuardedLinkProps = ComponentProps<typeof Link> & {
  href: string;
};

/**
 * Like next/link. Guests still go to the real page; that page opens the login
 * modal in place. Auth is not consulted here, so a click during hydration
 * cannot be rewritten to the homepage.
 */
export function GuardedLink({
  href,
  className,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: GuardedLinkProps) {
  const pathname = canonicalPath(usePathname() ?? "/");
  const { setNavDirection } = useNavDirection();
  const direction = inferTransitionTypes(pathname, href)?.[0];
  const trigger = useNavTrigger(href, direction, Boolean(direction));
  usePrefetch(href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (direction) setNavDirection(direction);
    trigger.onClick(event);
  };

  return (
    <Link
      href={href}
      prefetch
      className={className ? `anim-press ${className}` : "anim-press"}
      {...props}
      onClick={handleClick}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerDown?.(event);
        if (event.defaultPrevented) return;
        trigger.onPointerDown(event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
