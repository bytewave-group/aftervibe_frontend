import React from 'react';
import { Page, f7, Input } from 'framework7-react';
import Header from '../components/header';
import useAuthenticate from '../actions/Authenticate';
import { useTranslation } from '../services/useTranslation';
import env from '../../environment.json';
import { useState, useEffect } from 'react';


const FlowerMovementPage = () => {
    const { t, i18n } = useTranslation();
    const { flower_movement_lists } = useAuthenticate();
    const [flowerMovementLists, setFlowerMovementLists] = useState([]);
    const [flowerMovementSummary, setFlowerMovementSummary] = useState([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [form, setForm] = useState({
        private_key: env.private_key,
        type: 2,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
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
        fetchFlowerMovementLists();
    }, []);

    const normalizeFlowerMovementPayload = (payload) => {
        if (Array.isArray(payload)) {
            return { list: payload, summary: [] };
        }
        if (payload && typeof payload === "object") {
            return {
                list: Array.isArray(payload.result) ? payload.result : [],
                summary: Array.isArray(payload.summary) ? payload.summary : [],
            };
        }
        return { list: [], summary: [] };
    };

    const fetchFlowerMovementLists = async (formData = form) => {
        try {
            f7.preloader.show();
            const res = await flower_movement_lists(formData);
            if (res.status) {
                const { list, summary } = normalizeFlowerMovementPayload(res.data);
                setFlowerMovementLists(list);
                setFlowerMovementSummary(summary);
                f7.preloader.hide();
            } else {
                f7.toast.show({
                    text: res.message,
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                setFlowerMovementLists([]);
                setFlowerMovementSummary([]);
                f7.preloader.hide();
            }
        } catch (error) {
            f7.preloader.hide();
            console.error("Error fetching flower movement lists:", error);
            setFlowerMovementLists([]);
            setFlowerMovementSummary([]);
        } finally {
            f7.preloader.hide();
        }
    };

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        const updatedForm = {
            ...form,
            start_date: newStartDate,
        };
        setStartDate(newStartDate);
        setForm(updatedForm);
        fetchFlowerMovementLists(updatedForm);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        const updatedForm = {
            ...form,
            end_date: newEndDate,
        };
        setEndDate(newEndDate);
        setForm(updatedForm);
        fetchFlowerMovementLists(updatedForm);
    };

    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirm':
            case 'confirmed':
                return "status-confirmed";
            case 'pending':
                return "status-pending";
            case 'cancel':
            case 'cancelled':
                return "status-cancelled";
            default:
                return "status-pending";
        }
    };

    const formatAmount = (amount) => {
        return parseFloat(amount || 0).toFixed(2);
    };

    const getMovementTypeLabel = (type) => {
        if (type === "Return") return t("Return");
        if (type === "Buy") return t("Buy");
        if (type === "Claim" || type === "Sell") return t(type);
        return type ? t(type) : "-";
    };

    return (
        <Page className="flower-movement-page">
            <Header title={t("Flower Movement")} />
            <div className="content-panel">
                <div className="content">
                    <div className="date-picker-container">
                        <div className="start-date-container">
                            <label htmlFor="start-date">
                                {t("Start Date")}
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                                id="start-date"
                                className="date-picker"
                            />
                        </div>
                        <div className="end-date-container">
                            <label htmlFor="end-date">
                                {t("End Date")}
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={handleEndDateChange}
                                id="end-date"
                                className="date-picker"
                            />
                        </div>
                    </div>

                    {flowerMovementSummary.length > 0 && (
                        <div className="flower-movement-summary">
                            <div className="summary-header">
                                <i className="f7-icons summary-header-icon">chart_bar</i>
                                <span className="summary-header-title">{t("Summary")}</span>
                                <span className="summary-header-hint">{t("Period totals")}</span>
                            </div>
                            <div className="summary-body">
                                {flowerMovementSummary.map((row, index) => {
                                    const isBuy = row.type === "Buy";
                                    const isReturn = row.type === "Return";
                                    const isClaim = row.type === "Claim" || row.type === "Sell";
                                    const label = isReturn
                                        ? t("Return")
                                        : isBuy
                                            ? t("Buy")
                                            : isClaim
                                                ? t(row.type)
                                                : t(row.type || "");
                                    return (
                                        <div
                                            key={row.type}
                                            className={`summary-stat ${isBuy ? "money-out" : isReturn ? "money-return" : isClaim ? "money-in" : ""} ${index < flowerMovementSummary.length - 1 ? "has-divider" : ""}`}
                                        >
                                            <div className="summary-stat-main">
                                                <div className={`summary-stat-icon ${isBuy ? "icon-out" : isReturn ? "icon-return" : isClaim ? "icon-in" : ""}`}>
                                                    {isBuy && <i className="f7-icons">arrow_down_circle</i>}
                                                    {isClaim && <i className="f7-icons">arrow_up_circle</i>}
                                                    {isReturn && <i className="f7-icons">arrow_uturn_right_circle</i>}
                                                    {!isBuy && !isClaim && !isReturn && <i className="f7-icons">circle</i>}
                                                </div>
                                                <div className="summary-stat-text">
                                                    <span className="summary-stat-label">{label}</span>
                                                    <span className="summary-stat-sublabel">
                                                        {isBuy ? t("Total spent") : isReturn ? t("Total returned") : t("Total received")}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`summary-stat-value ${isBuy ? "amount-out" : isReturn ? "amount-return" : isClaim ? "amount-in" : ""}`}>
                                                {isBuy && <span className="amount-prefix">-</span>}
                                                {(isClaim || isReturn) && <span className="amount-prefix">+</span>}
                                                <span className="amount-num">RM {formatAmount(row.amount)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flower-movement-list">
                        {flowerMovementLists.length === 0 ? (
                            <div className="no-data text-center font-medium">
                                {t("No Flower Movements")}
                            </div>
                        ) : (
                            flowerMovementLists.map((movement) => {
                                const isMoneyOut = movement.type === "Buy";
                                const isMoneyIn = movement.type === "Claim" || movement.type === "Sell";
                                const isReturn = movement.type === "Return";

                                return (
                                    <div key={movement.id} className={`flower-movement-item ${isMoneyOut ? 'money-out' : isReturn ? 'money-return' : isMoneyIn ? 'money-in' : ''}`}>
                                        <div className="movement-main">
                                            <div className="movement-type">
                                                <div className={`type-indicator ${isMoneyOut ? 'indicator-out' : isReturn ? 'indicator-return' : isMoneyIn ? 'indicator-in' : ''}`}>
                                                    {isMoneyOut && <i className="f7-icons">arrow_down_circle</i>}
                                                    {isMoneyIn && <i className="f7-icons">arrow_up_circle</i>}
                                                    {isReturn && <i className="f7-icons">arrow_uturn_right_circle</i>}
                                                    {!isMoneyOut && !isMoneyIn && !isReturn && <i className="f7-icons">circle</i>}
                                                </div>
                                                <div className="type-text">
                                                    <div className={`type-label ${isMoneyOut ? "type-label-out" : isReturn ? "type-label-return" : isMoneyIn ? "type-label-in" : ""}`}>
                                                        {getMovementTypeLabel(movement.type)}
                                                    </div>
                                                    <div className="transaction-id white font-bold">
                                                        {movement.unique_key || `#${movement.id}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`movement-amount ${isMoneyOut ? 'amount-out' : isReturn ? 'amount-return' : isMoneyIn ? 'amount-in' : ''}`}>
                                                {isMoneyOut && <span className="amount-prefix">-</span>}
                                                {(isMoneyIn || isReturn) && <span className="amount-prefix">+</span>}
                                                <span className="amount-value">RM {formatAmount(movement.amount)}</span>
                                            </div>
                                        </div>

                                        <div className="movement-details">
                                            {/* <div className="detail-row">
                                                <span className="detail-label white">
                                                    <i className="f7-icons">creditcard</i>
                                                    <span className="font-bold">{t("Payment Method")}</span>
                                                </span>
                                                <span className="detail-value font-bold">{movement.payment_method || "-"}</span>
                                            </div> */}

                                            {movement.user_name && (
                                                <div className="detail-row">
                                                    <span className="detail-label white">
                                                        <i className="f7-icons">person</i>
                                                        <span className="font-bold">{t("User Name")}</span>
                                                    </span>
                                                    <span className="detail-value">{movement.user_name}</span>
                                                </div>
                                            )}

                                            {movement.manager?.name && (
                                                <div className="detail-row">
                                                    <span className="detail-label white">
                                                        <i className="f7-icons">person_badge</i>
                                                        <span className="font-bold">{t("Manager")}</span>
                                                    </span>
                                                    <span className="detail-value">{movement.manager.name}</span>
                                                </div>
                                            )}

                                            {movement.remark && (
                                                <div className="detail-row">
                                                    <span className="detail-label white">
                                                        <i className="f7-icons">text_bubble</i>
                                                        <span className="font-bold">{t("Remarks")}</span>
                                                    </span>
                                                    <span className="detail-value">{movement.remark}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="movement-footer">
                                            <div className={`movement-status-tag font-small font-bold ${getStatusClass(movement.status)}`}>
                                                {movement.status || t("pending")}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default FlowerMovementPage;