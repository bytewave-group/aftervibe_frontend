import React, { useState, useEffect, useRef } from "react";
import {
    Page,
    f7,
    Input
} from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import { Preferences } from "@capacitor/preferences";
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import env from "../../environment.json";

const PenaltyPage = () => {
    const { penalty_lists, update_penalty } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const { user } = useTokenAndUser();
    const [penaltyData, setPenaltyData] = useState([]);
    const [penaltySummary, setPenaltySummary] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [form, setForm] = useState({
        private_key: env.private_key,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        status: 1,
    });
    const [formUpdate, setFormUpdate] = useState({
        private_key: env.private_key,
        id: "",
        status: "",
        amount: "",
    });
    const hasInitialized = useRef(false);

    const userRole = user?.role || user?.user?.role;
    const isMummyOrStaff = userRole?.toLowerCase() === 'mummy' || userRole?.toLowerCase() === 'staff';
    const isMummyOrStaffOrDoctor = userRole?.toLowerCase() === 'mummy' || userRole?.toLowerCase() === 'staff' || userRole?.toLowerCase() === 'doctor';
    const isManager = !isMummyOrStaffOrDoctor;

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

    const fetchPenalties = async (form) => {
        f7.preloader.show();
        try {
            const response = await penalty_lists(form);
            if (response.status) {
                setPenaltyData(response.data.result);
                setPenaltySummary(response?.data?.summary || null);
            } else {
                setPenaltyData([]);
                setPenaltySummary(null);
            }
        } catch (error) {
            console.error("Error fetching penalties:", error);
            setPenaltySummary(null);
        } finally {
            f7.preloader.hide();
        }
    };

    const buildForm = (overrides = {}) => {
        const baseForm = {
            private_key: env.private_key,
            start_date: overrides.start_date !== undefined ? overrides.start_date : startDate,
            end_date: overrides.end_date !== undefined ? overrides.end_date : endDate,
            status: isMummyOrStaffOrDoctor ? 2 : (overrides.status !== undefined ? overrides.status : form.status),
        };

        if (isMummyOrStaffOrDoctor && userRole) {
            baseForm.type = userRole.toLowerCase();
        }

        return baseForm;
    };

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        const updatedForm = buildForm({ start_date: newStartDate });
        setForm(updatedForm);
        fetchPenalties(updatedForm);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        const updatedForm = buildForm({ end_date: newEndDate });
        setForm(updatedForm);
        fetchPenalties(updatedForm);
    };

    // Status filter handler - only for managers
    const handleStatusChange = (e) => {
        const newStatus = parseInt(e.target.value);
        const updatedForm = buildForm({ status: newStatus });
        setForm(updatedForm);
        fetchPenalties(updatedForm);
    };

    // Initialize form and fetch penalties once when user is available
    useEffect(() => {
        if (user && !hasInitialized.current) {
            hasInitialized.current = true;
            const initialForm = buildForm();
            setForm(initialForm);
            fetchPenalties(initialForm);
        }
    }, [user]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatActionDate = (dateString) => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `${formattedDate} ${formattedTime}`;
    };

    const formatActionTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusText = (status) => {
        switch (status) {
            case 1: return t("Pending");
            case 2: return t("Confirmed");
            case 3: return t("Rejected");
            default: return t("Unknown");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 1: return "pending";
            case 2: return "confirmed";
            case 3: return "rejected";
            default: return "unknown";
        }
    };

    const handleUpdateStatus = async (id, status, amount) => {
        f7.preloader.show();
        try {
            const updateData = {
                ...formUpdate,
                id,
                status,
                amount: parseFloat(amount),
            };
            const response = await update_penalty(updateData);
            if (response.status) {
                f7.toast.show({
                    text: response.message,
                    position: 'center',
                    type: 'success',
                    closeTimeout: 1000,
                });
                const currentForm = buildForm();
                fetchPenalties(currentForm);
            } else {
                f7.toast.show({
                    text: response.message,
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error updating penalty:", error);
        } finally {
            f7.preloader.hide();
        }
    };

    return (
        <Page className="penalty-page">
            <Header title={t("Penalty")} />
            <div className="content-panel">
                <div className="content">
                    <div className="date-picker-container">
                        <div className="start-date-container">
                            <label htmlFor="start-date" className="form-label font-medium font-bold">
                                {t("Start Date")}
                            </label>
                            <div className="form-input-container">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    id="start-date"
                                    className="form-input date-picker"
                                />
                            </div>
                        </div>
                        <div className="end-date-container">
                            <label htmlFor="end-date" className="form-label font-medium font-bold">
                                {t("End Date")}
                            </label>
                            <div className="form-input-container">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    id="end-date"
                                    className="form-input date-picker"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status filter - only visible for managers */}
                    {isManager && (
                        <div className="status-filter-container">
                            <label htmlFor="status-filter" className="form-label font-medium font-bold">
                                {t("Status")}
                            </label>
                            <div className="form-input-container">
                                <select
                                    id="status-filter"
                                    value={form.status}
                                    onChange={handleStatusChange}
                                    className="form-input status-select"
                                >
                                    <option value={1}>{t("Pending")}</option>
                                    <option value={2}>{t("Confirmed")}</option>
                                    <option value={3}>{t("Rejected")}</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {!startDate && !endDate && (
                        <div className="remark-message font-small text-justify">
                            {t("No date range selected. Showing records for today.")}
                        </div>
                    )}

                    {penaltySummary && (
                        <div className="penalty-summary">
                            <div className="penalty-summary-header">
                                <span className="penalty-summary-title font-medium font-bold">{t("Summary")}</span>
                                <span className="penalty-summary-total font-bold">
                                    {t("Total")}: RM {Number(penaltySummary?.total || 0).toFixed(2)}
                                </span>
                            </div>

                            {penaltySummary?.details?.length > 0 && (
                                <div className="penalty-summary-details">
                                    {penaltySummary.details.map((detail, index) => (
                                        <div
                                            key={`${detail?.type || "summary"}-${index}`}
                                            className="penalty-summary-row"
                                        >
                                            <span className="penalty-summary-label font-medium">
                                                {t(detail?.type || "Others")}
                                            </span>
                                            <span className="penalty-summary-amount font-bold">
                                                RM {Number(detail?.amount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="penalty-list-container">
                        {penaltyData.length > 0 ? (
                            penaltyData.map((penalty) => (
                                <div key={penalty?.id} className="penalty-item">
                                    <div className="penalty-item-header">
                                        <div className="penalty-info">
                                            <div className="penalty-date">
                                                <i className="icon f7-icons">calendar</i>
                                                <span>{formatDate(penalty?.date)}</span>
                                            </div>
                                            <div className="penalty-status">
                                                <span className={`font-bold status-badge status-${getStatusClass(penalty?.status)}`}>
                                                    {getStatusText(penalty?.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="penalty-actions">
                                            {isManager && penalty.status === 1 && (
                                                <>
                                                    <button
                                                        className="action-btn approve-btn"
                                                        onClick={() => handleUpdateStatus(penalty?.id, 2, penalty?.amount)}
                                                    >
                                                        <i className="icon f7-icons">checkmark</i>
                                                    </button>
                                                    <button
                                                        className="action-btn reject-btn"
                                                        onClick={() => handleUpdateStatus(penalty?.id, 3, penalty?.amount)}
                                                    >
                                                        <i className="icon f7-icons">xmark</i>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="penalty-item-details">
                                        {isMummyOrStaffOrDoctor ? (
                                            <>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Amount (RM)")}</span>
                                                    <span className="value font-medium">RM {Number(penalty?.amount).toFixed(2)}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Action By")}</span>
                                                    <span className="value font-medium">{penalty?.action_by || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Action Time")}</span>
                                                    <span className="value font-medium">{formatActionTime(penalty?.action_at)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Target")}</span>
                                                    <span className="value font-medium">{penalty?.target?.name || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Amount")}</span>
                                                    <span className="value font-medium">RM {Number(penalty?.amount).toFixed(2)}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Remarks")}</span>
                                                    <span className="value font-medium">{penalty?.remarks || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Action By")}</span>
                                                    <span className="value font-medium">{penalty?.action_by || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Action Date")}</span>
                                                    <span className="value font-medium">{formatActionDate(penalty?.action_at)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-penalty-message">
                                <p>{t("No penalties at the moment")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default PenaltyPage;