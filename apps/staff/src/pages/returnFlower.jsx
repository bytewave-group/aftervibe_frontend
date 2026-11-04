import React, { useState, useEffect, useRef } from "react";
import {
    Page,
    f7,
    Input,
    Button,
    Icon
} from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import env from "../../environment.json";
import Tools from '../components/tools';
import useCommon from '../components/action/Common';
import QrScanner from '../components/QrScanner';
import { buildConfirmationSlipReceipt, buildPaymentRows, apiOrderRef, printPosReceipt } from '../utils/androidReceiptPrinter';
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from '../constants/receiptStatus';

const ReturnFlowerPage = () => {
    const { mummy_lists, create_return_flower_record_from_mummy, verify_qr } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [mummyList, setMummyList] = useState([]);
    const [selectedMummyId, setSelectedMummyId] = useState("");
    const [mummyDropdownOpen, setMummyDropdownOpen] = useState(false);
    const [mummyFilter, setMummyFilter] = useState("");
    const [flowerAmount, setFlowerAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [showConfirmToast, setShowConfirmToast] = useState(false);
    const [confirmToastData, setConfirmToastData] = useState({});
    const [showAlertToast, setShowAlertToast] = useState(false);
    const [alertToastData, setAlertToastData] = useState({});
    const [showQrScanner, setShowQrScanner] = useState(false);
    const isProcessingScanRef = useRef(false);

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
        const fetchMummyList = async () => {
            try {
                f7.preloader.show();
                const mummyResponse = await mummy_lists({ private_key: env.private_key });

                if (mummyResponse.status) {
                    setMummyList(mummyResponse.data || []);
                } else {
                    setMummyList([]);
                    showAlert(mummyResponse.message);
                }
            } catch (error) {
                console.error("Error fetching mummy list:", error);
                setMummyList([]);
            } finally {
                f7.preloader.hide();
            }
        };
        fetchMummyList();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mummyDropdownOpen && !event.target.closest('.mummy-custom-dropdown')) {
                setMummyDropdownOpen(false);
            }
        };

        if (mummyDropdownOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [mummyDropdownOpen]);

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

    const filteredMummyList = mummyList.filter((mummy) => {
        const mummyName = (mummy.name || mummy.mummy_name || `Mummy ${mummy.id}`).toLowerCase();
        return mummyName.includes(mummyFilter.toLowerCase());
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
        setRemark(e.target.value);
    };

    const selectedMummy = mummyList.find(mummy => mummy.id.toString() === selectedMummyId.toString());

    const buildReturnFlowerReceiptText = (apiData, layout) => {
        const mummyName = selectedMummy
            ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`)
            : '';
        const amt = parseFloat(flowerAmount) || 0;
        const partyRows = [{ label: 'Mummy', value: mummyName }];
        if (remark?.trim()) {
            partyRows.push({ label: 'Remarks', value: remark.trim() });
        }
        return buildConfirmationSlipReceipt({
            serviceName: 'Return Flower',
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

    const handleScanMummy = () => {
        setShowQrScanner(true);
    };

    const handleQrCodeScanned = async (qrCode) => {
        try {
            f7.preloader.show();
            let qrData = qrCode;
            if (typeof qrCode === 'string') {
                try {
                    qrData = JSON.parse(atob(qrCode));
                } catch (e) {
                    try {
                        qrData = JSON.parse(qrCode);
                    } catch (e2) {
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
                handleMummyChange("");
                f7.toast.show({
                    text: verifyResponse.message || t("QR code verification failed"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            const responseData = verifyResponse.data;
            const role = (responseData && typeof responseData === 'object' && responseData.role) ? String(responseData.role).toLowerCase() : '';
            if (role !== 'mummy') {
                f7.preloader.hide();
                handleMummyChange("");
                f7.toast.show({
                    text: t("Invalid QR code - mummy only"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            let id = null;
            if (responseData && typeof responseData === 'object') {
                id = responseData.id ?? responseData.mummy_id ?? responseData.user_id;
            }
            if (id == null && typeof qrData === 'object' && qrData !== null) {
                id = qrData.id || qrData.mummy_id || qrData.user_id;
            } else if (id == null && typeof qrData === 'number') {
                id = qrData;
            } else if (id == null && typeof qrData === 'string') {
                const parsed = parseInt(qrData);
                if (!isNaN(parsed)) id = parsed;
            }

            if (id) {
                const numericId = typeof id === 'number' ? id : parseInt(id);
                const foundMummy = mummyList.find(mummy =>
                    mummy.id === numericId || mummy.id.toString() === id.toString()
                );

                if (foundMummy) {
                    handleMummyChange(foundMummy.id.toString());
                    f7.toast.show({
                        text: t("Mummy selected successfully"),
                        position: 'center',
                        type: 'success',
                        closeTimeout: 2000,
                    });
                } else {
                    handleMummyChange("");
                    f7.toast.show({
                        text: t("Mummy not found in the list"),
                        position: 'center',
                        type: 'error',
                        closeTimeout: 2000,
                    });
                }
            } else {
                handleMummyChange("");
                f7.toast.show({
                    text: t("Invalid QR code format"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error processing QR code:", error);
            handleMummyChange("");
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

    const handleSubmit = () => {
        if (!selectedMummyId) {
            showAlert(t("Please select a mummy"));
            return;
        }

        if (!flowerAmount || parseFloat(flowerAmount) <= 0) {
            showAlert(t("Please enter a valid flower amount"));
            return;
        }

        const mummyName = selectedMummy ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`) : "";

        let confirmationMessage = `${t("Return Details")}:\n`;
        confirmationMessage += `${t("Mummy")}: ${mummyName}\n`;
        confirmationMessage += `${t("Flower Amount")}: ${flowerAmount}\n`;

        if (remark) {
            confirmationMessage += `${t("Remarks")}: ${remark}\n`;
        }

        confirmationMessage += `\n${t("Are you sure you want to submit this return?")}`;

        setConfirmToastData({
            title: t("Confirm Return"),
            message: confirmationMessage,
            confirmText: t("Confirm"),
            cancelText: t("Cancel")
        });
        setShowConfirmToast(true);
    };

    const handleConfirmReturn = async () => {
        setShowConfirmToast(false);

        const updatedForm = {
            mummy_id: parseInt(selectedMummyId),
            amount: parseFloat(flowerAmount),
            remark: remark
        };

        try {
            f7.preloader.show();
            const response = await create_return_flower_record_from_mummy(updatedForm);
            if (response.status) {
                void printPosReceipt((layout) => buildReturnFlowerReceiptText(response.data, layout));
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
            console.error("Error creating return flower record from mummy:", error);
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
        <Page className="return-flower-page">
            <Header title={t("Return Flower")} />
            <div className="content-panel">
                <div className="content">
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
                onConfirm={handleConfirmReturn}
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
                readerElementId="qr-reader-mummy"
                active={showQrScanner}
                onActiveChange={setShowQrScanner}
                onDecoded={handleQrCodeScanned}
                isProcessingScanRef={isProcessingScanRef}
                showPreloaderOnCameraScan={false}
            />
        </Page>
    );
};

export default ReturnFlowerPage;
