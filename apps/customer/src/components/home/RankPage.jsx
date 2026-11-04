import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import RankBoard from "../animation/RankBoard";
import { getApiUrl } from "../../config/api";

const RANK_TITLES = {
  daily: "TOP DAILY",
  weekly: "TOP WEEKLY",
  monthly: "TOP MONTHLY",
};

export default function RankPage({ displayId, standalone = false }) {
  const [searchParams] = useSearchParams();
  const period = searchParams.get("period");
  const [dailyRanking, setDailyRanking] = useState([]);
  const [weeklyRanking, setWeeklyRanking] = useState([]);
  const [monthlyRanking, setMonthlyRanking] = useState([]);
  const [rankSettings, setRankSettings] = useState(null);

  const isElectron = !!window.electronAPI?.onRankBoard;

  useEffect(() => {
    if (isElectron) {
      const removeRankListener = window.electronAPI.onRankBoard(data => {
        console.log("ELECTRON RANKBOARD =", data);

        if (data?.period === "daily") {
          setDailyRanking(data.ranking ?? []);
        }

        if (data?.period === "weekly") {
          setWeeklyRanking(data.ranking ?? []);
        }

        if (data?.period === "monthly") {
          setMonthlyRanking(data.ranking ?? []);
        }
      });

      const removeScreenSettings = standalone && window.electronAPI.onScreenSettings
        ? window.electronAPI.onScreenSettings((data) => {
            setRankSettings(data);
          })
        : null;

      const removeSettingsListener = !standalone && window.electronAPI.onRankBoardSettings
        ? window.electronAPI.onRankBoardSettings(data => {
          console.log(
            `ELECTRON RANK SETTINGS DISPLAY ${displayId} =`,
            data
          );

          setRankSettings(data);
        })
        : null;
        

      return () => {
        removeRankListener?.();
        removeSettingsListener?.();
        removeScreenSettings?.();
      };
 
    }

    // Customer / Webapp mode
    const loadRanking = async () => {
      try {
        const token = localStorage.getItem("customer_token");
        const res = await fetch(`${getApiUrl()}/rankboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = await res.json();
        console.log("CUSTOMER RANKBOARD =", data);
        setDailyRanking(data.ranking ?? []);
      } catch (err) {
        console.error("RANKBOARD ERROR:", err);
      }
    };

    loadRanking();
    const timer = setInterval(loadRanking, 5000);
    return () => clearInterval(timer);
  }, [isElectron]);

  if (RANK_TITLES[period]) {
    const ranking = period === "weekly"
      ? weeklyRanking
      : period === "monthly"
        ? monthlyRanking
        : dailyRanking;

    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#07070d",
          boxSizing: "border-box",
        }}
      >
        <RankBoard ranking={ranking} title={RANK_TITLES[period]} fill />
      </div>
    );
  }

  if (standalone) {
    if (rankSettings && Number(rankSettings.rank_enabled) === 0) {
      return null;
    }

    const boards = [
      ["TOP DAILY", dailyRanking],
      ["TOP WEEKLY", weeklyRanking],
      ["TOP MONTHLY", monthlyRanking],
    ];

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          gap: 24,
          padding: 32,
          boxSizing: "border-box",
          background: "#07070d",
        }}
      >
        {boards.map(([title, ranking]) => (
          <div key={title} style={{ flex: 1, minWidth: 0 }}>
            <RankBoard ranking={ranking} title={title} large />
          </div>
        ))}
      </div>
    );
  }

  // Customer / Webapp
  if (!isElectron) {
    return (
      <div
        style={{
          position: "absolute",
          right: "60px",
          top: "40%",
          transform: "translateY(-50%)",
          zIndex: 1000,
          opacity: 0.75,
          pointerEvents: "none",
        }}
      >
        <RankBoard ranking={dailyRanking} />
      </div>
    );
  }

  // Electron
  if (rankSettings && Number(rankSettings.rank_enabled) === 0) {
    return null;
  }

  if (!rankSettings) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
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
          <RankBoard ranking={dailyRanking} title="TOP DAILY" />
        </div>
      </div>
    );
  }

  const screenWidth = Number(rankSettings.display?.width ?? 0);
  const screenHeight = Number(rankSettings.display?.height ?? 0);
  const rankWidth = Number(rankSettings.rank_size?.width) || 240;
  const rankHeight = Number(rankSettings.rank_size?.height) || 300;
  const rankFontSize = Number(rankSettings.rank_size?.font_size) || 16;

  const createRankStyle = (type) => {
    const settings = rankSettings.rankings?.[type];

    if (!settings || !settings.enabled) {
      return null;
    }

    const position = settings.position;
    const x = settings.x;
    const y = settings.y;

    if (position === "none") return null;

    const style = {
      position: "absolute",
      zIndex: 1000,
      opacity: 1,
      pointerEvents: "none",
      width: `${(rankWidth / screenWidth) * 100}%`,
      height: `${(rankHeight / screenHeight) * 100}%`,
    };

    if (x != null && y != null) {
      style.left = `${(Number(x) / screenWidth) * 100}%`;
      style.top = `${(Number(y) / screenHeight) * 100}%`;
      return style;
    }

    style.top = "50%";
    style.transform = "translateY(-50%)";
    if (position === "left") style.left = "4%";
    if (position === "right") style.right = "4%";

    return style;
  };

  const dailyStyle = createRankStyle("daily");
  const weeklyStyle = createRankStyle("weekly");
  const monthlyStyle = createRankStyle("monthly");

  return (
    <div
        style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 1000,
        }}
    >
      {dailyStyle && (
        <div style={dailyStyle}>
          <RankBoard
            ranking={dailyRanking}
            title="TOP DAILY"
            fontSize={rankFontSize}
          />
        </div>
      )}

      {weeklyStyle && (
        <div style={weeklyStyle}>
          <RankBoard
            ranking={weeklyRanking}
            title="TOP WEEKLY"
            fontSize={rankFontSize}
          />
        </div>
      )}

      {monthlyStyle && (
        <div style={monthlyStyle}>
          <RankBoard
            ranking={monthlyRanking}
            title="TOP MONTHLY"
            fontSize={rankFontSize}
          />
        </div>
      )}
    </div>
  );
}