import React, { useState, useEffect, useRef } from "react";
import { Page, f7, Input, Button, Icon } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import { Preferences } from "@capacitor/preferences";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import env from "../../environment.json";
import Tools from '../components/tools';
import useCommon from '../components/action/Common';
import QrScanner from '../components/QrScanner';
import { buildConfirmationSlipReceipt, buildPaymentRows, apiOrderRef, printPosReceipt } from '../utils/androidReceiptPrinter';
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from '../constants/receiptStatus';
import { STAFF_WORK_TYPE } from '../constants/staffWorkType';

const ClaimFlowerPage = () => {
    const { staff_work_lists, mummy_lists, create_claim_flower_record_from_staff, verify_qr } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [staffList, setStaffList] = useState([]);
    const [mummyList, setMummyList] = useState([]);
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [selectedMummyId, setSelectedMummyId] = useState("");
    const [selectedGivenMummyId, setSelectedGivenMummyId] = useState("");
    const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
    const [mummyDropdownOpen, setMummyDropdownOpen] = useState(false);
    const [givenMummyDropdownOpen, setGivenMummyDropdownOpen] = useState(false);
    const [staffFilter, setStaffFilter] = useState("");
    const [mummyFilter, setMummyFilter] = useState("");
    const [givenMummyFilter, setGivenMummyFilter] = useState("");
    const [flowerAmount, setFlowerAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [showConfirmToast, setShowConfirmToast] = useState(false);
    const [confirmToastData, setConfirmToastData] = useState({});
    const [showAlertToast, setShowAlertToast] = useState(false);
    const [alertToastData, setAlertToastData] = useState({});
    const [claimForTab, setClaimForTab] = useState("staff"); // 'staff' | 'mummy'
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [scanType, setScanType] = useState(null); // 'staff' | 'mummy' | 'given_mummy'
    const isProcessingScanRef = useRef(false);
    const [form, setForm] = useState({
        staff_id: "",
        mummy_id: "",
        amount: "",
        remark: ""
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

    const showAlert = (message) => {
        setAlertToastData({
            title: t("Alert") || "Alert",
            message: message,
            buttonText: t("OK") || "OK"
        });
        setShowAlertToast(true);
    };

    useEffect(() => {
        const fetchLists = async () => {
            try {
                f7.preloader.show();
                // Fetch both lists in parallel
                const [staffResponse, mummyResponse] = await Promise.all([
                    staff_work_lists({ private_key: env.private_key, type: STAFF_WORK_TYPE.CLAIM_FLOWER }),
                    mummy_lists({ private_key: env.private_key })
                ]);

                // Handle staff list response
                if (staffResponse.status) {
                    setStaffList(staffResponse.data || []);
                } else {
                    setStaffList([]);
                    showAlert(staffResponse.message);
                }

                // Handle mummy list response
                if (mummyResponse.status) {
                    setMummyList(mummyResponse.data || []);
                } else {
                    setMummyList([]);
                    showAlert(mummyResponse.message);
                }
            } catch (error) {
                console.error("Error fetching lists:", error);
                setStaffList([]);
                setMummyList([]);
            } finally {
                f7.preloader.hide();
            }
        };
        fetchLists();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (staffDropdownOpen && !event.target.closest('.staff-custom-dropdown')) {
                setStaffDropdownOpen(false);
            }
            if (mummyDropdownOpen && !event.target.closest('.mummy-custom-dropdown')) {
                setMummyDropdownOpen(false);
            }
            if (givenMummyDropdownOpen && !event.target.closest('.given-mummy-custom-dropdown')) {
                setGivenMummyDropdownOpen(false);
            }
        };

        if (staffDropdownOpen || mummyDropdownOpen || givenMummyDropdownOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [staffDropdownOpen, mummyDropdownOpen, givenMummyDropdownOpen]);

    const handleStaffChange = (staffId) => {
        setSelectedStaffId(staffId);
        setStaffDropdownOpen(false);
        setStaffFilter("");
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

    const handleMummyChange = (mummyId) => {
        setSelectedMummyId(mummyId);
        setMummyDropdownOpen(false);
        setMummyFilter("");
    };

    const handleMummyFilterChange = (e) => {
        setMummyFilter(e.target.value);
    };

    const toggleMummyDropdown = () => {
        setMummyDropdownOpen(!mummyDropdownOpen);
        if (!mummyDropdownOpen) {
            setMummyFilter("");
        }
    };

    const handleGivenMummyChange = (mummyId) => {
        setSelectedGivenMummyId(mummyId);
        setGivenMummyDropdownOpen(false);
        setGivenMummyFilter("");
    };

    const handleGivenMummyFilterChange = (e) => {
        setGivenMummyFilter(e.target.value);
    };

    const toggleGivenMummyDropdown = () => {
        setGivenMummyDropdownOpen(!givenMummyDropdownOpen);
        if (!givenMummyDropdownOpen) {
            setGivenMummyFilter("");
        }
    };

    const filteredStaffList = staffList.filter((staff) => {
        const staffName = (staff.name || staff.staff_name || `Staff ${staff.id}`).toLowerCase();
        return staffName.includes(staffFilter.toLowerCase());
    });

    const filteredMummyList = mummyList.filter((mummy) => {
        const mummyName = (mummy.name || mummy.mummy_name || `Mummy ${mummy.id}`).toLowerCase();
        return mummyName.includes(mummyFilter.toLowerCase());
    });

    const filteredGivenMummyList = mummyList.filter((mummy) => {
        const mummyName = (mummy.name || mummy.mummy_name || `Mummy ${mummy.id}`).toLowerCase();
        return mummyName.includes(givenMummyFilter.toLowerCase());
    });

    const handleFlowerAmountChange = (e) => {
        const value = e.target.value;
        if (value === "" || value === ".") {
            setFlowerAmount(value);
            return;
        }
        const regex = /^\d*\.?\d{0,2}$/;
        if (regex.test(value)) {
            setFlowerAmount(value);
        }
    };

    const handleRemarkChange = (e) => {
        const value = e.target.value;
        setRemark(value);
    };

    const selectedStaff = staffList.find(staff => staff.id === selectedStaffId);
    const selectedMummy = mummyList.find(mummy => mummy.id.toString() === selectedMummyId.toString());
    const selectedGivenMummy = mummyList.find(mummy => mummy.id.toString() === selectedGivenMummyId.toString());

    const buildClaimFlowerReceiptText = (apiData, layout) => {
        const staffName = selectedStaff
            ? (selectedStaff.name || selectedStaff.staff_name || `Staff ${selectedStaff.id}`)
            : '';
        const mummyName = selectedMummy
            ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`)
            : '';
        const givenMummyName = selectedGivenMummy
            ? (selectedGivenMummy.name || selectedGivenMummy.mummy_name || `Mummy ${selectedGivenMummy.id}`)
            : '';
        const amt = parseFloat(flowerAmount) || 0;
        const partyRows = [];
        if (claimForTab === 'staff') {
            partyRows.push({ label: 'Mummy', value: givenMummyName });
            partyRows.push({ label: 'Staff', value: staffName });
        } else {
            partyRows.push({ label: 'Mummy', value: mummyName });
        }
        if (remark?.trim()) {
            partyRows.push({ label: 'Remarks', value: remark.trim() });
        }
        return buildConfirmationSlipReceipt({
            serviceName: 'Claim Flower',
            orderId: apiOrderRef(apiData),
            status: resolveReceiptStatusLabel(apiData, RECEIPT_STATUS_KIND.FLOWER_RECORD, { payLater: true }),
            partyRows,
            amount: amt,
            paymentRows: buildPaymentRows({ payLater: true, payments: null, handleFee: 0, paymentMethodsFromGlobal: [] }),
            payLater: true,
            layout,
        });
    };

    const handleCloseAlert = () => {
        setShowAlertToast(false);
    };

    const handleScanStaff = async () => {
        setScanType('staff');
        // Use html5-qrcode for all platforms (web, iOS, Android) to show overlay modal
        setShowQrScanner(true);
    };

    const handleScanMummy = async () => {
        setScanType('mummy');
        setShowQrScanner(true);
    };

    const handleScanGivenMummy = async () => {
        setScanType('given_mummy');
        setShowQrScanner(true);
    };

    const handleQrCodeScanned = async (qrCode, type) => {
        try {
            f7.preloader.show();
            // Handle both parsed objects and raw strings
            let qrData = qrCode;
            if (typeof qrCode === 'string') {
                try {
                    // Try to parse as base64 JSON
                    qrData = JSON.parse(atob(qrCode));
                } catch (e) {
                    // If that fails, try parsing as regular JSON
                    try {
                        qrData = JSON.parse(qrCode);
                    } catch (e2) {
                        // If all parsing fails, use the string as-is
                        qrData = qrCode;
                    }
                }
            }

            const verifyResponse = await verify_qr({
                qr: qrData,
                type: VERIFY_QR_TYPE.ORDER,
            });

            if (!verifyResponse.status) {
                f7.preloader.hide();
                if (type === 'staff') handleStaffChange("");
                else if (type === 'given_mummy') handleGivenMummyChange("");
                else handleMummyChange("");
                f7.toast.show({
                    text: verifyResponse.message || t("QR code verification failed"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            const responseData = verifyResponse.data;
            const expectedRole = type === 'staff' ? 'staff' : 'mummy';
            const role = (responseData && typeof responseData === 'object' && responseData.role) ? String(responseData.role).toLowerCase() : '';
            if (role !== expectedRole) {
                f7.preloader.hide();
                if (type === 'staff') handleStaffChange("");
                else if (type === 'given_mummy') handleGivenMummyChange("");
                else handleMummyChange("");
                f7.toast.show({
                    text: type === 'staff' ? t("Invalid QR code - staff only") : t("Invalid QR code - mummy only"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            let id = null;

            // Prefer ID from verified API response (QR may only contain token/base64)
            if (responseData && typeof responseData === 'object') {
                if (type === 'staff') {
                    id = responseData.id ?? responseData.staff_id ?? responseData.user_id;
                } else if (type === 'mummy' || type === 'given_mummy') {
                    id = responseData.id ?? responseData.mummy_id ?? responseData.user_id;
                }
            }

            // Fallback: parse ID from scanned QR content
            if (id == null && typeof qrData === 'object' && qrData !== null) {
                if (type === 'staff') {
                    id = qrData.id || qrData.staff_id || qrData.user_id;
                } else if (type === 'mummy' || type === 'given_mummy') {
                    id = qrData.id || qrData.mummy_id || qrData.user_id;
                }
            } else if (id == null && typeof qrData === 'number') {
                id = qrData;
            } else if (id == null && typeof qrData === 'string') {
                const parsed = parseInt(qrData);
                if (!isNaN(parsed)) {
                    id = parsed;
                }
            }

            if (id) {
                const numericId = typeof id === 'number' ? id : parseInt(id);

                if (type === 'staff') {
                    const foundStaff = staffList.find(staff =>
                        staff.id === numericId || staff.id.toString() === id.toString()
                    );

                    if (foundStaff) {
                        handleStaffChange(foundStaff.id);
                        f7.toast.show({
                            text: t("Staff selected successfully"),
                            position: 'center',
                            type: 'success',
                            closeTimeout: 2000,
                        });
                    } else {
                        handleStaffChange("");
                        f7.toast.show({
                            text: t("Staff not found in the list"),
                            position: 'center',
                            type: 'error',
                            closeTimeout: 2000,
                        });
                    }
                } else if (type === 'mummy' || type === 'given_mummy') {
                    const foundMummy = mummyList.find(mummy =>
                        mummy.id === numericId || mummy.id.toString() === id.toString()
                    );

                    if (foundMummy) {
                        const setMummy = type === 'given_mummy' ? handleGivenMummyChange : handleMummyChange;
                        setMummy(foundMummy.id.toString());
                        f7.toast.show({
                            text: t("Mummy selected successfully"),
                            position: 'center',
                            type: 'success',
                            closeTimeout: 2000,
                        });
                    } else {
                        const clearMummy = type === 'given_mummy' ? handleGivenMummyChange : handleMummyChange;
                        clearMummy("");
                        f7.toast.show({
                            text: t("Mummy not found in the list"),
                            position: 'center',
                            type: 'error',
                            closeTimeout: 2000,
                        });
                    }
                }
            } else {
                if (type === 'staff') handleStaffChange("");
                else if (type === 'given_mummy') handleGivenMummyChange("");
                else handleMummyChange("");
                f7.toast.show({
                    text: t("Invalid QR code format"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error processing QR code:", error);
            if (type === 'staff') handleStaffChange("");
            else if (type === 'given_mummy') handleGivenMummyChange("");
            else handleMummyChange("");
            f7.toast.show({
                text: t("Error processing QR code"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            isProcessingScanRef.current = false;
            f7.preloader.hide();
        }
    };

    const resetFormAndSelections = () => {
        setSelectedStaffId("");
        setSelectedMummyId("");
        setSelectedGivenMummyId("");
        setStaffFilter("");
        setMummyFilter("");
        setGivenMummyFilter("");
        setFlowerAmount("");
        setRemark("");
        setForm({ staff_id: "", mummy_id: "", amount: "", remark: "" });
        setStaffDropdownOpen(false);
        setMummyDropdownOpen(false);
        setGivenMummyDropdownOpen(false);
        setShowConfirmToast(false);
        setShowAlertToast(false);
    };

    const handleTabChange = (tab) => {
        if (tab === claimForTab) return;
        setClaimForTab(tab);
        resetFormAndSelections();
    };

    const handleSubmit = () => {
        if (claimForTab === "staff" && !selectedStaffId) {
            showAlert(t("Please select a staff"));
            return;
        }
        if (claimForTab === "staff" && !selectedGivenMummyId) {
            showAlert(t("Please select a mummy"));
            return;
        }
        if (claimForTab === "mummy" && !selectedMummyId) {
            showAlert(t("Please select a mummy"));
            return;
        }

        if (!flowerAmount || parseFloat(flowerAmount) <= 0) {
            showAlert(t("Please enter a valid flower amount"));
            return;
        }

        const staffName = selectedStaff ? (selectedStaff.name || selectedStaff.staff_name || `Staff ${selectedStaff.id}`) : "";
        const mummyName = selectedMummy ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`) : "";
        const givenMummyName = selectedGivenMummy ? (selectedGivenMummy.name || selectedGivenMummy.mummy_name || `Mummy ${selectedGivenMummy.id}`) : "";

        let confirmationMessage = `${t("Claim Details")}:\n`;
        if (claimForTab === "staff") {
            confirmationMessage += `${t("Staff")}: ${staffName}\n`;
            confirmationMessage += `${t("Mummy")}: ${givenMummyName}\n`;
        } else {
            confirmationMessage += `${t("Mummy")}: ${mummyName}\n`;
        }
        confirmationMessage += `${t("Flower Amount")}: ${flowerAmount}\n`;

        if (remark) {
            confirmationMessage += `${t("Remarks")}: ${remark}\n`;
        }

        confirmationMessage += `\n${t("Are you sure you want to submit this claim?")}`;

        // Set confirmation toast data
        setConfirmToastData({
            title: t("Confirm Claim"),
            message: confirmationMessage,
            confirmText: t("Confirm"),
            cancelText: t("Cancel")
        });
        setShowConfirmToast(true);
    };

    const handleConfirmClaim = async () => {
        setShowConfirmToast(false);

        const updatedForm = {
            staff_id: claimForTab === "staff" && selectedStaffId ? parseInt(selectedStaffId, 10) : null,
            mummy_id: claimForTab === "mummy" && selectedMummyId ? parseInt(selectedMummyId, 10) : null,
            given_mummy_id: claimForTab === "staff" && selectedGivenMummyId ? parseInt(selectedGivenMummyId, 10) : null,
            amount: parseFloat(flowerAmount),
            remark: remark || null
        };

        setForm(prev => ({
            ...prev,
            ...updatedForm
        }));

        // setForm(prev => ({
        //     ...prev,
        //     staff_id: parseInt(selectedStaffId),
        //     amount: parseFloat(flowerAmount),
        //     remark: remark
        // }));

        try {
            f7.preloader.show();
            const response = await create_claim_flower_record_from_staff(updatedForm);
            if (response.status) {
                void printPosReceipt((layout) => buildClaimFlowerReceiptText(response.data, layout));
                f7.toast.show({
                    text: response.message,
                    position: 'center',
                    type: 'success',
                    closeTimeout: 2000,
                });
                setTimeout(() => {
                    navigate(-1);
                }, 300);
            } else {
                f7.toast.show({
                    text: response.message,
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error creating claim flower record from staff:", error);
            f7.toast.show({
                text: t("An error occurred"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            f7.preloader.hide();
        }
    };

    const handleCancelConfirm = () => {
        setShowConfirmToast(false);
    };

    return (
        <Page className="claim-flower-page">
            <Header title={t("Claim Flower")} />
            <div className="content-panel">
                <div className="content">
                    <div className="claim-flower-tabs">
                        <button
                            type="button"
                            className={`claim-flower-tab-btn ${claimForTab === "staff" ? "active" : ""}`}
                            onClick={() => handleTabChange("staff")}
                        >
                            {t("Staff")}
                        </button>
                        <button
                            type="button"
                            className={`claim-flower-tab-btn ${claimForTab === "mummy" ? "active" : ""}`}
                            onClick={() => handleTabChange("mummy")}
                        >
                            {t("Mummy")}
                        </button>
                    </div>

                    {claimForTab === "staff" && (
                        <>
                            <div className="form-group">
                                <span className="form-label font-medium font-bold">{t("Staff")}</span>
                                <div className="form-input-container font-medium staff-input-with-scan">
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
                                                                <span>{t("Select Staff")}</span>
                                                            </div>
                                                            {filteredStaffList.map((staff) => (
                                                                <div
                                                                    key={staff.id}
                                                                    className={`staff-dropdown-option ${selectedStaffId === staff.id ? 'selected' : ''}`}
                                                                    onClick={() => handleStaffChange(staff.id)}
                                                                >
                                                                    {staff.profile_image && (
                                                                        <div className="staff-image-container">
                                                                            <img
                                                                                src={staff.profile_image}
                                                                                alt={staff.name || staff.staff_name}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <span>{staff.name || staff.staff_name || `Staff ${staff.id}`}</span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="staff-dropdown-option no-results">
                                                            <span>{t("No results found")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        className="scan-staff-button font-medium"
                                        onClick={() => handleScanStaff()}
                                        title={t("Scan Staff")}
                                    >
                                        <Icon f7="qrcode_viewfinder" />
                                    </Button>
                                </div>
                            </div>
                            <div className="form-group">
                                <span className="form-label font-medium font-bold">{t("Mummy")}</span>
                                <div className="form-input-container font-medium mummy-input-with-scan">
                                    <div className="given-mummy-custom-dropdown">
                                        <div
                                            className="selected-mummy"
                                            onClick={() => toggleGivenMummyDropdown()}
                                        >
                                            {selectedGivenMummy ? (
                                                <span>{selectedGivenMummy.name || selectedGivenMummy.mummy_name || `Mummy ${selectedGivenMummy.id}`}</span>
                                            ) : (
                                                <span>{t("Select Mummy")}</span>
                                            )}
                                            <i className="f7-icons font-medium">chevron_down</i>
                                        </div>
                                        {givenMummyDropdownOpen && (
                                            <div className="mummy-dropdown-options">
                                                <div className="mummy-search-container">
                                                    <Input
                                                        type="text"
                                                        value={givenMummyFilter}
                                                        onChange={handleGivenMummyFilterChange}
                                                        placeholder={t("Search mummy...")}
                                                        className="mummy-search-input"
                                                        clearButton
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="mummy-options-list">
                                                    {filteredGivenMummyList.length > 0 ? (
                                                        <>
                                                            <div
                                                                className="mummy-dropdown-option"
                                                                onClick={() => handleGivenMummyChange("")}
                                                            >
                                                                <span>{t("Select Mummy")}</span>
                                                            </div>
                                                            {filteredGivenMummyList.map((mummy) => (
                                                                <div
                                                                    key={mummy.id}
                                                                    className={`mummy-dropdown-option ${selectedGivenMummyId === mummy.id.toString() ? 'selected' : ''}`}
                                                                    onClick={() => handleGivenMummyChange(mummy.id.toString())}
                                                                >
                                                                    <span>{mummy.name || mummy.mummy_name || `Mummy ${mummy.id}`}</span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <div className="mummy-dropdown-option no-results">
                                                            <span>{t("No results found")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        className="scan-mummy-button font-medium"
                                        onClick={handleScanGivenMummy}
                                        title={t("Scan Mummy")}
                                    >
                                        <Icon f7="qrcode_viewfinder" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {claimForTab === "mummy" && (
                        <div className="form-group">
                            <span className="form-label font-medium font-bold">{t("Mummy")}</span>
                            <div className="form-input-container font-medium mummy-input-with-scan">
                                <div className="mummy-custom-dropdown">
                                    <div
                                        className="selected-mummy"
                                        onClick={() => toggleMummyDropdown()}
                                    >
                                        {selectedMummy ? (
                                            <span>{selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`}</span>
                                        ) : (
                                            <span>{t("Select Mummy")}</span>
                                        )}
                                        <i className="f7-icons font-medium">chevron_down</i>
                                    </div>
                                    {mummyDropdownOpen && (
                                        <div className="mummy-dropdown-options">
                                            <div className="mummy-search-container">
                                                <Input
                                                    type="text"
                                                    value={mummyFilter}
                                                    onChange={handleMummyFilterChange}
                                                    placeholder={t("Search mummy...")}
                                                    className="mummy-search-input"
                                                    clearButton
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="mummy-options-list">
                                                {filteredMummyList.length > 0 ? (
                                                    <>
                                                        <div
                                                            className="mummy-dropdown-option"
                                                            onClick={() => handleMummyChange("")}
                                                        >
                                                            <span>{t("Select Mummy")}</span>
                                                        </div>
                                                        {filteredMummyList.map((mummy) => (
                                                            <div
                                                                key={mummy.id}
                                                                className={`mummy-dropdown-option ${selectedMummyId === mummy.id.toString() ? 'selected' : ''}`}
                                                                onClick={() => handleMummyChange(mummy.id.toString())}
                                                            >
                                                                <span>{mummy.name || mummy.mummy_name || `Mummy ${mummy.id}`}</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <div className="mummy-dropdown-option no-results">
                                                        <span>{t("No results found")}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    className="scan-mummy-button font-medium"
                                    onClick={handleScanMummy}
                                    title={t("Scan Mummy")}
                                >
                                    <Icon f7="qrcode_viewfinder" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Flower Amount")}</span>
                        <div className="form-input-container font-medium">
                            <Input
                                type="number"
                                value={flowerAmount}
                                onChange={handleFlowerAmountChange}
                                step="0.01"
                                min="0"
                                pattern="^\d*\.?\d{0,2}$"
                                inputmode="decimal"
                                required
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Remarks")}</span>
                        <div className="form-input-container remark-input-container font-medium">
                            <textarea
                                value={remark}
                                onChange={handleRemarkChange}
                                placeholder={t("Enter remarks (optional)")}
                                className="form-input form-textarea"
                                rows={4}
                            />
                        </div>
                    </div>

                    <div className="submit-button-container">
                        <Button className="font-bold font-medium" fill onClick={() => handleSubmit()}>{t("Submit")}</Button>
                    </div>
                </div>
            </div>

            <Tools
                type="toast"
                active={showConfirmToast}
                data={confirmToastData}
                onConfirm={handleConfirmClaim}
                onCancel={handleCancelConfirm}
                onToastClose={handleCancelConfirm}
            />

            <Tools
                type="toast"
                active={showAlertToast}
                data={alertToastData}
                onToastClose={handleCloseAlert}
            />

            <QrScanner
                readerElementId={scanType === 'staff' ? 'qr-reader-staff' : 'qr-reader-mummy'}
                active={showQrScanner && !!scanType}
                onActiveChange={(open) => {
                    setShowQrScanner(open);
                    if (!open) setScanType(null);
                }}
                onDecoded={(value) => handleQrCodeScanned(value, scanType)}
                isProcessingScanRef={isProcessingScanRef}
                showPreloaderOnCameraScan={false}
            />
        </Page>
    );
};

export default ClaimFlowerPage;
