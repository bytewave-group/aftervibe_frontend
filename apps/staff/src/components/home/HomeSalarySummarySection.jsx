import React from "react";
import { Icon } from "framework7-react";
import { useTranslation } from "../../services/useTranslation";

const formatAmount = (amount) => Number(amount || 0).toFixed(2);

const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPeriodLabel = (startDate, endDate) => {
  if (!startDate && !endDate) return "";
  if (startDate === endDate) return formatDisplayDate(startDate);
  return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
};

const normalizeSummaryRows = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [data];
};

const sumRows = (rows, isStaff) =>
  rows.reduce(
    (acc, row) => {
      const next = {
        commission: acc.commission + Number(row?.total_commission || 0),
        penalty: acc.penalty + Number(row?.total_penalty || 0),
        net: acc.net + Number(row?.total_net || 0),
      };

      if (isStaff) {
        next.accommodation = acc.accommodation + Number(row?.total_accommodation || 0);
        next.comeInWorkSalary =
          acc.comeInWorkSalary + Number(row?.total_come_in_work_salary || 0);
        next.ticket = acc.ticket + Number(row?.total_ticket || 0);
      }

      return next;
    },
    isStaff
      ? { commission: 0, penalty: 0, net: 0, accommodation: 0, comeInWorkSalary: 0, ticket: 0 }
      : { commission: 0, penalty: 0, net: 0 }
  );

const SalaryStatTile = ({ className, icon, value, label }) => (
  <div className={`salary-stat-tile ${className}`}>
    <div className="salary-stat-tile-icon">
      <Icon f7={icon} />
    </div>
    <div className="salary-stat-tile-content">
      <span className="salary-stat-tile-value font-bold">RM {formatAmount(value)}</span>
      <span className="salary-stat-tile-label font-medium">{label}</span>
    </div>
  </div>
);

export default function HomeSalarySummarySection({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  summaryData,
  isLoading,
  userRole,
}) {
  const { t } = useTranslation();
  const rows = normalizeSummaryRows(summaryData);
  const roleLower = (userRole || summaryData?.user_type || "").toLowerCase();
  const isStaff = roleLower === "staff";
  const hasData = rows.length > 0;
  const totals = sumRows(rows, isStaff);
  const showDailyBreakdown = rows.length > 1 && rows.some((row) => row?.date);
  const periodLabel = formatPeriodLabel(startDate, endDate);

  return (
    <div className="salary-summary-section">
      <div className="salary-filter-card">
        <div className="salary-filter-header">
          <Icon f7="calendar" className="salary-filter-icon" />
          <span className="salary-filter-title font-medium font-bold">{t("Date Range")}</span>
        </div>
        <div className="salary-filter-inputs">
          <div className="salary-filter-field">
            <label htmlFor="salary-start-date" className="salary-filter-label font-medium">
              {t("Start Date")}
            </label>
            <div className="salary-filter-input-wrap">
              <input
                type="date"
                value={startDate}
                onChange={onStartDateChange}
                id="salary-start-date"
                className="salary-filter-input"
                max={endDate}
              />
            </div>
          </div>
          <span className="salary-filter-separator" aria-hidden="true">–</span>
          <div className="salary-filter-field">
            <label htmlFor="salary-end-date" className="salary-filter-label font-medium">
              {t("End Date")}
            </label>
            <div className="salary-filter-input-wrap">
              <input
                type="date"
                value={endDate}
                onChange={onEndDateChange}
                id="salary-end-date"
                className="salary-filter-input"
                min={startDate}
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="salary-summary-loading font-medium">{t("Loading...")}</div>
      ) : hasData ? (
        <>
          <div className="salary-hero-card">
            <div className="salary-hero-top">
              <Icon f7="wallet_fill" className="salary-hero-icon" />
              <span className="salary-hero-label">{t("Total Net")}</span>
            </div>
            <div className="salary-hero-amount font-bold">RM {formatAmount(totals.net)}</div>
            {periodLabel && (
              <div className="salary-hero-period font-medium">{periodLabel}</div>
            )}
          </div>

          <div className={`salary-stat-grid${isStaff ? " salary-stat-grid--staff" : ""}`}>
            <SalaryStatTile
              className="salary-stat-tile--commission"
              icon="arrow_up_circle_fill"
              value={totals.commission}
              label={t("Total Commission")}
            />
            <SalaryStatTile
              className="salary-stat-tile--penalty"
              icon="minus_circle_fill"
              value={totals.penalty}
              label={t("Total Penalty")}
            />
            {isStaff && (
              <>
                <SalaryStatTile
                  className="salary-stat-tile--accommodation"
                  icon="house_fill"
                  value={totals.accommodation}
                  label={t("Total Accommodation")}
                />
                <SalaryStatTile
                  className="salary-stat-tile--come-in-work"
                  icon="briefcase_fill"
                  value={totals.comeInWorkSalary}
                  label={t("Total Come In Work Salary")}
                />
                <SalaryStatTile
                  className="salary-stat-tile--ticket"
                  icon="ticket_fill"
                  value={totals.ticket}
                  label={t("Total Ticket")}
                />
              </>
            )}
          </div>

          {showDailyBreakdown && (
            <div className="salary-daily-section">
              <div className="salary-daily-header font-medium font-bold">{t("Daily Breakdown")}</div>
              <div className="salary-daily-list">
                {rows.map((row, index) => (
                  <div key={`${row?.date || "row"}-${index}`} className="salary-daily-card">
                    <div className="salary-daily-card-date">
                      <Icon f7="calendar" className="salary-daily-date-icon" />
                      <span className="font-medium font-bold">
                        {formatDisplayDate(row?.date)}
                      </span>
                    </div>
                    <div className="salary-daily-card-rows">
                      <div className="salary-daily-metric">
                        <span className="salary-daily-metric-label">{t("Commission")}</span>
                        <span className="salary-daily-metric-value">
                          RM {formatAmount(row?.total_commission)}
                        </span>
                      </div>
                      <div className="salary-daily-metric">
                        <span className="salary-daily-metric-label">{t("Penalty")}</span>
                        <span className="salary-daily-metric-value salary-daily-metric-value--penalty">
                          RM {formatAmount(row?.total_penalty)}
                        </span>
                      </div>
                      {isStaff && (
                        <>
                          <div className="salary-daily-metric">
                            <span className="salary-daily-metric-label">{t("Accommodation")}</span>
                            <span className="salary-daily-metric-value">
                              RM {formatAmount(row?.total_accommodation)}
                            </span>
                          </div>
                          <div className="salary-daily-metric">
                            <span className="salary-daily-metric-label">
                              {t("Come In Work Salary")}
                            </span>
                            <span className="salary-daily-metric-value">
                              RM {formatAmount(row?.total_come_in_work_salary)}
                            </span>
                          </div>
                          <div className="salary-daily-metric">
                            <span className="salary-daily-metric-label">{t("Ticket")}</span>
                            <span className="salary-daily-metric-value">
                              RM {formatAmount(row?.total_ticket)}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="salary-daily-metric salary-daily-metric--net">
                        <span className="salary-daily-metric-label">{t("Total Net")}</span>
                        <span className="salary-daily-metric-value salary-daily-metric-value--net">
                          RM {formatAmount(row?.total_net)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : summaryData !== null ? (
        <div className="salary-summary-empty font-medium">
          <Icon f7="doc_text" className="salary-empty-icon" />
          <span>{t("No salary data for this period.")}</span>
        </div>
      ) : null}
    </div>
  );
}
