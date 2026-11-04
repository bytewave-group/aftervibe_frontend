import React, { useState, useEffect } from "react";
import {
    Page,
    f7,
    Input
} from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import { Preferences } from "@capacitor/preferences";
import { loadUser } from "../components/action/preferences";
import useAuthenticate from "../actions/Authenticate";
import env from "../../environment.json";

const MCHistoryPage = () => {
    const { t, i18n } = useTranslation();
    const { mc_lists } = useAuthenticate();
    const [language, setLanguage] = useState("en");
    const [user, setUser] = useState(null);
    const [mcHistoryData, setMcHistoryData] = useState([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const [form, setForm] = useState({
        private_key: env.private_key,
        type: "staff",
        id: null,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        status: ''
    });

    useEffect(() => {
        const loadUserData = async () => {
            const userData = await loadUser();
            if (userData) {
                setUser(userData);
                setForm(prev => ({
                    ...prev,
                    id: userData.id
                }));
            }
        };
        loadUserData();
    }, []);

    useEffect(() => {
        const initializeLanguage = async () => {
            try {
                const { value: savedLanguage } = await Preferences.get({ key: "selected_language" });
                const initialLanguage = savedLanguage || "en";
                setLanguage(initialLanguage);
                i18n.changeLanguage(initialLanguage);
            } catch (error) {
                console.error("Error initializing language:", error);
                setLanguage("en");
                i18n.changeLanguage("en");
            }
        };

        initializeLanguage();
    }, [i18n]);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            const newLanguage = event.detail;
            setLanguage(newLanguage);
            i18n.changeLanguage(newLanguage);
        };

        window.addEventListener('languageChanged', handleLanguageChange);

        return () => {
            window.removeEventListener('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    const fetchMCList = async (formData) => {
        f7.preloader.show();
        try {
            const res = await mc_lists(formData);
            if (res.status && res.data) {
                setMcHistoryData(res.data);
            }
        } catch (error) {
            console.error('Error fetching MC list:', error);
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
        fetchMCList(updatedForm);
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        const updatedForm = {
            ...form,
            end_date: newEndDate,
        };
        setForm(updatedForm);
        fetchMCList(updatedForm);
    };

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        const updatedForm = {
            ...form,
            status: newStatus,
        };
        setForm(updatedForm);
        fetchMCList(updatedForm);
    };

    useEffect(() => {
        if (user?.id && form.id) {
            fetchMCList(form);
        }
    }, [user, form.id]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const locale = language === 'cn' ? 'zh-CN' :
            language === 'thai' ? 'th-TH' :
                language === 'viet' ? 'vi-VN' : 'en-GB';

        return date.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusText = (status) => {
        switch (status) {
            case 1:
                return t("Pending");
            case 2:
                return t("Approved");
            case 3:
                return t("Rejected");
            default:
                return t("Pending");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 1:
                return "pending";
            case 2:
                return "approved";
            case 3:
                return "rejected";
            default:
                return "pending";
        }
    };

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

    return (
        <Page className="mc-history-page">
            <Header title={t("MC History")} />
            <div className="content-panel">
                <div className="content">
                    <div className="filter-section">
                        <div className="date-filters">
                            <div className="date-input">
                                <label>{t("Start Date")}</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    max={endDate}
                                />
                            </div>
                            <div className="date-input">
                                <label>{t("End Date")}</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    min={startDate}
                                />
                            </div>
                        </div>
                        <div className="status-filter">
                            <label>{t("Status")}</label>
                            <select
                                value={form.status}
                                onChange={handleStatusChange}
                            >
                                <option value="">{t("All")}</option>
                                <option value="1">{t("Pending")}</option>
                                <option value="2">{t("Approved")}</option>
                                <option value="3">{t("Rejected")}</option>
                            </select>
                        </div>
                    </div>

                    {!startDate && !endDate && (
                        <div className="remark-message font-medium text-justify">
                            {t("*No date range selected. Showing records for today.")}
                        </div>
                    )}

                    <div className="mc-history-container">
                        {mcHistoryData.length > 0 ? (
                            mcHistoryData.map((item) => (
                                <div key={item?.id} className="mc-history-item">
                                    <div className="left-container">
                                        <div className="mc-history-item-date">
                                            <div className="date-title font-medium font-bold">{t("Upload Date")} :</div>
                                            <span className="date-text font-medium">{formatDate(item?.date)}</span>
                                        </div>
                                        <div className={`mc-history-item-status font-medium font-bold ${getStatusClass(item?.status)}`}>
                                            {getStatusText(item?.status)}
                                        </div>
                                    </div>
                                    <div className="right-container">
                                        <div className="view-image-button" onClick={() => handleViewImage(item?.image_path)}>
                                            <i className="f7-icons font-large">eye</i>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-mc-message">
                                <p>{t("No MC history found")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default MCHistoryPage;