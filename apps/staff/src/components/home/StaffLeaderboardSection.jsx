import React from "react";
import { useTranslation } from "../../services/useTranslation";

function getRankImage(index) {
  switch (index) {
    case 0:
      return "/images/top1.png";
    case 1:
      return "/images/top2.png";
    case 2:
      return "/images/top3.png";
    default:
      return "";
  }
}

export default function StaffLeaderboardSection({ entries }) {
  const { t } = useTranslation();
  if (!entries?.length) return null;

  return (
    <div className="leaderboard-section">
      <div className="leaderboard-title font-x-large font-bold">{t("Top 3 Sales")}</div>
      <div className="leaderboard-container">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`leaderboard-item ${index === 0 ? "left" : index === 1 ? "center" : "right"}`}
          >
            <div className="leaderboard-rank">
              <img src={getRankImage(index)} alt={`Rank ${index + 1}`} draggable={false} />
            </div>
            <div className="leaderboard-name font-medium">{entry?.staff_nickname}</div>
            <div className="leaderboard-sales font-medium">RM {entry?.total_order_amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
