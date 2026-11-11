"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { inferTransitionTypes } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import { loginUrl } from "@/lib/auth/redirect";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent, PointerEvent } from "react";

type GuardedLinkProps = ComponentProps<typeof Link> & {
  href: string;
};

/**
 * Like next/link, but guests are sent to /?auth=login&redirect=<href>.
 * Logged-in users follow href as usual.
 * Same-pathname query changes (login / check-in / rankings) skip a page transition.
 * Prefetch and instant-slide only run when the user is logged in.
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
  const { isAuthed } = useAuth();
  const pathname = usePathname();
  const { setNavDirection } = useNavDirection();
  const dest = isAuthed ? href : loginUrl(href);
  const direction = inferTransitionTypes(pathname, dest)?.[0];
  const trigger = useNavTrigger(dest, direction, Boolean(isAuthed && direction));
  usePrefetch(href, isAuthed);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (direction) setNavDirection(direction);
    trigger.onClick(event);
  };

  return (
    <Link
      href={dest}
      prefetch={isAuthed}
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
