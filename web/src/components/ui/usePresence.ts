"use client";

import { useEffect, useState } from "react";

/** Matches `--motion-exit` (240ms) with a little slack so the animation can finish. */
export const PRESENCE_MS = 280;

function reduceMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Keep a component mounted through its close animation.
 * When `open` flips to false, `exiting` is true until `durationMs` elapses.
 */
export function usePresence(open: boolean, durationMs: number = PRESENCE_MS) {
  const [state, setState] = useState<"closed" | "open" | "exiting">(
    open ? "open" : "closed",
  );
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setState("open");
    } else if (state !== "closed") {
      setState("exiting");
    }
  }

  useEffect(() => {
    if (state !== "exiting") {
      return;
    }
    const ms = reduceMotion() ? 0 : durationMs;
    const id = window.setTimeout(() => setState("closed"), ms);
    return () => window.clearTimeout(id);
  }, [state, durationMs]);

  return { mounted: state !== "closed", exiting: state === "exiting" };
}
