"use client";

import { useEffect } from "react";

/**
 * iOS Safari before 16 ignores `overscroll-behavior`, so with the app pinned in a `fixed inset-0`
 * frame a swipe that doesn't start inside a scroller that can move (top bar, banner when the page is
 * at the top, bottom nav) pans/rubber-bands the whole document instead. Safari then keeps sending the
 * next swipes to the document until a tap resets it, which is why the middle list only scrolled after
 * tapping it (and vice versa).
 *
 * On browsers without `overscroll-behavior` support, cancel a one-finger touchmove unless it starts
 * inside an element that can actually scroll in that direction. The inner scrollers keep native
 * momentum scrolling; the document never moves. Pointer events (banner swipe, edge-back swipe) still
 * fire, and pinch-zoom (two fingers) is left alone.
 */
function scrollableInDirection(target: EventTarget | null, axis: "x" | "y", delta: number): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el instanceof HTMLTextAreaElement) return true;
    const style = window.getComputedStyle(el);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    if (overflow === "auto" || overflow === "scroll") {
      if (axis === "y") {
        const max = el.scrollHeight - el.clientHeight;
        // Finger moving down (delta > 0) scrolls towards the top.
        if (max > 1 && (delta > 0 ? el.scrollTop > 0 : el.scrollTop < max - 1)) return true;
      } else {
        const max = el.scrollWidth - el.clientWidth;
        if (max > 1 && (delta > 0 ? el.scrollLeft > 0 : el.scrollLeft < max - 1)) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

export function IosScrollGuard() {
  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports?.("overscroll-behavior", "none")) return;

    let startX = 0;
    let startY = 0;
    let decided = false;

    const onStart = (event: TouchEvent) => {
      decided = false;
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !event.cancelable) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (decided) return;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      decided = true;
      const axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      if (!scrollableInDirection(event.target, axis, axis === "y" ? dy : dx)) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
    };
  }, []);

  return null;
}
