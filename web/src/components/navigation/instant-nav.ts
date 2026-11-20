"use client";

import {
  createContext,
  useCallback,
  useContext,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { canonicalPath } from "./nav-direction";

export type InstantNavValue = {
  /** Start the slide and always commit the route with router.push. */
  begin: (href: string, direction?: string) => void;
  /** Drop the visual overlay without navigating. */
  cancel: () => void;
  /** Mid-transition back: tear down the overlay and return to the origin. */
  goBack: () => void;
};

export const InstantNavContext = createContext<InstantNavValue | null>(null);

export function useInstantNav(): InstantNavValue {
  return (
    useContext(InstantNavContext) ?? {
      begin: () => undefined,
      cancel: () => undefined,
      goBack: () => undefined,
    }
  );
}

export function isModifiedClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

/** Path + search, used to detect when a navigation actually committed. */
export function hrefKey(href: string): string {
  try {
    const url = /^https?:\/\//i.test(href)
      ? new URL(href)
      : new URL(href, "http://local.invalid");
    return `${canonicalPath(url.pathname)}${url.search}`;
  } catch {
    const withoutHash = href.split("#")[0] ?? href;
    const q = withoutHash.indexOf("?");
    if (q === -1) return withoutHash || "/";
    return withoutHash;
  }
}

export function currentLocationKey(): string {
  return `${canonicalPath(window.location.pathname)}${window.location.search}`;
}

/**
 * Mouse: starts the page-slide and commits the route on pointerdown (same turn,
 * before React can hide the source link). Touch/pen: only on click, which the
 * browser fires for a real tap but not when the finger drags to scroll, so a
 * list (e.g. 活动 cards) can be scrolled without opening the item under the
 * finger. Keyboard uses click.
 */
export function useNavTrigger(
  href: string,
  direction: string | undefined,
  enabled: boolean,
) {
  const { begin } = useInstantNav();

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || isModifiedClick(event)) return;
      // Touch/pen: wait for click (a tap), never navigate on touch-down — that fired while scrolling.
      if (event.pointerType !== "mouse") return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* capture is best-effort */
      }
      begin(href, direction);
    },
    [begin, direction, enabled, href],
  );

  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!enabled) return;
      if (isModifiedClick(event)) return;
      begin(href, direction);
      // begin() already called router.push; don't let the Link fire again
      // and don't depend on this click surviving a re-render.
      event.preventDefault();
    },
    [begin, direction, enabled, href],
  );

  return {
    onPointerDown,
    onClick,
    commit: () => begin(href, direction),
  };
}

/**
 * Prefetch is disabled. Next's full prefetch requests `/path/?_rsc=` without a
 * `.txt` suffix; Cloudflare Pages answers with HTML and poisons the route cache.
 * The export stays so existing call sites do not need to change.
 */
export function usePrefetch(_href?: string | string[], _enabled = true): void {
  void _href;
  void _enabled;
}
