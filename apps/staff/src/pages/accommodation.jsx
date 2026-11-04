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

const AccommodationPage = () => {
    const { staff_lists, staff_accommodation_lists, update_staff_accommodation } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [form, setForm] = useState({
        private_key: env.private_key,
        staff_id: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
    });
    const [staffList, setStaffList] = useState([]);
    const [accommodationList, setAccommodationList] = useState([]);
    const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
    const [staffFilter, setStaffFilter] = useState("");

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
        fetchStaffList();
    }, []);

    const fetchStaffList = async () => {
        try {
            f7.preloader.show();
            const response = await staff_lists({ private_key: env.private_key });
            if (response.status && response.data && response.data.length > 0) {
                setStaffList(response.data);
                const firstStaff = response.data[0];
                setForm(prevForm => ({
                    ...prevForm,
                    staff_id: firstStaff.id
                }));
                await fetchAccommodationList(firstStaff.id);
            }
        } catch (error) {
            console.error("Error fetching staff list:", error);
            setStaffList([]);
        } finally {
            f7.preloader.hide();
        }
    };

    const fetchAccommodationList = async (staffId, startDateOverride = null, endDateOverride = null) => {
        if (!staffId) {
            setAccommodationList([]);
            return;
        }

        try {
            f7.preloader.show();
            const accommodationForm = {
                private_key: env.private_key,
                staff_id: staffId,
                start_date: startDateOverride || form.start_date,
                end_date: endDateOverride || form.end_date,
            };
            const response = await staff_accommodation_lists(accommodationForm);
            if (response.status) {
                setAccommodationList(response.data || []);
            } else {
                setAccommodationList([]);
            }
        } catch (error) {
            console.error("Error fetching accommodation list:", error);
            setAccommodationList([]);
        } finally {
            f7.preloader.hide();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (staffDropdownOpen && !event.target.closest('.staff-custom-dropdown')) {
                setStaffDropdownOpen(false);
            }
        };

        if (staffDropdownOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [staffDropdownOpen]);

    const handleStaffChange = (staffId) => {
        setForm(prevForm => ({
            ...prevForm,
            staff_id: staffId
        }));
        setStaffDropdownOpen(false);
        setStaffFilter("");
        if (staffId) {
            fetchAccommodationList(staffId);
        } else {
            setAccommodationList([]);
        }
    };

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        let newEndDate = endDate;
        if (newStartDate && endDate && newStartDate > endDate) {
            newEndDate = newStartDate;
            setEndDate(newEndDate);
        }
        const updatedForm = {
            ...form,
            start_date: newStartDate,
            end_date: newEndDate,
        };
        setForm(updatedForm);
        if (updatedForm.staff_id) {
            fetchAccommodationList(updatedForm.staff_id, newStartDate, newEndDate);
        }
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        const updatedForm = {
            ...form,
            end_date: newEndDate,
        };
        setForm(updatedForm);
        if (updatedForm.staff_id) {
            fetchAccommodationList(updatedForm.staff_id, updatedForm.start_date, newEndDate);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        if (!status) return "unknown";
        // Handle both numeric and string statuses
        if (typeof status === 'number') {
            if (status == 1) return "cancelled";
            if (status == 2) return "completed";
        }
        const statusLower = status.toLowerCase();
        if (statusLower === "completed" || statusLower === "2") return "completed";
        if (statusLower === "cancelled" || statusLower === "1") return "cancelled";
        return "unknown";
    };

    const getStatusValue = (status) => {
        if (!status) return 0;
        // Handle numeric status
        if (typeof status === 'number') {
            return status;
        }
        // Handle string status
        const statusLower = status.toLowerCase();
        if (statusLower === "completed" || statusLower === "2") return 2;
        if (statusLower === "cancelled" || statusLower === "1") return 1;
        return 0;
    };

    const isCompleted = (status) => {
        return getStatusValue(status) === 2;
    };

    const getStatusString = (status) => {
        const statusValue = getStatusValue(status);
        if (statusValue == 1) return t("Cancelled");
        if (statusValue == 2) return t("Completed");
        return "-";
    };

    const handleUpdateStatus = async (accommodationId, status) => {
        if (!accommodationId || !form.staff_id) return;

        try {
            f7.preloader.show();
            const updateData = {
                private_key: env.private_key,
                accommodation_id: accommodationId,
                status: status,
            };
            const response = await update_staff_accommodation(updateData);
            if (response.status) {
                f7.toast.show({
                    text: response.message || t("Status updated successfully"),
                    position: 'center',
                    type: 'success',
                    closeTimeout: 2000,
                });
                // Refresh the accommodation list
                await fetchAccommodationList(form.staff_id);
            } else {
                f7.toast.show({
                    text: response.message || t("Failed to update status"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error updating accommodation status:", error);
            f7.toast.show({
                text: t("An error occurred while updating status"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            f7.preloader.hide();
        }
    };

    const toggleStaffDropdown = () => {
        setStaffDropdownOpen(!staffDropdownOpen);
        if (!staffDropdownOpen) {
            setStaffFilter("");
        }
    };

    const handleStaffFilterChange = (e) => {
        setStaffFilter(e.target.value);
    };

    const selectedStaff = staffList.find(staff => staff.id === form.staff_id);
    const filteredStaffList = staffList.filter((staff) => {
        const staffName = (staff.name || staff.staff_name || `Staff ${staff.id}`).toLowerCase();
        return staffName.includes(staffFilter.toLowerCase());
    });

    return (
        <Page className="accommodation-page">
            <Header title={t("Accommodation")} />
            <div className="content-panel">
                <div className="content">
                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Staff")}</span>
                        <div className="form-input-container font-medium">
                            <div className="staff-custom-dropdown">
                                <div
                                    className="selected-staff"
                                    onClick={() => toggleStaffDropdown()}
                                >
                                    {selectedStaff ? (
                                        <>
                                            <span>{selectedStaff.name || selectedStaff.staff_name || `Staff ${selectedStaff.id}`}</span>
                                        </>
                                    ) : (
                                        <span>{t("Select Staff")}</span>
                                    )}
                                    <i className="f7-icons font-medium">chevron_down</i>
                                </div>
                                {staffDropdownOpen && (
                                    <div className="staff-dropdown-options">
                                        <div className="staff-search-container">
                                            <Input
                                                type="text"
                                                value={staffFilter}
                                                onChange={handleStaffFilterChange}
                                                placeholder={t("Search staff...")}
                                                className="staff-search-input"
                                                clearButton
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="staff-options-list">
                                            {filteredStaffList.length > 0 ? (
                                                <>
                                                    <div
                                                        className="staff-dropdown-option"
                                                        onClick={() => handleStaffChange("")}
                                                    >
                                                        <span>{t("Clear Selection")}</span>
                                                    </div>
                                                    {filteredStaffList.map((staff) => (
                                                        <div
                                                            key={staff.id}
                                                            className={`staff-dropdown-option ${form.staff_id === staff.id ? 'selected' : ''}`}
                                                            onClick={() => handleStaffChange(staff.id)}
                                                        >
                                                            <div className="staff-image-container">
                                                                {staff.profile_image ? (
                                                                    <img src={staff.profile_image} alt={staff.name || staff.staff_name} />
                                                                ) : (
                                                                    <i className="f7-icons">person</i>
                                                                )}
                                                            </div>
                                                            <span>{staff.name || staff.staff_name || `Staff ${staff.id}`}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div className="staff-dropdown-option no-results">
                                                    <span>{t("No staff found")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {form.staff_id && (
                        <>
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
                                            min={startDate}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="accommodation-list-container">
                                {accommodationList.length > 0 ? (
                                    accommodationList.map((accommodation) => (
                                        <div key={accommodation?.id} className="accommodation-item">
                                            <div className="accommodation-item-header">
                                                <div className="accommodation-info">
                                                    <div className="accommodation-date">
                                                        <i className="icon f7-icons">calendar</i>
                                                        <span className="font-medium font-bold">{formatDate(accommodation?.date)}</span>
                                                    </div>
                                                    <div className="accommodation-status">
                                                        <span className={`font-bold status-badge status-${getStatusClass(accommodation?.status)}`}>
                                                            {getStatusString(accommodation?.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="accommodation-actions">
                                                    {isCompleted(accommodation?.status) && (
                                                        <button
                                                            className="action-btn cancel-btn"
                                                            onClick={() => handleUpdateStatus(accommodation?.id, 1)}
                                                            title={t("Cancel")}
                                                        >
                                                            <i className="icon f7-icons">xmark</i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="accommodation-item-details">
                                                <div className="detail-row">
                                                    <span className="label font-medium">{t("Fee")}</span>
                                                    <span className="value font-medium font-bold">RM {Number(accommodation?.fee || 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-accommodation-message">
                                        <i className="icon f7-icons">home</i>
                                        <p className="font-medium">{t("No accommodation records found")}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default AccommodationPage;