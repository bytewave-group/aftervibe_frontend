"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { canonicalPath, pathOf } from "./nav-direction";

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
 * Starts the page-slide and commits the route on pointerdown (same turn,
 * before React can hide the source link). Keyboard uses click.
 */
export function useNavTrigger(
  href: string,
  direction: string | undefined,
  enabled: boolean,
) {
  const { begin } = useInstantNav();
  const router = useRouter();

  const prefetch = useCallback(() => {
    if (!href) return;
    void router.prefetch(href);
  }, [href, router]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || isModifiedClick(event)) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* capture is best-effort */
      }
      prefetch();
      begin(href, direction);
    },
    [begin, direction, enabled, href, prefetch],
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
    prefetch,
    commit: () => begin(href, direction),
  };
}

/** Prefetch one or more routes on mount. */
export function usePrefetch(href: string | string[] | undefined, enabled = true) {
  const router = useRouter();
  const list = Array.isArray(href) ? href : href ? [href] : [];
  const key = list.join("|");

  useEffect(() => {
    if (!enabled || !key) return;
    for (const item of list) {
      if (!item || item.startsWith("#")) continue;
      const path = pathOf(item);
      if (!path) continue;
      void router.prefetch(item);
    }
    // list is represented by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, router]);
}
