"use client";

import type { ReactNode } from "react";

/**
 * Route remount wrapper. Query-param dialogs (?checkin, ?auth, ?rankings)
 * must not replay a route animation; template already remounts on pathname
 * changes. Page-to-page motion is handled by PageTransition.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
