import { Orbitron } from "next/font/google";
import type { ReactNode } from "react";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-rank-display",
  display: "swap",
});

/**
 * Display overlays (Resolume / Electron) get a self-hosted HUD typeface without wrapping the
 * transparent page in a painted box (`display: contents` keeps .av-display-root as the visual root).
 */
export default function DisplayLayout({ children }: { children: ReactNode }) {
  return <div className={`${orbitron.variable} contents`}>{children}</div>;
}
