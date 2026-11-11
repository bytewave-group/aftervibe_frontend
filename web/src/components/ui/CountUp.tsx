"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function defaultFormat(n: number): string {
  return String(Math.round(n));
}

/** Animates when `value` changes; first paint shows the current value (no hydration flash). */
export function CountUp({
  value,
  format,
  decimals,
  className,
}: {
  value: number;
  /** Client-only. Server Components must pass `decimals` instead of a function. */
  format?: (n: number) => string;
  decimals?: number;
  className?: string;
}) {
  const formatValue =
    format ??
    (decimals == null ? defaultFormat : (n: number) => n.toFixed(decimals));
  const reduce = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    if (reduce) {
      displayRef.current = value;
      return;
    }
    const from = displayRef.current;
    if (from === value) {
      return;
    }
    const duration = 400;
    let start: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      if (start == null) {
        start = now;
      }
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        displayRef.current = value;
        setDisplay(value);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, reduce]);

  return <span className={className}>{formatValue(reduce ? value : display)}</span>;
}

export function parseBalanceValue(value: string): { amount: number; decimals: number } | null {
  const match = value.trim().match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }
  const raw = match[0].replace(",", ".");
  const amount = Number(raw);
  if (!Number.isFinite(amount)) {
    return null;
  }
  const fraction = raw.split(".")[1];
  return { amount, decimals: fraction ? fraction.length : 0 };
}
