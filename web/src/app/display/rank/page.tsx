import { RankOverlayClient } from "@/components/display/RankOverlayClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AfterVibe Rank",
};

/**
 * Big-screen rank overlay rendered offscreen by Electron (apps/customer/electron/resolume/overlay.js) and
 * published to Resolume over Syphon. Data comes from window.electronAPI; `?mock=1` previews sample rows.
 */
export default function DisplayRankPage() {
  return <RankOverlayClient />;
}
