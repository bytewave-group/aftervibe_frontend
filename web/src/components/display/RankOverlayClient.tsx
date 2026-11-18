"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { RankBoard } from "./RankBoard";
import { VisualEffect } from "./VisualEffect";
import {
  electronDisplayApi,
  type RankBoardSettings,
  type RankBoardUpdate,
  type RankEntry,
} from "./electron-bridge";
import "./display.css";

type Period = "daily" | "weekly" | "monthly";

const TITLES: Record<Period, string> = {
  daily: "TOP DAILY",
  weekly: "TOP WEEKLY",
  monthly: "TOP MONTHLY",
};

// DEV ONLY: `?mock=1` fills the boards with sample rows when no Electron bridge is present (browser preview).
const MOCK_RANKING: RankEntry[] = [
  { rank: 1, name: "customer1", amount: 1500 },
  { rank: 2, name: "customer2", amount: 980 },
  { rank: 3, name: "customer3", amount: 520 },
];
const MOCK_SETTINGS: RankBoardSettings = {
  rank_enabled: true,
  display: { id: 1, name: "mock", width: 1920, height: 1080 },
  rankings: {
    daily: { enabled: true, position: "right", x: null, y: null },
    weekly: { enabled: true, position: "left", x: null, y: null },
    monthly: { enabled: false, position: "none", x: null, y: null },
  },
  rank_size: { width: 240, height: 300, font_size: 16 },
  gift_card: { enabled: true, x: null, y: null, width: null },
};

/**
 * Port of the Electron overlay (apps/customer OverlayScreen → RankPage + VisualEffect) for the Resolume
 * "AfterVibe Rank N" window. Data only arrives through window.electronAPI (preload-main.js).
 */
export function RankOverlayClient() {
  const [boards, setBoards] = useState<Record<Period, RankEntry[]>>({ daily: [], weekly: [], monthly: [] });
  const [rankSettings, setRankSettings] = useState<RankBoardSettings | null>(null);

  useEffect(() => {
    const api = electronDisplayApi();

    if (!api?.onRankBoard) {
      if (new URLSearchParams(window.location.search).get("mock") === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only mock fill
        setBoards({ daily: MOCK_RANKING, weekly: MOCK_RANKING, monthly: MOCK_RANKING });
        setRankSettings(MOCK_SETTINGS);
      }
      return;
    }

    const offRank = api.onRankBoard((data: RankBoardUpdate) => {
      if (data?.period === "daily" || data?.period === "weekly" || data?.period === "monthly") {
        setBoards((prev) => ({ ...prev, [data.period]: data.ranking ?? [] }));
      }
    });
    const offSettings = api.onRankBoardSettings?.((data) => setRankSettings(data));

    return () => {
      if (typeof offRank === "function") offRank();
      if (typeof offSettings === "function") offSettings();
    };
  }, []);

  return (
    <div
      className="av-display-root"
      style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "transparent" }}
    >
      <RankLayer boards={boards} rankSettings={rankSettings} />
      <VisualEffect
        layout={rankSettings?.gift_card}
        screenWidth={Number(rankSettings?.display?.width ?? 0)}
        screenHeight={Number(rankSettings?.display?.height ?? 0)}
      />
    </div>
  );
}

function RankLayer({
  boards,
  rankSettings,
}: {
  boards: Record<Period, RankEntry[]>;
  rankSettings: RankBoardSettings | null;
}) {
  if (rankSettings && Number(rankSettings.rank_enabled) === 0) {
    return null;
  }

  if (!rankSettings) {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            right: "4%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 240,
            height: 300,
          }}
        >
          <RankBoard ranking={boards.daily} title={TITLES.daily} />
        </div>
      </div>
    );
  }

  const screenWidth = Number(rankSettings.display?.width ?? 0);
  const screenHeight = Number(rankSettings.display?.height ?? 0);
  const rankWidth = Number(rankSettings.rank_size?.width) || 240;
  const rankHeight = Number(rankSettings.rank_size?.height) || 300;
  const rankFontSize = Number(rankSettings.rank_size?.font_size) || 16;

  const styleFor = (period: Period): CSSProperties | null => {
    const settings = rankSettings.rankings?.[period];
    if (!settings || !settings.enabled || settings.position === "none") return null;

    const style: CSSProperties = {
      position: "absolute",
      zIndex: 1000,
      opacity: 1,
      pointerEvents: "none",
      width: `${(rankWidth / screenWidth) * 100}%`,
      height: `${(rankHeight / screenHeight) * 100}%`,
    };

    if (settings.x != null && settings.y != null) {
      style.left = `${(Number(settings.x) / screenWidth) * 100}%`;
      style.top = `${(Number(settings.y) / screenHeight) * 100}%`;
      return style;
    }

    style.top = "50%";
    style.transform = "translateY(-50%)";
    if (settings.position === "left") style.left = "4%";
    if (settings.position === "right") style.right = "4%";
    return style;
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1000 }}>
      {(["daily", "weekly", "monthly"] as const).map((period) => {
        const style = styleFor(period);
        return style ? (
          <div key={period} style={style}>
            <RankBoard ranking={boards[period]} title={TITLES[period]} fontSize={rankFontSize} />
          </div>
        ) : null;
      })}
    </div>
  );
}
