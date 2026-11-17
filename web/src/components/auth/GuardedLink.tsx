"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { isModifiedClick, useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { canonicalPath, inferTransitionTypes } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent, PointerEvent } from "react";

type GuardedLinkProps = ComponentProps<typeof Link> & {
  href: string;
};

/**
 * Link that keeps a confirmed guest on the current page.
 *
 * Status is useAuth's (the same value useRequireAuth reads). The server
 * snapshot is "loading", so hydration never treats the visitor as a guest.
 * - guest: prevent the navigation, open the login modal aimed at href, and
 *   skip the slide. After login, AuthModalProvider goes to that href.
 * - loading: follow the link. The destination's useAuthedPage opens login if
 *   the visitor is actually a guest.
 * - authenticated: follow the link.
 * Modified clicks (new tab) always follow the link.
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
  const { status } = useAuth();
  const { openLogin } = useAuthModal();
  const { setNavDirection } = useNavDirection();
  const direction = inferTransitionTypes(pathname, href)?.[0];
  const trigger = useNavTrigger(href, direction, Boolean(direction));
  usePrefetch(href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (status === "guest" && !isModifiedClick(event)) {
      event.preventDefault();
      openLogin(href);
      return;
    }
    if (direction) setNavDirection(direction);
    trigger.onClick(event);
  };

  return (
    <Link
      href={href}
      prefetch={false}
      className={className ? `anim-press ${className}` : "anim-press"}
      {...props}
      onClick={handleClick}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerDown?.(event);
        if (event.defaultPrevented) return;
        if (status === "guest") return;
        trigger.onPointerDown(event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
