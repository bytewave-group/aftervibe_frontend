import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Page,
    f7,
    Input,
    Icon,
    Popup
} from "framework7-react";
import { Preferences } from "@capacitor/preferences";
import Header from "../components/header";
import Tools from "../components/tools";
import useCommon from "../components/action/Common";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import {
    buildPaymentRows,
    buildPosReceipt,
    printPosReceipt,
} from "../utils/androidReceiptPrinter";
import { isPrinterReadyForPrint } from "../utils/printerConnection";
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from "../constants/receiptStatus";
import env from "../../environment.json";

const todayISO = () => new Date().toISOString().split("T")[0];

/** Resolve API report_orders type once user context is ready */
function resolveReportType(user, isLoadingUser) {
    if (isLoadingUser || user === null || user === undefined) return null;
    const roleLower = String(user?.role || user?.user?.role || "").toLowerCase();
    if (roleLower === "staff" || roleLower === "mummy" || roleLower === "doctor") return roleLower;
    return "manager";
}

/** Official receipt title for manager order history reprints (English only). */
function resolveManagerReceiptTitle(type) {
    const normalized = String(type ?? "").trim().toLowerCase();
    if (normalized === "flower") return "Claim Flower";
    if (normalized === "ktv") return "Order (KTV)";
    if (normalized === "buyout") return "Order (Buyout)";
    if (normalized === "product.l" || normalized === "product" || normalized.startsWith("product.")) {
        return "Order (Product)";
    }
    return type || "Order";
}

const SalesPage = () => {
    const { report_orders, rejected_orders } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const { user, isLoading: isLoadingUser } = useTokenAndUser();

    const reportType = useMemo(
        () => resolveReportType(user, isLoadingUser),
        [user, isLoadingUser]
    );
    const isManager = reportType === "manager";

    const userRole = user?.role || user?.user?.role;
    const roleLower = userRole?.toLowerCase();

    const [startDate, setStartDate] = useState(todayISO);
    const [endDate, setEndDate] = useState(todayISO);
    const [statusFilter, setStatusFilter] = useState("");
    const [targetType, setTargetType] = useState("");
    const [page, setPage] = useState(1);

    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({ total_amount: 0, details: [] });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false);
    const [isRejectPopupOpen, setIsRejectPopupOpen] = useState(false);
    const [isPrinterPromptOpen, setIsPrinterPromptOpen] = useState(false);
    const [orderToReject, setOrderToReject] = useState(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(true);
    const [paymentMethodsFromGlobal, setPaymentMethodsFromGlobal] = useState([]);

    useEffect(() => {
        if (!isManager) return;
        const loadPaymentMethods = async () => {
            try {
                const { value } = await Preferences.get({ key: "global_data" });
                if (!value) return;
                const globalData = JSON.parse(value);
                const methods = globalData?.payment_methods ?? [];
                setPaymentMethodsFromGlobal(Array.isArray(methods) ? methods : []);
            } catch (error) {
                console.error("Error loading payment methods:", error);
            }
        };
        loadPaymentMethods();
    }, [isManager]);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            const newLanguage = event.detail;
            i18n.changeLanguage(newLanguage);
        };

        window.addEventListener("languageChanged", handleLanguageChange);
        return () => {
            window.removeEventListener("languageChanged", handleLanguageChange);
        };
    }, [i18n]);

    const buildPayload = useCallback(() => {
        const status =
            statusFilter === "" ? "" : parseInt(statusFilter, 10);
        let targetPayload;
        if (isManager) {
            targetPayload =
                targetType === "" ? null : parseInt(targetType, 10);
        } else {
            targetPayload =
                targetType === "" ? "" : parseInt(targetType, 10);
        }

        return {
            private_key: env.private_key,
            type: reportType,
            start_date: startDate,
            end_date: endDate,
            status,
            target_type: targetPayload,
            page,
        };
    }, [
        reportType,
        startDate,
        endDate,
        statusFilter,
        targetType,
        page,
        isManager,
    ]);

    const fetchReportOrders = useCallback(async () => {
        if (isLoadingUser || reportType == null) return;

        f7.preloader.show();
        try {
            const formData = buildPayload();
            const response = await report_orders(formData);
            if (response.status) {
                setOrders(Array.isArray(response.data.data) ? response.data.data : []);
                setSummary(response.data.summary || { total_amount: 0, details: [] });
                const cp = response.data.pagination?.current_page || 1;
                const tp = response.data.pagination?.total_pages || 1;
                setCurrentPage(cp);
                setTotalPages(tp);
                setPage(cp);
            } else {
                setOrders([]);
                setSummary({ total_amount: 0, details: [] });
                setCurrentPage(1);
                setTotalPages(1);
            }
        } catch (error) {
            setOrders([]);
            setSummary({ total_amount: 0, details: [] });
            setCurrentPage(1);
            setTotalPages(1);
            console.error("Error fetching report orders:", error);
        } finally {
            f7.preloader.hide();
        }
        // report_orders is intentionally omitted from deps (useAuthenticate returns new function refs each render).
    }, [isLoadingUser, reportType, buildPayload]);

    useEffect(() => {
        fetchReportOrders();
    }, [fetchReportOrders]);

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        setPage(1);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        setPage(1);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    const handleTargetTypeChange = (e) => {
        setTargetType(e.target.value);
        setPage(1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setPage((p) => p - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setPage((p) => p + 1);
    };

    const formatTime12Hour = (dateTimeString) => {
        if (!dateTimeString) return "";
        const timePart = dateTimeString.split(" ")[1];
        if (!timePart) return "";
        const [hour, minute] = timePart.split(":");
        const hourNum = parseInt(hour, 10);
        const ampm = hourNum >= 12 ? "PM" : "AM";
        const hour12 = hourNum % 12 || 12;
        return `${hour12}:${minute} ${ampm}`;
    };

    const getStatusClassManager = (status) => {
        switch (status) {
            case 1: return "pending";
            case 2: return "completed";
            case 3: return "cancelled";
            default: return "unknown";
        }
    };

    const getStatusTextManager = (status) => {
        switch (status) {
            case 1: return t("Pending");
            case 2: return t("Approved");
            case 3: return t("Cancelled");
            default: return t("Unknown");
        }
    };

    const getStatusClassSales = (status) => {
        switch (status) {
            case 1: return "pending";
            case 2: return "completed";
            case 3: return "cancelled";
            default: return "unknown";
        }
    };

    const getStatusTextSales = (status) => {
        switch (status) {
            case 1: return t("Pending");
            case 2: return t("Approved");
            case 3: return t("Cancelled");
            default: return t("Unknown");
        }
    };

    const getStatusIconSales = (status) => {
        switch (status) {
            case 1: return "exclamationmark_circle";
            case 2: return "checkmark_circle";
            case 3: return "xmark_circle";

            default: return "question_circle";
        }
    };

    const getStatusColorSales = (status) => {
        switch (status) {
            case 1: return "orange";
            case 2: return "green";
            case 3: return "red";
            default: return "gray";
        }
    };

    const formatAmount = (amount) => Number(amount || 0).toFixed(2);
    const summaryDetails = Array.isArray(summary?.details) ? summary.details : [];

    const commissionField =
        roleLower === "doctor"
            ? "doctor_commission"
            : roleLower === "mummy"
                ? "mummy_commission"
                : roleLower === "staff"
                    ? "staff_commission"
                    : null;
    const commissionLabel =
        roleLower === "doctor"
            ? `${t("Doctor")} ${t("Commission")}`
            : roleLower === "mummy"
                ? `${t("Mummy")} ${t("Commission")}`
                : roleLower === "staff"
                    ? `${t("Staff")} ${t("Commission")}`
                    : "";

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setIsDetailsPopupOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailsPopupOpen(false);
        setSelectedOrder(null);
    };

    const handleRejectOrder = (order) => {
        setOrderToReject(order);
        setIsRejectPopupOpen(true);
    };

    const handleConfirmReject = async () => {
        if (!orderToReject) return;

        try {
            f7.preloader.show();
            const response = await rejected_orders({
                private_key: env.private_key,
                order_id: orderToReject.id,
            });

            if (response.status) {
                f7.toast.show({
                    text: t("Order rejected successfully"),
                    position: "center",
                    closeTimeout: 2000,
                });
                setIsRejectPopupOpen(false);
                setOrderToReject(null);
                fetchReportOrders();
            } else {
                f7.toast.show({
                    text: response.message || t("Failed to reject order"),
                    position: "center",
                    closeTimeout: 3000,
                });
            }
        } catch (error) {
            console.error("Error rejecting order:", error);
            f7.toast.show({
                text: t("Failed to reject order"),
                position: "center",
                closeTimeout: 3000,
            });
        } finally {
            f7.preloader.hide();
        }
    };

    const handleCancelReject = () => {
        setIsRejectPopupOpen(false);
        setOrderToReject(null);
    };

    const buildReportOrderPaymentRows = useCallback(
        (order) => {
            const payments = Array.isArray(order?.payments) ? order.payments : [];
            if (!payments.length) return [];

            const hasMethodIds = payments.some((p) => p.payment_method_id != null);
            if (hasMethodIds) {
                return buildPaymentRows({
                    payLater: false,
                    payments,
                    handleFee: order.handle_fee,
                    paymentMethodsFromGlobal,
                });
            }

            const rows = payments.map((p) => ({
                label: p.name || "Payment",
                value: `RM ${formatAmount(p.amount)}`,
            }));
            const fee = Number(order.handle_fee) || 0;
            if (fee > 0) {
                rows.push({ label: "Handle Fee", value: `RM ${formatAmount(fee)}` });
            }
            return rows;
        },
        [paymentMethodsFromGlobal]
    );

    const buildManagerOrderReceiptText = useCallback(
        (order, layout) => {
            const total = Number(order?.amount) || 0;
            const metaRows = [];
            if (order?.mummy_name) {
                metaRows.push({ label: "Mummy", value: order.mummy_name });
            }
            if (order?.staff_name) {
                metaRows.push({ label: "Staff", value: order.staff_name });
            }
            if (order?.doctor_name) {
                metaRows.push({ label: "Doctor", value: order.doctor_name });
            }
            if (order?.action_by) {
                metaRows.push({ label: "Action By", value: order.action_by });
            }

            const orderId =
                order?.unique_key ?? (order?.id != null ? String(order.id) : null);
            const receiptDate = order?.action_at || order?.date || new Date();
            const receiptTitle = resolveManagerReceiptTitle(order?.type);

            return buildPosReceipt({
                title: receiptTitle,
                orderId,
                date: receiptDate,
                status: resolveReceiptStatusLabel(
                    { status: order?.status },
                    RECEIPT_STATUS_KIND.ORDER
                ),
                metaRows,
                items: [{ name: receiptTitle, qty: 1, total }],
                total,
                paymentRows: buildReportOrderPaymentRows(order),
                receiptType: "payment",
                layout,
            });
        },
        [buildReportOrderPaymentRows]
    );

    const showPrinterConnectPrompt = useCallback(() => {
        setIsPrinterPromptOpen(true);
    }, []);

    const handleClosePrinterPrompt = useCallback(() => {
        setIsPrinterPromptOpen(false);
    }, []);

    const handleGoToPrinterSettings = useCallback(() => {
        setIsPrinterPromptOpen(false);
        navigate("/printer-settings");
    }, [navigate]);

    const handlePrintOrderReceipt = useCallback(
        async (order) => {
            if (!order) return;

            f7.preloader.show();
            try {
                const ready = await isPrinterReadyForPrint();
                if (!ready) {
                    showPrinterConnectPrompt();
                    return;
                }

                void printPosReceipt((layout) => buildManagerOrderReceiptText(order, layout)).catch(
                    (error) => {
                        console.error("Error printing order receipt:", error);
                        f7.toast.show({
                            text: t("Print failed"),
                            position: "center",
                            closeTimeout: 2000,
                        });
                    }
                );
            } finally {
                f7.preloader.hide();
            }
        },
        [buildManagerOrderReceiptText, showPrinterConnectPrompt, t]
    );

    const pageClassName = isManager ? "order-history-page" : "sales-page";
    const headerTitle = isManager ? t("Order History") : t("Sales");
    const summaryCardClass = isManager
        ? "order-summary-card"
        : "sales-summary-card sales-summary-card--staff";

    const toggleSummary = () => setIsSummaryOpen((open) => !open);

    const renderStaffSummaryDetail = (detail, index, totalCount) => {
        const commissionAmount = commissionField
            ? formatAmount(detail?.[commissionField])
            : null;

        return (
            <div
                key={`${detail?.type || "unknown"}-${index}`}
                className={`sales-summary-row${index < totalCount - 1 ? " has-divider" : ""}`}
            >
                <div className="sales-summary-row-type">
                    <div className="summary-stat-icon icon-in">
                        <i className="f7-icons">money_dollar_circle</i>
                    </div>
                    <span className="sales-summary-type-name">{t(detail?.type || "")}</span>
                </div>
                <div className="sales-summary-row-amounts">
                    <div className="sales-summary-amount-line">
                        <span className="sales-summary-amount-label">{t("Sales")}</span>
                        <span className="sales-summary-amount-value sales">
                            RM {formatAmount(detail?.amount)}
                        </span>
                    </div>
                    {commissionAmount != null && (
                        <div className="sales-summary-amount-line">
                            <span className="sales-summary-amount-label">{t("Commission")}</span>
                            <span className="sales-summary-amount-value commission">
                                RM {commissionAmount}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSummaryHeader = () => (
        <div
            className="summary-header"
            role="button"
            tabIndex={0}
            onClick={toggleSummary}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSummary();
                }
            }}
            aria-expanded={isSummaryOpen}
        >
            <i className="f7-icons summary-header-icon">chart_bar</i>
            <span className="summary-header-title">{t("Summary")}</span>
            <span className="summary-header-hint">{t("Period totals")}</span>
            <button
                type="button"
                className="summary-header-toggle"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleSummary();
                }}
                aria-label={isSummaryOpen ? t("Collapse") : t("Expand")}
            >
                <Icon f7={isSummaryOpen ? "chevron_up" : "chevron_down"} />
            </button>
        </div>
    );

    return (
        <Page className={pageClassName}>
            <Header title={headerTitle} />
            <div className="content-panel">
                <div className="content">
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
                                    {...(!isManager ? { max: endDate } : {})}
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
                                    {...(!isManager ? { min: startDate } : {})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filters-container">
                        <div className="status-filter-container">
                            <label htmlFor="status-filter" className="form-label">
                                {t("Status")}
                            </label>
                            <div className="form-input-container">
                                <select
                                    id="status-filter"
                                    value={statusFilter}
                                    onChange={handleStatusChange}
                                    className="status-select"
                                >
                                    <option value="">{t("All")}</option>
                                    {isManager ? (
                                        <>
                                            <option value="1">{t("Pending")}</option>
                                            <option value="2">{t("Approved")}</option>
                                            <option value="3">{t("Cancelled")}</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="1">{t("Pending")}</option>
                                            <option value="2">{t("Approved")}</option>
                                            <option value="3">{t("Cancelled")}</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="target-type-filter-container">
                            <label htmlFor="target-type-filter" className="form-label">
                                {t("Type")}
                            </label>
                            <div className="form-input-container">
                                <select
                                    id="target-type-filter"
                                    value={targetType}
                                    onChange={handleTargetTypeChange}
                                    className="status-select"
                                >
                                    <option value="">{t("All")}</option>
                                    <option value="1">{t("KTV")}</option>
                                    <option value="2">{t("Flower")}</option>
                                    <option value="3">{t("Buyout")}</option>
                                    <option value="5">{t("Product")}</option>
                                    {/* {!isManager && (
                                        <option value="6">{t("Product List")}</option>
                                    )} */}
                                </select>
                            </div>
                        </div>
                    </div>

                    {!startDate && !endDate && (
                        <div className="remark-message font-small text-justify">
                            {t("No date range selected. Showing records for today.")}
                        </div>
                    )}

                    {(summaryDetails.length > 0 ||
                        Number(summary?.total_amount || 0) > 0) && (
                            <div
                                className={`${summaryCardClass}${isSummaryOpen ? "" : " summary-collapsed"}`}
                            >
                                {renderSummaryHeader()}
                                {isSummaryOpen && (
                                    <div className="summary-body">
                                        {isManager ? (
                                            <>
                                                <div
                                                    className={`summary-total-row ${summaryDetails.length > 0 ? "has-divider" : ""}`}
                                                >
                                                    <span className="summary-total-label">{t("Total Amount")}</span>
                                                    <span className="summary-total-value">
                                                        RM {formatAmount(summary?.total_amount)}
                                                    </span>
                                                </div>
                                                {summaryDetails.map((detail, index) => {
                                                    const commissionRows = [
                                                        { key: "staff_commission", label: `${t("Staff")} ${t("Commission")}` },
                                                        { key: "mummy_commission", label: `${t("Mummy")} ${t("Commission")}` },
                                                        { key: "doctor_commission", label: `${t("Doctor")} ${t("Commission")}` },
                                                        { key: "agent_commission", label: `${t("Agent")} ${t("Commission")}` },
                                                    ];

                                                    return (
                                                        <div
                                                            key={`${detail?.type || "unknown"}-${index}`}
                                                            className={`summary-stat ${index < summaryDetails.length - 1 ? "has-divider" : ""}`}
                                                        >
                                                            <div className="summary-stat-top">
                                                                <div className="summary-stat-main">
                                                                    <div className="summary-stat-icon icon-in">
                                                                        <i className="f7-icons">money_dollar_circle</i>
                                                                    </div>
                                                                    <div className="summary-stat-text">
                                                                        <span className="summary-stat-label">{t(detail?.type || "")}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="summary-stat-value amount-in">
                                                                    <span className="summary-stat-meta">{t("Amount")}</span>
                                                                    <span className="amount-num">RM {formatAmount(detail?.amount)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="summary-stat-commissions">
                                                                {commissionRows.map((item) => (
                                                                    <div key={item.key} className="summary-commission-item">
                                                                        <span className="summary-commission-label">{item.label}</span>
                                                                        <span className="summary-commission-value">
                                                                            RM {formatAmount(detail?.[item.key])}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <>
                                                <div className="summary-total-row has-divider">
                                                    <span className="summary-total-label">{t("Total Sales")}</span>
                                                    <span className="summary-total-value">
                                                        RM {formatAmount(summary?.total_amount)}
                                                    </span>
                                                </div>
                                                {summaryDetails.map((detail, index) =>
                                                    renderStaffSummaryDetail(
                                                        detail,
                                                        index,
                                                        summaryDetails.length
                                                    )
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    <div className="order-list-container">
                        {orders.length > 0 ? (
                            orders.map((order, idx) =>
                                isManager ? (
                                    <div key={idx} className="order-item">
                                        <div className="order-item-header">
                                            <div className="order-item-header-top">
                                                <div className="order-info">
                                                    <div className="order-date-time">
                                                        <div className="order-date">
                                                            <i className="icon f7-icons">calendar</i>
                                                            <span className="font-medium">{order?.date}</span>
                                                        </div>
                                                        <div className="order-time font-medium">
                                                            {formatTime12Hour(order?.action_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="order-actions">
                                                    <div
                                                        className="action-btn print-btn"
                                                        role="button"
                                                        title={t("Print Receipt")}
                                                        onClick={() => handlePrintOrderReceipt(order)}
                                                    >
                                                        <Icon f7="printer" />
                                                    </div>
                                                    <div
                                                        className="action-btn view-btn"
                                                        onClick={() => handleViewDetails(order)}
                                                    >
                                                        <Icon f7="eye" />
                                                    </div>
                                                    {(order.status === 1 || order.status === 2) && (
                                                        <div
                                                            className="action-btn reject-btn"
                                                            onClick={() => handleRejectOrder(order)}
                                                        >
                                                            <Icon f7="xmark_circle" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="order-status-row">
                                                <span
                                                    className={`font-bold status-badge status-${getStatusClassManager(order?.status)}`}
                                                >
                                                    {getStatusTextManager(order?.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="order-item-details">
                                            <div className="detail-row">
                                                <span className="label">{t("Type")}</span>
                                                <span className="value">{order?.type}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="label">{t("Staff")}</span>
                                                <span className="value">{order?.staff_name || "-"}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="label">{t("Amount")}</span>
                                                <span className="value font-bold">
                                                    RM {Number(order?.amount).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={idx} className="order-item">
                                        <div className="order-item-header">
                                            <div className="sales-order-header-main">
                                                <div className="order-header-datetime" aria-label={t("Date and time")}>
                                                    <div className="order-date">
                                                        <i className="icon f7-icons font-large">calendar</i>
                                                        <span className="font-medium">{order?.date}</span>
                                                    </div>
                                                    <div className="order-time font-small">
                                                        {formatTime12Hour(order?.action_at)}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`sales-order-status sales-order-status--${getStatusClassSales(order?.status)}`}
                                                    role="status"
                                                >
                                                    <Icon
                                                        f7={getStatusIconSales(order?.status)}
                                                        color={getStatusColorSales(order?.status)}
                                                        className="sales-order-status-icon font-bold"
                                                    />
                                                    <span className="sales-order-status-label font-small">
                                                        {getStatusTextSales(order?.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="order-item-details">
                                            <div className="detail-row">
                                                <span className="label font-medium">{t("Type")}</span>
                                                <span className="value font-medium">{order?.type}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="label font-medium">{t("Amount (RM)")}</span>
                                                <span className="value font-bold font-medium">
                                                    RM {Number(order?.amount).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )
                        ) : (
                            <div className="no-order-message">
                                <p>{t("No Record Found.")}</p>
                            </div>
                        )}
                    </div>

                    {!isManager && orders.length > 0 && (
                        <div className="summary-container">
                            <div className="summary-row">
                                <span className="summary-label font-bold">{t("Total")}</span>
                                <span className="summary-amount font-bold">
                                    RM {Number(summary?.total_amount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {orders.length > 0 && (
                        <div className="pagination-container">
                            <button
                                type="button"
                                className={`pagination-button ${currentPage === 1 ? "disabled" : ""}`}
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                            >
                                <Icon f7="chevron_left" className="font-bold" />
                            </button>
                            <span className="pagination-info font-small">
                                {currentPage} {t("of")} {totalPages}
                            </span>
                            <button
                                type="button"
                                className={`pagination-button ${currentPage === totalPages ? "disabled" : ""}`}
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                            >
                                <Icon f7="chevron_right" className="font-bold" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isManager && (
                <>
                    <Popup
                        className="payment-details-popup"
                        opened={isDetailsPopupOpen}
                        onPopupClosed={handleCloseDetails}
                        backdrop
                        closeByBackdropClick
                    >
                        <Page>
                            <div className="popup-content">
                                <div className="popup-header">
                                    <h3>{t("Order Details")}</h3>
                                    <div className="close-btn" onClick={() => handleCloseDetails()}>
                                        <Icon f7="xmark" />
                                    </div>
                                </div>
                                <div className="popup-body">
                                    {selectedOrder && (
                                        <>
                                            <div className="detail-section">
                                                <h4>{t("Order Information")}</h4>
                                                <div className="detail-row">
                                                    <span className="label">{t("Order ID")}</span>
                                                    <span className="value">{selectedOrder.unique_key}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label">{t("Type")}</span>
                                                    <span className="value">{selectedOrder.type}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label">{t("Date")}</span>
                                                    <span className="value">{selectedOrder.date}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label">{t("Mummy")}</span>
                                                    <span className="value">{selectedOrder.mummy_name}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label">{t("Staff")}</span>
                                                    <span className="value">{selectedOrder.staff_name}</span>
                                                </div>
                                            </div>

                                            <div className="detail-section">
                                                <h4>{t("Payment Information")}</h4>
                                                {Array.isArray(selectedOrder.payments) &&
                                                    selectedOrder.payments.length > 0 ? (
                                                    selectedOrder.payments.map((p, i) => (
                                                        <div key={p.id != null ? p.id : i} className="detail-row">
                                                            <span className="label">{p.name || t("Payment")}</span>
                                                            <span className="value">
                                                                RM {Number(p.amount ?? 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="detail-row">
                                                        <span className="label">{t("Amount")}</span>
                                                        <span className="value">
                                                            RM {Number(selectedOrder.amount ?? 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="detail-row">
                                                    <span className="label">{t("Handle Fee")}</span>
                                                    <span className="value">
                                                        RM {Number(selectedOrder.handle_fee || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="total-row">
                                                <span className="total-label">{t("Total Amount")}</span>
                                                <span className="total-amount">
                                                    RM {Number(selectedOrder.amount).toFixed(2)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Page>
                    </Popup>

                    <Tools
                        type="toast"
                        active={isRejectPopupOpen}
                        data={{
                            title: t("Reject Order"),
                            message: t("Are you sure you want to reject this order?"),
                            confirmText: t("Confirm"),
                            cancelText: t("Cancel"),
                        }}
                        onConfirm={handleConfirmReject}
                        onCancel={handleCancelReject}
                        onToastClose={handleCancelReject}
                    />

                    <Tools
                        type="toast"
                        active={isPrinterPromptOpen}
                        data={{
                            title: t("Printer not connected"),
                            message: t("Please connect your printer in Printer Settings."),
                            confirmText: t("Go to Printer Settings"),
                            cancelText: t("Cancel"),
                            showCloseButton: false,
                        }}
                        onConfirm={handleGoToPrinterSettings}
                        onCancel={handleClosePrinterPrompt}
                        onToastClose={handleClosePrinterPrompt}
                    />
                </>
            )}
        </Page>
    );
};

export default SalesPage;
