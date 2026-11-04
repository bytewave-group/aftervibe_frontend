import React, { useState, useEffect } from "react";
import { Page, Icon, f7 } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import env from "../../environment.json";
import { useTokenAndUser } from "../components/action/user-data";

const parseApiDate = (value) => {
    if (!value) return null;
    const normalized = String(value).includes("T") ? value : String(value).replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDisplayDate = (dateString) => {
    const date = parseApiDate(dateString);
    if (!date) return dateString || "";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        weekday: "short",
    });
};

const formatDateTime = (dateTimeString) => {
    const date = parseApiDate(dateTimeString);
    if (!date) return { date: "", time: "" };
    return {
        date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
        time: date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }),
    };
};

const formatDuration = (duration) => {
    if (!duration) return "0h 0m";
    const [hours, minutes, seconds] = duration.split(":");
    return `${parseInt(hours, 10) || 0}h ${parseInt(minutes, 10) || 0}m ${parseInt(seconds, 10) || 0}s`;
};

const sumWorkingHours = (records) =>
    records.reduce((acc, record) => {
        if (!record.working_duration) return acc;
        const [hours, minutes, seconds] = record.working_duration
            .split(":")
            .map((num) => parseInt(num) || 0);
        return acc + hours + minutes / 60 + seconds / 3600;
    }, 0);

const CheckInHistoryPage = () => {
    const { t, i18n } = useTranslation();
    const { checkin_list } = useAuthenticate();
    const [isListExpanded, setIsListExpanded] = useState(false);
    const [checkinHistory, setCheckinHistory] = useState([]);
    const [summary, setSummary] = useState({
        achievedDays: 0,
        totalHours: 0
    });
    const { user } = useTokenAndUser();

    const [form, setForm] = useState({
        private_key: env.private_key,
        type: "",
    });

    useEffect(() => {
        const handleLanguageChange = (event) => {
            const newLanguage = event.detail;
            i18n.changeLanguage(newLanguage);
        };

        window.addEventListener('languageChanged', handleLanguageChange);

        return () => {
            window.removeEventListener('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    useEffect(() => {
        if (user?.role) {
            setForm((prev) => ({
                ...prev,
                type: (user.role || "").toLowerCase(),
            }));
        }
    }, [user?.role]);

    const fetchCheckinList = async (form) => {
        f7.preloader.show();
        try {
            const res = await checkin_list(form);
            if (!res.status || !res.data) return;

            const summaries = Array.isArray(res.data) ? res.data : [];
            const records = summaries.flatMap(
                (summary) => summary.check_in_out || summary.check_in_outs || []
            );

            const achievedDays = summaries.reduce(
                (acc, summary) => acc + (summary.achieve_days ?? 0),
                0
            );

            setCheckinHistory(records);
            setSummary({
                achievedDays: achievedDays || records.length,
                totalHours: sumWorkingHours(records),
            });
        } catch (error) {
            console.error("Error fetching check-in list:", error);
        } finally {
            f7.preloader.hide();
        }
    };

    useEffect(() => {
        if (form.type && form.private_key) {
            fetchCheckinList(form);
        }
    }, [form.type, form.private_key]);

    return (
        <Page className="checkin-history-page">
            <Header title={t("Check In History")} />
            <div className="content-panel">
                <div className="content">
                    <div className="month-header">
                        <div className="month-title font-large font-bold">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    <div className="summary-stats-container">
                        <div className="summary-stat-card">
                            <div className="summary-stat-icon-wrapper">
                                <Icon f7="calendar" className="summary-stat-icon" />
                            </div>
                            <div className="summary-stat-content">
                                <div className="summary-stat-value font-medium font-bold">{summary.achievedDays}</div>
                                <div className="summary-stat-label font-medium">{t("Days Worked")}</div>
                            </div>
                        </div>
                        <div className="summary-stat-card">
                            <div className="summary-stat-icon-wrapper">
                                <Icon f7="clock" className="summary-stat-icon" />
                            </div>
                            <div className="summary-stat-content">
                                <div className="summary-stat-value font-medium font-bold">{summary.totalHours.toFixed(1)}h</div>
                                <div className="summary-stat-label font-medium">{t("Total Hours")}</div>
                            </div>
                        </div>
                    </div>

                    <div className="details-section-header" onClick={() => setIsListExpanded(!isListExpanded)}>
                        <span className="details-section-title font-medium font-bold">{t("View Details")}</span>
                        <Icon f7={isListExpanded ? "chevron_up" : "chevron_down"} className="details-section-icon" />
                    </div>

                    <div className={`checkin-history-list ${isListExpanded ? 'expanded' : 'collapsed'}`}>
                        {checkinHistory.length > 0 ? (
                            checkinHistory.map((record) => {
                                const checkIn = formatDateTime(record.checkin_at);
                                const checkOut = formatDateTime(record.checkout_at);

                                return (
                                <div key={record.id} className="checkin-record-card">
                                    <div className="checkin-record-header">
                                        <div className="checkin-date-badge">
                                            <Icon f7="calendar" className="date-badge-icon" />
                                            <span className="date-text font-medium font-bold">{formatDisplayDate(record.date)}</span>
                                        </div>
                                    </div>
                                    <div className="checkin-record-body">
                                        <div className="time-info-group">
                                            <div className="time-entry">
                                                <span className="time-label font-small">{t("Check In")}</span>
                                                {checkIn.date && (
                                                    <span className="time-date font-medium">{checkIn.date}</span>
                                                )}
                                                <span className="time-value font-medium font-bold">{checkIn.time || "--:--"}</span>
                                            </div>
                                            <div className="time-separator-line"></div>
                                            <div className="time-entry">
                                                <span className="time-label font-small">{t("Check Out")}</span>
                                                {checkOut.date && (
                                                    <span className="time-date font-medium">{checkOut.date}</span>
                                                )}
                                                <span className="time-value font-medium font-bold">{checkOut.time || "--:--"}</span>
                                            </div>
                                        </div>
                                        <div className="duration-info">
                                            <Icon f7="clock_fill" className="duration-info-icon" />
                                            <div className="duration-content">
                                                <span className="duration-label font-small">{t("Duration")}</span>
                                                <span className="duration-value font-medium font-bold">{formatDuration(record.working_duration)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        ) : (
                            <div className="empty-history-message">
                                <Icon f7="calendar_badge_plus" className="empty-icon" />
                                <p className="font-medium">{t("No check-in records found")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default CheckInHistoryPage;
