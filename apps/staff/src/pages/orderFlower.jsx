import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Page,
    Input,
    Button,
    Icon,
    f7
} from "framework7-react";
import Header from '../components/header';
import { useTranslation } from "../services/useTranslation";
import { Preferences } from "@capacitor/preferences";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import env from "../../environment.json";
import Tools from '../components/tools';
import useCommon from '../components/action/Common';
import QrScanner from '../components/QrScanner';
import {
    buildConfirmationSlipReceipt,
    buildPaymentRows,
    apiOrderRef,
    printPosReceipt,
} from '../utils/androidReceiptPrinter';
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from '../constants/receiptStatus';

const OrderFlowerPage = () => {
    const { create_buy_flower_record_from_mummy, mummy_lists, verify_qr } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [flowerAmount, setFlowerAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [mummyList, setMummyList] = useState([]);
    const [selectedMummyId, setSelectedMummyId] = useState("");
    const [mummyFilter, setMummyFilter] = useState("");
    const [mummyDropdownOpen, setMummyDropdownOpen] = useState(false);
    const [showConfirmToast, setShowConfirmToast] = useState(false);
    const [confirmToastData, setConfirmToastData] = useState({});
    const [showAlertToast, setShowAlertToast] = useState(false);
    const [alertToastData, setAlertToastData] = useState({});
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const isProcessingScanRef = useRef(false);
    const [paymentMethodsFromGlobal, setPaymentMethodsFromGlobal] = useState([]);
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [grandTotal, setGrandTotal] = useState(0);
    const [feeBreakdown, setFeeBreakdown] = useState("");
    const [form, setForm] = useState({
        amount: flowerAmount,
        mummy_id: "",
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

    useEffect(() => {
        const loadGlobal = async () => {
            try {
                const { value } = await Preferences.get({ key: "global_data" });
                if (value) {
                    const globalData = JSON.parse(value);
                    const methods = globalData?.payment_methods ?? [];
                    setPaymentMethodsFromGlobal(Array.isArray(methods) ? methods : []);
                }
            } catch (e) {
                console.error("Error loading global data for payment methods:", e);
            }
        };
        loadGlobal();
    }, []);

    useEffect(() => {
        const fetchMummyList = async () => {
            try {
                f7.preloader.show();
                const response = await mummy_lists({
                    private_key: env.private_key
                });
                if (response.status) {
                    setMummyList(response.data || []);
                } else {
                    setMummyList([]);
                    f7.dialog.alert(response.message || "Failed to load mummy list", 2000);
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

    const handleFlowerAmountChange = (e) => {
        const value = e.target.value;

        if (value === "" || value === ".") {
            setFlowerAmount(value);
            setForm(prev => ({ ...prev, amount: value }));
            return;
        }

        const regex = /^\d*\.?\d{0,2}$/;
        if (regex.test(value)) {
            setFlowerAmount(value);
            setForm(prev => ({ ...prev, amount: value }));
        }
    };

    const uniqueTypes = useMemo(() => {
        const byTypeId = new Map();
        paymentMethodsFromGlobal.forEach((pm) => {
            if (!byTypeId.has(pm.type_id)) {
                byTypeId.set(pm.type_id, { type_id: pm.type_id, type: pm.type });
            }
        });
        return Array.from(byTypeId.values());
    }, [paymentMethodsFromGlobal]);

    const getMethodsForType = (typeId) =>
        paymentMethodsFromGlobal.filter((pm) => pm.type_id === typeId);

    const handlePaymentAmountChange = (methodId, value) => {
        const formatted = value.replace(/[^\d.]/g, '').replace(/(\..*?)\..*/g, '$1').replace(/^(\d*\.\d{0,2}).*$/, '$1');
        setPaymentAmounts(prev => ({
            ...prev,
            [methodId]: formatted
        }));
    };

    useEffect(() => {
        let subtotal = 0;
        let totalFees = 0;
        const breakdownLines = [];
        paymentMethodsFromGlobal.forEach((pm) => {
            const amt = parseFloat(paymentAmounts[pm.id] || 0) || 0;
            if (amt > 0) {
                subtotal += amt;
                const feePct = parseFloat(pm.handle_fee_percentage || 0) || 0;
                const fee = amt * (feePct / 100);
                totalFees += fee;
                if (fee > 0) {
                    breakdownLines.push(`${t(pm.name)} ${t("Fee")} (${feePct}%): RM ${fee.toFixed(2)}`);
                }
            }
        });
        setGrandTotal(subtotal + totalFees);
        setFeeBreakdown(breakdownLines.join('\n'));
    }, [paymentAmounts, paymentMethodsFromGlobal, t]);

    const handleRemarkChange = (e) => {
        const value = e.target.value;
        setRemark(value);
        setForm(prev => ({ ...prev, remark: value }));
    };

    const handleMummyChange = (mummyId) => {
        setSelectedMummyId(mummyId);
        setForm(prev => ({ ...prev, mummy_id: mummyId }));
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

    const selectedMummy = mummyList.find(mummy => mummy.id.toString() === selectedMummyId.toString());

    const buildFlowerOrderReceipt = (opts, layout) => {
        const { payLater, payments, handleFee, apiData } = opts;
        const mummyName = selectedMummy
            ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`)
            : '';
        const amt = parseFloat(flowerAmount || 0) || 0;
        const partyRows = [{ label: 'Mummy', value: mummyName }];
        if (remark?.trim()) {
            partyRows.push({ label: 'Remarks', value: remark.trim() });
        }
        return buildConfirmationSlipReceipt({
            serviceName: 'Order Flower',
            orderId: apiOrderRef(apiData),
            status: resolveReceiptStatusLabel(apiData, RECEIPT_STATUS_KIND.FLOWER_RECORD, { payLater }),
            partyRows,
            amount: amt,
            paymentRows: buildPaymentRows({
                payLater,
                payments,
                handleFee,
                paymentMethodsFromGlobal,
            }),
            payLater,
            layout,
        });
    };

    const showAlert = (message) => {
        setAlertToastData({
            title: t("Alert"),
            message: message,
            buttonText: t("OK")
        });
        setShowAlertToast(true);
    };

    const handleCloseAlert = () => {
        setShowAlertToast(false);
    };

    const handleScanMummy = async () => {
        // Use html5-qrcode for all platforms (web, iOS, Android) to show overlay modal
        setShowQrScanner(true);
    };

    const handleQrCodeScanned = async (qrCode) => {
        f7.preloader.show();
        try {
            const verifyResponse = await verify_qr({
                qr: qrCode,
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

            const responseData = verifyResponse.data || verifyResponse;
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

            let mummyId = null;

            if (typeof responseData === 'object' && responseData !== null) {
                mummyId = responseData.id || responseData.mummy_id || responseData.user_id;
            } else if (typeof responseData === 'number') {
                mummyId = responseData;
            } else if (typeof responseData === 'string') {
                // Try to parse as number
                const parsed = parseInt(responseData);
                if (!isNaN(parsed)) {
                    mummyId = parsed;
                }
            }

            if (mummyId) {
                // Find mummy in the list
                let foundMummy = mummyList.find(mummy =>
                    mummy.id.toString() === mummyId.toString()
                );

                if (foundMummy) {
                    handleMummyChange(mummyId.toString());
                    f7.toast.show({
                        text: t("Mummy selected successfully"),
                        position: 'center',
                        type: 'success',
                        closeTimeout: 2000,
                    });
                } else {
                    // Mummy not found, fetch the list one more time for confirmation
                    try {
                        const refreshResponse = await mummy_lists({
                            private_key: env.private_key
                        });
                        if (refreshResponse.status) {
                            const refreshedList = refreshResponse.data || [];
                            setMummyList(refreshedList);

                            // Check again after refresh
                            foundMummy = refreshedList.find(mummy =>
                                mummy.id.toString() === mummyId.toString()
                            );

                            if (foundMummy) {
                                handleMummyChange(mummyId.toString());
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
                                text: t("Mummy not found in the list"),
                                position: 'center',
                                type: 'error',
                                closeTimeout: 2000,
                            });
                        }
                    } catch (refreshError) {
                        console.error("Error refreshing mummy list:", refreshError);
                        handleMummyChange("");
                        f7.toast.show({
                            text: t("Mummy not found in the list"),
                            position: 'center',
                            type: 'error',
                            closeTimeout: 2000,
                        });
                    }
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

        // Build confirmation message
        const mummyName = selectedMummy ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`) : "";

        let confirmationMessage = `${t("Order Details")}:\n`;
        confirmationMessage += `${t("Mummy")}: ${mummyName}\n`;
        confirmationMessage += `${t("Flower Amount")}: RM ${flowerAmount}\n`;

        if (remark) {
            confirmationMessage += `${t("Remarks")}: ${remark}\n`;
        }

        confirmationMessage += `\n${t("How would you like to pay?")}`;


        setConfirmToastData({
            title: t("Payment Option"),
            message: confirmationMessage,
            confirmText: t("Pay Now"),
            cancelText: t("Pay Later")
        });
        setShowConfirmToast(true);
    };

    const handleConfirmOrder = () => {
        setShowConfirmToast(false);
        setPaymentAmounts({});
        setShowPaymentForm(true);
    };

    const handleCloseConfirm = () => {
        setShowConfirmToast(false);
    };

    const handleCancelConfirm = async () => {
        setShowConfirmToast(false);

        const paymentForm = {
            amount: parseFloat(flowerAmount),
            cod: 0,
            tng: 0,
            credit_card: 0,
            handle_fee: 0,
            mummy_id: parseInt(selectedMummyId),
            remark: remark
        };

        setForm(prev => ({
            ...prev,
            ...paymentForm
        }));

        f7.preloader.show();

        try {
            const response = await create_buy_flower_record_from_mummy(paymentForm);
            if (response.status) {
                void printPosReceipt((layout) => buildFlowerOrderReceipt({
                    payLater: true,
                    payments: null,
                    handleFee: 0,
                    apiData: response.data,
                }, layout));
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
            console.error("Error creating order:", error);
            f7.toast.show({
                text: t("Error creating order. Please try again."),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            f7.preloader.hide();
        }
    };

    const handleClosePaymentForm = () => {
        setShowPaymentForm(false);
    };

    const handleConfirmPayment = async () => {
        const total = Math.round(parseFloat(flowerAmount) * 100) / 100;
        const payments = paymentMethodsFromGlobal
            .filter((pm) => (parseFloat(paymentAmounts[pm.id] || 0) || 0) > 0)
            .map((pm) => ({ payment_method_id: pm.id, amount: Math.round(parseFloat(paymentAmounts[pm.id] || 0) * 100) / 100 }));
        let paid = 0;
        let totalFees = 0;
        payments.forEach((p) => {
            paid += p.amount;
            const pm = paymentMethodsFromGlobal.find((m) => m.id === p.payment_method_id);
            if (pm) totalFees += p.amount * (parseFloat(pm.handle_fee_percentage || 0) || 0) / 100;
        });

        if (Math.abs(paid - total) > 0.01) {
            f7.toast.show({
                text: t("Total payment amount must equal the flower amount"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
            return;
        }

        if (payments.length === 0) {
            f7.toast.show({
                text: t("Please enter at least one payment amount"),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
            return;
        }

        setShowPaymentForm(false);

        const paymentForm = {
            amount: parseFloat(flowerAmount),
            payments,
            handle_fee: parseFloat(totalFees.toFixed(2)),
            mummy_id: parseInt(selectedMummyId),
            remark: remark
        };

        setForm(prev => ({
            ...prev,
            ...paymentForm
        }));

        f7.preloader.show();

        try {
            const response = await create_buy_flower_record_from_mummy(paymentForm);
            if (response.status) {
                void printPosReceipt((layout) => buildFlowerOrderReceipt({
                    payLater: false,
                    payments,
                    handleFee: paymentForm.handle_fee,
                    apiData: response.data,
                }, layout));
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
            console.error("Error creating order:", error);
            f7.toast.show({
                text: t("Error creating order. Please try again."),
                position: 'center',
                type: 'error',
                closeTimeout: 2000,
            });
        } finally {
            f7.preloader.hide();
        }
    };


    return (
        <Page className="order-flower-page">
            <Header title={t("Order Flower")} />
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
                                onClick={() => handleScanMummy()}
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
                onConfirm={handleConfirmOrder}
                onCancel={handleCancelConfirm}
                onToastClose={handleCloseConfirm}
            />

            <Tools
                type="custom"
                active={showPaymentForm}
                data={{
                    title: t("Payment"),
                    confirmText: t("Confirm Payment"),
                    cancelText: t("Cancel"),
                }}
                onConfirm={handleConfirmPayment}
                onCancel={handleClosePaymentForm}
            >
                <div className="ktv-payment-form">
                    <div className="order-info text-center">
                        <p>
                            {selectedMummy ? (selectedMummy.name || selectedMummy.mummy_name || `Mummy ${selectedMummy.id}`) : ""} - RM {parseFloat(flowerAmount || 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="payment-methods-section">
                        <div className="payment-methods payment-methods-dynamic">
                            {uniqueTypes.map((typeRow) => {
                                const methods = getMethodsForType(typeRow.type_id);
                                return (
                                    <div key={typeRow.type_id} className="payment-type-group">
                                        <div className="payment-type-label font-large font-bold">{t(typeRow.type)}</div>
                                        <div className="payment-row">
                                            {methods.map((pm) => (
                                                <div key={pm.id} className="payment-method">
                                                    <label className="payment-method-label font-large">{t(pm.name)}{pm.handle_fee_percentage && parseFloat(pm.handle_fee_percentage) > 0 ? ` (${pm.handle_fee_percentage}%)` : ""}</label>
                                                    <Input
                                                        type="text"
                                                        inputmode="decimal"
                                                        placeholder="0.00"
                                                        value={paymentAmounts[pm.id] ?? ""}
                                                        onChange={(e) => handlePaymentAmountChange(pm.id, e.target.value)}
                                                        className="payment-input"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="total-section">
                        <div className="total-label-section">
                            <span className="section-title font-medium font-bold">{t("Total Amount")}</span>
                        </div>
                        <div className="total-row">
                            <div className="total-item order-total-item">
                                <span className="total-label">{t("Total Amount")}:</span>
                                <span className="total-value">RM {parseFloat(flowerAmount || 0).toFixed(2)}</span>
                            </div>
                            {feeBreakdown && (
                                <div className="fee-breakdown">
                                    {feeBreakdown.split('\n').map((line, index) => {
                                        const parts = line.split(': RM ');
                                        const label = parts[0] + (parts[1] ? ':' : '');
                                        const value = parts[1] ? `RM ${parts[1]}` : '';
                                        return (
                                            <div key={index} className="fee-item">
                                                <span className="fee-label font-medium font-bold">{label}</span>
                                                {value && <span className="fee-value font-medium">{value}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="total-item grand-total">
                                <span className="total-label">{t("Total")}:</span>
                                <span className="total-value">RM {grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Tools>

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

export default OrderFlowerPage;