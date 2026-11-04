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

const MCRequestPage = () => {
    const { mc_lists, update_mc_status } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const [mcData, setMcData] = useState([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [form, setForm] = useState({
        private_key: env.private_key,
        status: 1,
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0]
    });

    const [formUpdate, setFormUpdate] = useState({
        private_key: env.private_key,
        id: "",
        status: "",
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

    const fetchMcRequests = async (form) => {
        f7.preloader.show();
        try {
            const response = await mc_lists(form);
            if (response.status) {
                setMcData(response.data);
            } else {
                setMcData([]);
            }
        } catch (error) {
            console.error("Error fetching MC requests:", error);
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
        fetchMcRequests(updatedForm);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        const updatedForm = {
            ...form,
            end_date: newEndDate,
        };
        setForm(updatedForm);
        fetchMcRequests(updatedForm);
    };

    const handleStatusChange = (e) => {
        const newStatus = parseInt(e.target.value);
        const updatedForm = {
            ...form,
            status: newStatus,
        };
        setForm(updatedForm);
        fetchMcRequests(updatedForm);
    };

    useEffect(() => {
        fetchMcRequests(form);
    }, []);

    const handleViewImage = (image) => {
        const imageUrl = image.startsWith('http') ? image : `${window.location.origin}${image}`;

        const photoBrowser = f7.photoBrowser.create({
            photos: [{
                url: imageUrl,
            }],
            type: 'popup',
            pageBackLinkText: t("Back"),
            theme: 'dark',
            navbar: true,
            toolbar: false,
            virtualSlides: false,
            closeByBackdropClick: false,
            on: {
                closed() {
                    photoBrowser.destroy();
                }
            }
        });

        photoBrowser.open();
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            f7.preloader.show();
            const updateData = {
                ...formUpdate,
                id,
                status,
            };
            const response = await update_mc_status(updateData);
            if (response.status) {
                f7.toast.show({
                    text: response.message,
                    position: 'center',
                    type: 'success',
                    closeTimeout: 1000,
                });
                fetchMcRequests(form);
            } else {
                f7.toast.show({
                    text: response.message,
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error updating MC status:", error);
            f7.toast.show({
                text: t("Error updating MC status"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            f7.preloader.hide();
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 1: return t("Pending");
            case 2: return t("Approved");
            case 3: return t("Rejected");
            default: return t("Unknown");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 1: return "pending";
            case 2: return "approved";
            case 3: return "rejected";
            default: return "unknown";
        }
    };

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

    return (
        <Page className="mc-request-page">
            <Header title={t("MC Request")} />
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
                                <option value={2}>{t("Approved")}</option>
                                <option value={3}>{t("Rejected")}</option>
                            </select>
                        </div>
                    </div>

                    {!startDate && !endDate && (
                        <div className="remark-message font-small text-justify">
                            {t("No date range selected. Showing records for today.")}
                        </div>
                    )}

                    <div className="mc-list-container">
                        {mcData.length > 0 ? (
                            mcData.map((mc) => (
                                <div key={mc?.id} className="mc-item">
                                    <div className="mc-item-header">
                                        <div className="mc-info">
                                            <div className="mc-date">
                                                <i className="icon f7-icons">calendar</i>
                                                <span>{formatDate(mc?.date)}</span>
                                            </div>
                                            <div className="mc-status">
                                                <span className={`font-bold status-badge status-${getStatusClass(mc?.status)}`}>
                                                    {getStatusText(mc?.status)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mc-actions">
                                            {mc.status === 1 && (
                                                <>
                                                    <button
                                                        className="action-btn approve-btn"
                                                        onClick={() => handleUpdateStatus(mc?.id, 2)}
                                                    >
                                                        <i className="icon f7-icons">checkmark</i>
                                                    </button>
                                                    <button
                                                        className="action-btn reject-btn"
                                                        onClick={() => handleUpdateStatus(mc?.id, 3)}
                                                    >
                                                        <i className="icon f7-icons">xmark</i>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mc-item-details">
                                        <div className="detail-row">
                                            <span className="label font-medium">{t("Name")}</span>
                                            <span className="value font-medium">{mc?.user?.name}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label font-medium">{t("Action Date")}</span>
                                            <span className="value font-medium">{formatActionDate(mc?.action_at)}</span>
                                        </div>
                                        <div className="view-proof-row text-left">
                                            <div className="view-proof-btn font-bold underline" onClick={() => handleViewImage(mc.image_path)}>
                                                {t("View Proof")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-mc-message">
                                <p>{t("No MC requests at the moment")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default MCRequestPage;
