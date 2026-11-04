import React, { useEffect, useState } from "react";
import { Icon } from "framework7-react";
import LanguageSelector from "../LanguageSelector";
import useCommon from "../action/Common";
import { shouldShowHomeRefreshButton } from "../../config/pendingFlowerMovementConfig";

export default function HomeTopBar({ onLogout, userRole }) {
  const { navigate } = useCommon();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const showRefreshButton = shouldShowHomeRefreshButton(userRole);

  useEffect(() => {
    const handleRefreshComplete = () => setIsRefreshing(false);
    window.addEventListener("homeConfirmationsRefreshComplete", handleRefreshComplete);
    return () => {
      window.removeEventListener("homeConfirmationsRefreshComplete", handleRefreshComplete);
    };
  }, []);

  const handleRefreshClick = () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("homeConfirmationsRefresh"));
  };

  return (
    <div className="navbar-container">
      <LanguageSelector />
      <div className="navigation-buttons">
        {showRefreshButton && (
          <div
            className="profile-button home-refresh-button"
            onClick={handleRefreshClick}
            role="button"
            tabIndex={0}
            aria-busy={isRefreshing}
          >
            <Icon
              f7="arrow_2_circlepath_circle"
              className={`font-xx-large ${isRefreshing ? "rotating" : ""}`}
            />
          </div>
        )}
        <div className="profile-button" onClick={() => navigate("/profile")}>
          <Icon f7="person" className="font-xx-large" />
        </div>
        <div className="logout-button" onClick={onLogout}>
          <Icon f7="square_arrow_right" className="font-xx-large" />
        </div>
      </div>
    </div>
  );
}
