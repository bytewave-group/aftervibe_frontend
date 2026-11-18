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

// DEV ONLY: `?mock=1` fills the boards when no Electron bridge is present (browser preview).
// Optional: `&rows=0..10` (default 3), `&bg=1` paints a busy test backdrop (never used on the LED).
const MOCK_POOL: RankEntry[] = [
  { rank: 1, name: "Test Customer1", amount: 2905, avatar: "/images/avatar-1.png" },
  { rank: 2, name: "Nova Lynx", amount: 2140, avatar: "/images/avatar-2.png" },
  { rank: 3, name: "Jade Quinn", amount: 1680, avatar: "/images/avatar-3.png" },
  { rank: 4, name: "Kilo Vex", amount: 1320 },
  { rank: 5, name: "Mira Stone", amount: 980, avatar: "/images/avatar-4.png" },
  { rank: 6, name: "Rex Han", amount: 760 },
  { rank: 7, name: "Asha Volt", amount: 540 },
  { rank: 8, name: "Piper Nix", amount: 410 },
  { rank: 9, name: "Omar Drift", amount: 295 },
  { rank: 10, name: "Yuri Flash", amount: 180 },
];

const MOCK_STAFF_POOL: RankEntry[] = [
  { rank: 1, name: "Luna", amount: 3420, avatar: "/images/avatar-2.png" },
  { rank: 2, name: "Mira", amount: 2110, avatar: "/images/avatar-3.png" },
  { rank: 3, name: "Asha", amount: 1560, avatar: "/images/avatar-4.png" },
  { rank: 4, name: "Nova", amount: 980 },
  { rank: 5, name: "Jade", amount: 760, avatar: "/images/avatar-1.png" },
  { rank: 6, name: "Kira", amount: 540 },
  { rank: 7, name: "Piper", amount: 410 },
  { rank: 8, name: "Rae", amount: 295 },
  { rank: 9, name: "Suki", amount: 180 },
  { rank: 10, name: "Tia", amount: 120 },
];

const MOCK_SETTINGS: RankBoardSettings = {
  rank_enabled: true,
  display: { id: 1, name: "mock", width: 1280, height: 720 },
  rankings: {
    daily: { enabled: true, position: "right", x: null, y: null },
    weekly: { enabled: false, position: "none", x: null, y: null },
    monthly: { enabled: false, position: "none", x: null, y: null },
  },
  rank_size: { width: 380, height: 600, font_size: 24 },
  gift_card: { enabled: false, x: null, y: null, width: null, duration: null },
  staff_rank_size: { width: 380, height: 600, font_size: 24 },
};

function readMockPreview(): {
  ranking: RankEntry[];
  staffRanking: RankEntry[];
  settings: RankBoardSettings;
  showBg: boolean;
} | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  if (query.get("mock") !== "1") return null;
  const rawParam = query.get("rows");
  const raw = rawParam == null || rawParam === "" ? Number.NaN : Number(rawParam);
  const count = Number.isFinite(raw) ? Math.max(0, Math.min(MOCK_POOL.length, Math.trunc(raw))) : 3;
  const staffOn = query.get("staff") !== "0";
  const staffRanking = MOCK_STAFF_POOL.slice(0, count);
  return {
    ranking: MOCK_POOL.slice(0, count),
    staffRanking,
    settings: {
      ...MOCK_SETTINGS,
      staff_rankings: {
        daily: { enabled: staffOn, x: null, y: null, ranking: staffRanking },
        weekly: { enabled: false, x: null, y: null, ranking: staffRanking },
        monthly: { enabled: false, x: null, y: null, ranking: staffRanking },
      },
    },
    showBg: query.get("bg") === "1",
  };
}

/**
 * Port of the Electron overlay (apps/customer OverlayScreen → RankPage + VisualEffect) for the Resolume
 * "AfterVibe Rank N" window. Data only arrives through window.electronAPI (preload-main.js).
 */
export function RankOverlayClient() {
  const [boards, setBoards] = useState<Record<Period, RankEntry[]>>({ daily: [], weekly: [], monthly: [] });
  const [staffBoards, setStaffBoards] = useState<Record<Period, RankEntry[]>>({ daily: [], weekly: [], monthly: [] });
  const [rankSettings, setRankSettings] = useState<RankBoardSettings | null>(null);
  const [showMockBg, setShowMockBg] = useState(false);

  useEffect(() => {
    const api = electronDisplayApi();

    if (!api?.onRankBoard) {
      const preview = readMockPreview();
      if (preview) {
        /* eslint-disable react-hooks/set-state-in-effect -- dev-only mock fill */
        setBoards({ daily: preview.ranking, weekly: preview.ranking, monthly: preview.ranking });
        setStaffBoards({ daily: preview.staffRanking, weekly: preview.staffRanking, monthly: preview.staffRanking });
        setRankSettings(preview.settings);
        setShowMockBg(preview.showBg);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      return;
    }

    const offRank = api.onRankBoard((data: RankBoardUpdate) => {
      if (data?.period === "daily" || data?.period === "weekly" || data?.period === "monthly") {
        setBoards((prev) => ({ ...prev, [data.period]: data.ranking ?? [] }));
        if (data.staff_ranking) {
          setStaffBoards((prev) => ({ ...prev, [data.period]: data.staff_ranking ?? [] }));
        }
      }
    });
    const offSettings = api.onRankBoardSettings?.((data) => {
      setRankSettings(data);
      setStaffBoards((prev) => {
        const next = { ...prev };
        (["daily", "weekly", "monthly"] as const).forEach((period) => {
          const rows = data.staff_rankings?.[period]?.ranking;
          if (rows) {
            next[period] = rows;
          }
        });
        return next;
      });
    });

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
      {showMockBg ? <div className="av-display-mock-bg" aria-hidden="true" /> : null}
      <RankLayer boards={boards} staffBoards={staffBoards} rankSettings={rankSettings} />
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
  staffBoards,
  rankSettings,
}: {
  boards: Record<Period, RankEntry[]>;
  staffBoards: Record<Period, RankEntry[]>;
  rankSettings: RankBoardSettings | null;
}) {
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
          <RankBoard ranking={boards.daily} title={TITLES.daily} period="daily" />
        </div>
      </div>
    );
  }

  const screenWidth = Number(rankSettings.display?.width ?? 0);
  const screenHeight = Number(rankSettings.display?.height ?? 0);
  const customerOn = Number(rankSettings.rank_enabled) !== 0;
  const rankWidth = Number(rankSettings.rank_size?.width) || 240;
  const rankHeight = Number(rankSettings.rank_size?.height) || 300;
  const rankFontSize = Number(rankSettings.rank_size?.font_size) || 16;
  const staffWidth = Number(rankSettings.staff_rank_size?.width) || 240;
  const staffHeight = Number(rankSettings.staff_rank_size?.height) || 300;
  const staffFontSize = Number(rankSettings.staff_rank_size?.font_size) || 16;

  const styleFor = (
    period: Period,
    size: { width: number; height: number },
    placement:
      | { enabled?: boolean; position?: string; x?: number | null; y?: number | null }
      | undefined,
    fallback: "left" | "right",
  ): CSSProperties | null => {
    if (!placement?.enabled || placement.position === "none") return null;

    const style: CSSProperties = {
      position: "absolute",
      zIndex: 1000,
      opacity: 1,
      pointerEvents: "none",
      width: `${(size.width / screenWidth) * 100}%`,
      height: `${(size.height / screenHeight) * 100}%`,
    };

    if (placement.x != null && placement.y != null) {
      style.left = `${(Number(placement.x) / screenWidth) * 100}%`;
      style.top = `${(Number(placement.y) / screenHeight) * 100}%`;
      return style;
    }

    style.top = "50%";
    style.transform = "translateY(-50%)";
    const side = placement.position === "left" || placement.position === "right" ? placement.position : fallback;
    if (side === "left") style.left = "4%";
    if (side === "right") style.right = "4%";
    return style;
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1000 }}>
      {customerOn
        ? (["daily", "weekly", "monthly"] as const).map((period) => {
            const style = styleFor(
              period,
              { width: rankWidth, height: rankHeight },
              rankSettings.rankings?.[period],
              "right",
            );
            return style ? (
              <div key={`customer-${period}`} style={style}>
                <RankBoard ranking={boards[period]} title={TITLES[period]} fontSize={rankFontSize} period={period} />
              </div>
            ) : null;
          })
        : null}
      {(["daily", "weekly", "monthly"] as const).map((period) => {
        const style = styleFor(
          period,
          { width: staffWidth, height: staffHeight },
          rankSettings.staff_rankings?.[period],
          "left",
        );
        return style ? (
          <div key={`staff-${period}`} style={style}>
            <RankBoard
              ranking={staffBoards[period]}
              title={TITLES[period]}
              fontSize={staffFontSize}
              period={period}
              variant="staff"
              kicker="TOP GIRLS"
            />
          </div>
        ) : null;
      })}
    </div>
  );
}
