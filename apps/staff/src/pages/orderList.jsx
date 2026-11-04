import React, { useState, useEffect } from "react";
import { Page, f7, Input, Icon } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import env from "../../environment.json";

const STATUS_OPTIONS = [
    { value: "", labelKey: "All" },
    { value: "1", labelKey: "Pending" },
    { value: "2", labelKey: "Completed" },
    { value: "3", labelKey: "Cancelled" },
];

const VALID_TYPES = ["ktv", "buyout", "product"];
/** API type: ktv=1, buyout=3, product=5 */
const TYPE_TO_API = { ktv: 1, buyout: 3, product: 6 };

const OrderListPage = () => {
    const { t, i18n } = useTranslation();
    const { order_lists } = useAuthenticate();
    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [form, setForm] = useState({
        private_key: env.private_key,
        type: "ktv",
        start_date: today,
        end_date: today,
        status: "",
    });
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            const newLanguage = event.detail;
            i18n.changeLanguage(newLanguage);
        };
        window.addEventListener("languageChanged", handleLanguageChange);
        return () => window.removeEventListener("languageChanged", handleLanguageChange);
    }, [i18n]);

    /* Get type from URL query and set form, then fetch */
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const typeParam = (urlParams.get("type") || "ktv").toLowerCase();
        const resolvedType = VALID_TYPES.includes(typeParam) ? typeParam : "ktv";

        const initialForm = {
            private_key: env.private_key,
            type: resolvedType,
            start_date: today,
            end_date: today,
            status: "",
        };

        setForm((prevForm) => ({
            ...prevForm,
            ...initialForm,
        }));

        fetchOrderLists(initialForm);
    }, []);

    const fetchOrderLists = async (formToUse) => {
        const payload = formToUse || form;
        f7.preloader.show();
        try {
            const body = {
                private_key: payload.private_key,
                type: TYPE_TO_API[payload.type] ?? 1,
                start_date: payload.start_date || undefined,
                end_date: payload.end_date || undefined,
            };
            if (payload.status !== "") {
                body.status = parseInt(payload.status, 10);
            }
            const response = await order_lists(body);
            if (response.status && response.data) {
                const list = Array.isArray(response.data) ? response.data : response.data.data || [];
                setOrders(list);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error("Error fetching order lists:", error);
            setOrders([]);
        } finally {
            f7.preloader.hide();
        }
    };

    const handleStartDateChange = (e) => {
        const val = e.target.value;
        setStartDate(val);
        const updatedForm = { ...form, start_date: val };
        setForm(updatedForm);
        fetchOrderLists(updatedForm);
    };

    const handleEndDateChange = (e) => {
        const val = e.target.value;
        setEndDate(val);
        const updatedForm = { ...form, end_date: val };
        setForm(updatedForm);
        fetchOrderLists(updatedForm);
    };

    const handleStatusChange = (e) => {
        const val = e.target.value;
        const updatedForm = { ...form, status: val };
        setForm(updatedForm);
        fetchOrderLists(updatedForm);
    };

    const formatTime12Hour = (dateTimeString) => {
        if (!dateTimeString) return "";
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getStatusClass = (status) => {
        if (status === undefined || status === null) return "unknown";
        const s = parseInt(status, 10);
        switch (s) {
            case 1: return "pending";
            case 2: return "completed";
            case 3: return "cancelled";
            default: return "unknown";
        }
    };

    const getStatusText = (status) => {
        if (status === undefined || status === null) return t("Unknown");
        const s = parseInt(status, 10);
        switch (s) {
            case 1: return t("Pending");
            case 2: return t("Completed");
            case 3: return t("Cancelled");
            default: return t("Unknown");
        }
    };

    const orderTypeLabel = form.type
        ? form.type === "ktv"
            ? t("KTV")
            : form.type === "buyout"
                ? t("Buyout")
                : form.type === "product"
                    ? t("Product")
                    : t("Unknown")
        : t("KTV");
    const pageTitle = `${t("Order List")} (${orderTypeLabel})`;

    return (
        <Page className="order-list-page">
            <Header title={pageTitle} />
            <div className="content-panel">
                <div className="content">
                    <div className="date-picker-container">
                        <div className="start-date-container">
                            <label htmlFor="order-list-start-date" className="form-label">
                                {t("Start Date")}
                            </label>
                            <div className="form-input-container">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    id="order-list-start-date"
                                    className="form-input date-picker"
                                />
                            </div>
                        </div>
                        <div className="end-date-container">
                            <label htmlFor="order-list-end-date" className="form-label">
                                {t("End Date")}
                            </label>
                            <div className="form-input-container">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    id="order-list-end-date"
                                    className="form-input date-picker"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filters-container">
                        <div className="status-filter-container">
                            <label htmlFor="order-list-status-filter" className="form-label">
                                {t("Status")}
                            </label>
                            <div className="form-input-container">
                                <select
                                    id="order-list-status-filter"
                                    value={form.status}
                                    onChange={handleStatusChange}
                                    className="status-select"
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value || "all"} value={opt.value}>
                                            {t(opt.labelKey)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="order-list-container">
                        {orders.length > 0 ? (
                            orders.map((order, idx) => (
                                <div key={order.id != null ? order.id : idx} className="order-item">
                                    <div className="order-item-header">
                                        <div className="order-info">
                                            <div className="order-date-time">
                                                <div className="order-date">
                                                    <Icon f7="calendar" />
                                                    <span className="font-medium">{order?.date || order?.action_at?.split?.(" ")?.[0] || "—"}</span>
                                                </div>
                                                <div className="order-time font-medium">
                                                    {formatTime12Hour(order?.action_at || order?.created_at)}
                                                </div>
                                            </div>
                                            <div className="order-status">
                                                <span className={`font-bold status-badge status-${getStatusClass(order?.status)}`}>
                                                    {getStatusText(order?.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="order-item-details">
                                        <div className="detail-row">
                                            <span className="label font-medium font-bold">{t("Staff")}</span>
                                            <span className="value font-medium">{order?.staff?.name ?? "-"}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label font-medium font-bold">{t("Amount")}</span>
                                            <span className="value font-medium font-bold">RM {Number(order?.amount ?? 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-order-message">
                                <p>{t("No Record Found.")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default OrderListPage;
