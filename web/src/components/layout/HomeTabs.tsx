"use client";

import { useHomeTab } from "@/components/layout/HomeTabProvider";
import { useLayoutEffect, useState, type ReactNode } from "react";

export function HomeTabs({
  home,
  profile,
}: {
  home: ReactNode;
  profile: ReactNode;
}) {
  const { tab } = useHomeTab();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div className="home-tab-stage">
      <div
        className={`home-tab-panel ${ready ? "is-ready" : ""} ${
          tab === "home" ? "translate-x-0" : "-translate-x-full"
        }`}
        inert={tab !== "home" ? true : undefined}
        aria-hidden={tab !== "home"}
      >
        {home}
      </div>
      <div
        className={`home-tab-panel ${ready ? "is-ready" : ""} ${
          tab === "me" ? "translate-x-0" : "translate-x-full"
        }`}
        inert={tab !== "me" ? true : undefined}
        aria-hidden={tab !== "me"}
      >
        {profile}
      </div>
    </div>
  );
}
