"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __avBooted?: boolean;
  }
}

/** Tells BootWatchdog the app started; removes its reload screen if it already showed. */
export function BootMarker() {
  useEffect(() => {
    window.__avBooted = true;
    document.getElementById("av-boot-fallback")?.remove();
  }, []);
  return null;
}
