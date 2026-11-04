import React from "react";
import { Button, Icon } from "framework7-react";
import { useTranslation } from "../../services/useTranslation";

export default function StaffAttendanceSection({
  isLoadingProfile,
  showDaysSelection,
  daysSelected,
  attendanceCount,
  isLoadingProgress,
  isRefreshingProgress,
  onSelectDays,
  onUpdateDays,
  onRefreshProgress,
}) {
  const { t } = useTranslation();
  return (
    <div className="attendance-section">
      {isLoadingProfile ? null : showDaysSelection ? (
        <div className="days-selection-container">
          <div className="days-selection-title font-medium font-bold">{t("Select Working Days")}</div>
          <div className="days-selection-options">
            {[7, 14, 21, 28].map((days) => (
              <div
                key={days}
                className={`days-option ${daysSelected === days ? "selected" : ""}`}
                onClick={() => onSelectDays(days)}
              >
                {days}
              </div>
            ))}
          </div>
          <Button fill onClick={onUpdateDays} className="update-button" disabled={!daysSelected}>
            {t("Update")}
          </Button>
        </div>
      ) : (
        <div className="attendance-progress-container">
          <div className="attendance-progress-header">
            <div className="attendance-progress-label">
              {t("Attendance")}
              <span className="attendance-progress-count">
                {isLoadingProgress
                  ? t("Loading...")
                  : `${attendanceCount} / ${daysSelected} ${t("Days")}`}
              </span>
            </div>
            <Button
              className="refresh-progress-btn"
              onClick={onRefreshProgress}
              disabled={isRefreshingProgress || isLoadingProgress}
            >
              <Icon
                f7={isRefreshingProgress || isLoadingProgress ? "hourglass" : "arrow_clockwise"}
                className={`${isRefreshingProgress || isLoadingProgress ? "rotating" : ""} font-x-large`}
              />
            </Button>
          </div>
          <div className="attendance-progress-bar-bg">
            <div
              className="attendance-progress-bar-fg"
              style={{
                width: isLoadingProgress ? "0%" : `${(attendanceCount / daysSelected) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
