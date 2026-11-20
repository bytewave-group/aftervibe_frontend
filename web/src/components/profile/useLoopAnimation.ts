"use client";

import { useEffect, type RefObject } from "react";

/** Infinite WAAPI loop on `ref`, skipped when disabled or when the user prefers reduced motion. */
export function useLoopAnimation(
  ref: RefObject<HTMLElement | null>,
  keyframes: Keyframe[],
  duration: number,
  enabled: boolean,
) {
  const key = JSON.stringify(keyframes);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = el.animate(JSON.parse(key) as Keyframe[], {
      duration,
      iterations: Infinity,
      easing: "linear",
    });
    return () => animation.cancel();
  }, [ref, key, duration, enabled]);
}
