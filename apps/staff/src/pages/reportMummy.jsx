import React, { useState, useEffect } from "react";
import { Page, Input, Icon, f7 } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import env from "../../environment.json";
import { Preferences } from "@capacitor/preferences";
import { preferencesEmitter } from "../components/action/preferences";

const ReportMummyPage = () => {
    const { t, i18n } = useTranslation();
    const { report_orders_commission } = useAuthenticate();
    const { user } = useTokenAndUser();
    const roleFromGlobal = user?.role || user?.user?.role;
    const isDoctor = roleFromGlobal?.toLowerCase() === "doctor";
    const [orderCommissionLists, setOrderCommissionLists] = useState(null);
    const [startDate, setStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [userRole, setUserRole] = useState(null);
    const [isRoleLoaded, setIsRoleLoaded] = useState(false);

    const [form, setForm] = useState({
        private_key: env.private_key,
        type: null, // Will be set after role is loaded
        target_type: null,
        status: null,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        page: 1,
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
        loadUserRole();

        // Listen to user data updates from preferencesEmitter
        const unsubscribe = preferencesEmitter.on("userUpdated", (updatedUserData) => {
            // Handle both nested structure { token, user } and flat structure
            const userData = updatedUserData?.user || updatedUserData;
            if (userData) {
                const role = userData?.role;
                if (role) {
                    setUserRole(role);
                }
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const loadUserRole = async () => {
        try {
            const { value } = await Preferences.get({ key: "user" });
            if (value) {
                const parsed = JSON.parse(value);
                const userData = parsed.user || parsed;
                const role = userData?.role;
                if (role) {
                    setUserRole(role);
                    const roleLower = role.toLowerCase();
                    const type = (roleLower === 'mummy' || roleLower === 'doctor') ? roleLower : 'mummy';
                    setForm((prevForm) => ({
                        ...prevForm,
                        type: type,
                        ...(roleLower === 'doctor' && { target_type: 6 }),
                    }));
                } else {
                    setForm((prevForm) => ({
                        ...prevForm,
                        type: 'mummy',
                    }));
                }
            } else {
                setForm((prevForm) => ({
                    ...prevForm,
                    type: 'mummy',
                }));
            }
        } catch (error) {
            console.error("Error loading user role:", error);
            setForm((prevForm) => ({
                ...prevForm,
                type: 'mummy',
            }));
        } finally {
            setIsRoleLoaded(true);
        }
    };

    useEffect(() => {
        if (isRoleLoaded && form.type && startDate && endDate) {
            fetchReportOrdersCommission();
        }

    }, [isRoleLoaded, startDate, endDate, form.target_type, form.status, form.page, form.type]);

    useEffect(() => {
        if (userRole) {
            const role = userRole.toLowerCase();
            const type = (role === 'mummy' || role === 'doctor') ? role : 'mummy';
            setForm((prevForm) => ({
                ...prevForm,
                type: type,
            }));
            setIsRoleLoaded(true);
        }
    }, [userRole]);

    // For doctor role: fix target_type to product list (6), not product (5)
    useEffect(() => {
        if (isDoctor) {
            setForm((prevForm) => ({
                ...prevForm,
                target_type: 6,
            }));
        }
    }, [isDoctor]);

    const handleTargetTypeChange = (e) => {
        const value = e.target.value ? parseInt(e.target.value) : null;
        setForm((prevForm) => ({
            ...prevForm,
            target_type: value,
            page: 1,
        }));
        setCurrentPage(1);
    };

    const handleStatusChange = (e) => {
        const value = e.target.value ? parseInt(e.target.value) : null;
        setForm((prevForm) => ({
            ...prevForm,
            status: value,
            page: 1,
        }));
        setCurrentPage(1);
    };

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        setForm((prevForm) => ({
            ...prevForm,
            start_date: newStartDate,
            page: 1,
        }));
        setCurrentPage(1);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        setForm((prevForm) => ({
            ...prevForm,
            end_date: newEndDate,
            page: 1,
        }));
        setCurrentPage(1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            setForm((prev) => ({
                ...prev,
                page: newPage,
            }));
        }
    };

    const handleNextPage = () => {
        if (orderCommissionLists?.pagination && currentPage < orderCommissionLists.pagination.total_pages) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            setForm((prev) => ({
                ...prev,
                page: newPage,
            }));
        }
    };

    const fetchReportOrdersCommission = async () => {
        f7.preloader.show();
        try {
            const updatedForm = {
                ...form,
                start_date: startDate,
                end_date: endDate,
                // Doctor: always product list (6), not product (5)
                ...(isDoctor && { target_type: 6 }),
            };
            const res = await report_orders_commission(updatedForm);
            if (res && res.status) {
                setOrderCommissionLists(res.data);
                if (res.data.pagination) {
                    const page = res.data.pagination.current_page || 1;
                    setCurrentPage(page);
                    if (form.page !== page) {
                        setForm((prev) => ({
                            ...prev,
                            page: page,
                        }));
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching report order commission:", error);
        } finally {
            f7.preloader.hide();
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 1: return t("Pending");
            case 2: return t("Completed");
            case 3: return t("Cancelled");
            default: return t("Unknown");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 1: return "pending";
            case 2: return "completed";
            case 3: return "cancelled";
            default: return "unknown";
        }
    };

    const formatAmount = (amount) => Number(amount || 0).toFixed(2);
    const summary = orderCommissionLists?.summary || {};
    const summaryItems = isDoctor
        ? [
            {
                key: "doctor",
                label: `${t("Doctor")} ${t("Commission")}`,
                value: summary?.total_doctor_commission,
            },
            {
                key: "staff",
                label: `${t("Staff")} ${t("Commission")}`,
                value: summary?.total_staff_commission,
            },
        ]
        : [
            {
                key: "mummy",
                label: `${t("Mummy")} ${t("Commission")}`,
                value: summary?.total_mummy_commission,
            },
        ];

    return (
        <Page className="report-mummy-page">
            <Header title={t("Report")} />
            <div className="content-panel">
                <div className="content">
                    {/* Date Picker Section */}
                    <div className="date-picker-container">
                        <div className="start-date-container">
                            <label htmlFor="start-date" className="form-label">
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
                            <label htmlFor="end-date" className="form-label">
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

                    {/* Filter Section */}
                    <div className="filters-container">
                        {!isDoctor && (
                            <div className="target-type-filter-container">
                                <label htmlFor="target-type-filter" className="form-label">
                                    {t("Order Type")}
                                </label>
                                <div className="form-input-container">
                                    <select
                                        id="target-type-filter"
                                        value={form.target_type || ""}
                                        onChange={handleTargetTypeChange}
                                        className="status-select"
                                    >
                                        <option value="">{t("All Types")}</option>
                                        <option value="1">{t("KTV")}</option>
                                        <option value="2">{t("Flower")}</option>
                                        <option value="3">{t("Buyout")}</option>
                                        <option value="6">{t("Product List")}</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="status-filter-container">
                            <label htmlFor="status-filter" className="form-label">
                                {t("Status")}
                            </label>
                            <div className="form-input-container">
                                <select
                                    id="status-filter"
                                    value={form.status || ""}
                                    onChange={handleStatusChange}
                                    className="status-select"
                                >
                                    <option value="">{t("All Status")}</option>
                                    <option value="1">{t("Cancelled")}</option>
                                    <option value="2">{t("Completed")}</option>
                                    <option value="3">{t("Pending")}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {!startDate && !endDate && (
                        <div className="remark-message font-small text-justify">
                            {t("No date range selected. Showing records for today.")}
                        </div>
                    )}

                    {/* Summary Section */}
                    {orderCommissionLists?.summary && (
                        <div className="report-summary-card">
                            <div className="summary-header">
                                <i className="f7-icons summary-header-icon">chart_bar</i>
                                <span className="summary-header-title">{t("Summary")}</span>
                                <span className="summary-header-hint">{t("Period totals")}</span>
                            </div>
                            <div className="summary-body">
                                <div className={`summary-total-row ${summaryItems.length > 0 ? "has-divider" : ""}`}>
                                    <span className="summary-total-label">{t("Total Sales")}</span>
                                    <span className="summary-total-value">RM {formatAmount(summary?.total_amount)}</span>
                                </div>
                                {summaryItems.map((item, index) => (
                                    <div
                                        key={item.key}
                                        className={`summary-stat ${index < summaryItems.length - 1 ? "has-divider" : ""}`}
                                    >
                                        <div className="summary-stat-main">
                                            <div className="summary-stat-icon icon-in">
                                                <i className="f7-icons">money_dollar_circle</i>
                                            </div>
                                            <div className="summary-stat-text">
                                                <span className="summary-stat-label">{item.label}</span>
                                            </div>
                                        </div>
                                        <div className="summary-stat-value amount-in">
                                            <span className="summary-stat-meta">
                                                {t("Commission")}: <span className="amount-num">RM {formatAmount(item.value)}</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Commission List (mummy or doctor) */}
                    <div className="girls-commission-list">
                        {orderCommissionLists?.data && orderCommissionLists.data.length > 0 ? (
                            orderCommissionLists.data.map((item, index) => (
                                <div key={item?.id ?? index} className="girl-commission-item">
                                    <div className="girl-commission-header">
                                        <div className="girl-commission-info">
                                            <div className="girl-code">
                                                <i className="icon f7-icons">number_circle</i>
                                                <span className="font-medium">{item?.unique_key || item?.id || "-"}</span>
                                            </div>
                                            <div className="girl-status">
                                                <span className={`font-bold status-badge status-${getStatusClass(item?.status)}`}>
                                                    {getStatusText(item?.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="girl-commission-details">
                                        {isDoctor ? (
                                            <>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Order Type")}</span>
                                                    <span className="detail-value">{item?.order_type || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Staff")}</span>
                                                    <span className="detail-value">{item?.staff_nickname || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Staff Commission")} (RM)</span>
                                                    <span className="detail-value">{item?.staff_commission || 0.0}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Doctor Commission")} (RM)</span>
                                                    <span className="detail-value highlight">
                                                        {item?.doctor_commission || 0.0}
                                                    </span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Sales")} (RM)</span>
                                                    <span className="detail-value">{item?.total_amount || 0.0}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("date")}</span>
                                                    <span className="detail-value">{item?.date || "-"}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Name")}</span>
                                                    <span className="detail-value">{item?.staff_nickname || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Order Type")}</span>
                                                    <span className="detail-value">{item?.order_type || "-"}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Sales")} (RM)</span>
                                                    <span className="detail-value">{item?.total_amount || 0.0}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">{t("Commission")} (RM)</span>
                                                    <span className="detail-value highlight">
                                                        {item?.mummy_commission || 0.0}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-commission-message">
                                <p>{t("No commission data available.")}</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {orderCommissionLists?.data && orderCommissionLists.data.length > 0 && (
                        <div className="pagination-container">
                            <button
                                className={`pagination-button ${currentPage === 1 ? "disabled" : ""}`}
                                onClick={() => handlePrevPage()}
                                disabled={currentPage === 1 || !orderCommissionLists?.pagination}
                            >
                                <Icon f7="chevron_left" className="font-bold" />
                            </button>
                            <span className="pagination-info font-small">
                                {currentPage} {t("of")} {orderCommissionLists?.pagination?.total_pages || 1}
                            </span>
                            <button
                                className={`pagination-button ${(currentPage >= (orderCommissionLists?.pagination?.total_pages || 1)) ? "disabled" : ""}`}
                                onClick={() => handleNextPage()}
                                disabled={currentPage >= (orderCommissionLists?.pagination?.total_pages || 1) || !orderCommissionLists?.pagination}
                            >
                                <Icon f7="chevron_right" className="font-bold" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default ReportMummyPage;
