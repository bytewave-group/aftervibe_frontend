import React, { useState, useEffect } from "react";
import {
    Page,
    f7,
    Input
} from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import { Preferences } from "@capacitor/preferences";
import useAuthenticate from "../actions/Authenticate";
import env from "../../environment.json";

const HandOverPage = () => {
    const { hand_over_account_list /* , update_hand_over_account */ } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const [handOverData, setHandOverData] = useState([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [form, setForm] = useState({
        private_key: env.private_key,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        status: 2,
    });

    // const [formUpdate, setFormUpdate] = useState({
    //     private_key: env.private_key,
    //     id: "",
    //     status: "",
    // });

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

    const fetchHandOverList = async (form) => {
        f7.preloader.show();
        try {
            const response = await hand_over_account_list(form);
            if (response.status) {
                setHandOverData(response.data || []);
            } else {
                setHandOverData([]);
            }
        } catch (error) {
            console.error("Error fetching hand over list:", error);
            setHandOverData([]);
        } finally {
            f7.preloader.hide();
        }
    };

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        const updatedForm = {
            ...form,
            start_date: newStartDate,
        };
        setForm(updatedForm);
        fetchHandOverList(updatedForm);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        const updatedForm = {
            ...form,
            end_date: newEndDate,
        };
        setForm(updatedForm);
        fetchHandOverList(updatedForm);
    };

    const handleStatusChange = (e) => {
        const newStatus = parseInt(e.target.value);
        const updatedForm = {
            ...form,
            status: newStatus,
        };
        setForm(updatedForm);
        fetchHandOverList(updatedForm);
    };

    useEffect(() => {
        fetchHandOverList(form);
    }, []);

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

    const getStatusText = (status) => {
        switch (status) {
            case 1: return t("Pending");
            case 2: return t("Completed") || "Completed";
            case 3: return t("Rejected") || "Rejected";
            default: return t("Unknown");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 1: return "pending";
            case 2: return "completed";
            case 3: return "rejected";
            default: return "unknown";
        }
    };

    // const handleUpdateStatus = async (id, status) => {
    //     f7.preloader.show();
    //     try {
    //         const updateData = {
    //             ...formUpdate,
    //             id,
    //             status
    //         };
    //         const response = await update_hand_over_account(updateData);
    //         if (response.status) {
    //             f7.toast.show({
    //                 text: response.message,
    //                 position: 'center',
    //                 type: 'success',
    //                 closeTimeout: 2000,
    //             });
    //             await fetchHandOverList(form);
    //             setHandOverData(prevData =>
    //                 prevData.map(item =>
    //                     item.id === id ? { ...item, status } : item
    //                 )
    //             );
    //         } else {
    //             f7.toast.show({
    //                 text: response.message,
    //                 position: 'center',
    //                 type: 'error',
    //                 closeTimeout: 2000,
    //             });
    //         }
    //     } catch (error) {
    //         console.error("Error updating hand over:", error);
    //         f7.toast.show({
    //             text: t("Error updating hand over status"),
    //             position: 'center',
    //             type: 'error',
    //             closeTimeout: 2000,
    //         });
    //     } finally {
    //         f7.preloader.hide();
    //     }
    // };

    return (
        <Page className="hand-over-page">
            <Header title={t("Hand Over List")} />
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
                                <option value={2}>{t("Completed")}</option>
                                <option value={3}>{t("Rejected")}</option>
                            </select>
                        </div>
                    </div>

                    {!startDate && !endDate && (
                        <div className="remark-message font-small text-justify">
                            {t("No date range selected. Showing records for today.")}
                        </div>
                    )}

                    <div className="hand-over-list-container">
                        {handOverData.length > 0 ? (
                            handOverData.map((handOver, index) => (
                                <div key={handOver?.unique_key ?? `${handOver?.id}-${index}`} className="hand-over-item">
                                    <div className="hand-over-item-header">
                                        <div className="hand-over-info">
                                            <div className="hand-over-date">
                                                <i className="icon f7-icons">calendar</i>
                                                <span>{formatDate(handOver?.date)}</span>
                                            </div>
                                            <div className="hand-over-status">
                                                <span className={`font-bold status-badge status-${getStatusClass(handOver?.status)}`}>
                                                    {getStatusText(handOver?.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="hand-over-actions">
                                            {/* {handOver.status === 1 && (
                                                <>
                                                    <button
                                                        className="action-btn approve-btn"
                                                        onClick={() => handleUpdateStatus(handOver?.id, 2)}
                                                    >
                                                        <i className="icon f7-icons">checkmark</i>
                                                    </button>
                                                    <button
                                                        className="action-btn reject-btn"
                                                        onClick={() => handleUpdateStatus(handOver?.id, 3)}
                                                    >
                                                        <i className="icon f7-icons">xmark</i>
                                                    </button>
                                                </>
                                            )} */}
                                        </div>
                                    </div>
                                    <div className="hand-over-item-details">
                                        <div className="detail-row">
                                            <span className="label font-medium">{t("Action By")}</span>
                                            <span className="value font-medium">
                                                {handOver?.action_by || handOver?.mummy?.name || "-"}
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label font-medium">{t("Payment Source")}</span>
                                            <span className="value font-medium">
                                                {handOver?.payment_source || "-"}
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label font-medium">{t("Amount")}</span>
                                            <span className="value font-medium">RM {Number(handOver?.total).toFixed(2)}</span>
                                        </div>
                                        <div className="hand-over-payments-block">
                                            <span className="label font-medium hand-over-payments-label">
                                                {t("Payment methods")}
                                            </span>
                                            {Array.isArray(handOver?.payment_method_details) &&
                                            handOver.payment_method_details.length > 0 ? (
                                                <div className="hand-over-payments-list">
                                                    {handOver.payment_method_details.map((payment, pmIndex) => (
                                                        <div key={pmIndex} className="hand-over-payment-item">
                                                            <span className="hand-over-payment-method font-medium">
                                                                {t(payment?.payment_method_name || "—")}
                                                            </span>
                                                            <span className="hand-over-payment-amount font-medium">
                                                                RM {Number(payment?.amount).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="hand-over-payments-empty font-medium">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-hand-over-message">
                                <p>{t("No hand over records at the moment")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default HandOverPage;