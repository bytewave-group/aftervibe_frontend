import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Page,
    f7,
    Input,
    Button,
    Block,
    BlockTitle,
    Icon
} from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import useCommon from "../components/action/Common";
import { Preferences } from "@capacitor/preferences";
import env from "../../environment.json";
import Tools from "../components/tools";
import QrScanner from '../components/QrScanner';
import {
    buildPosReceipt,
    buildPaymentRows,
    apiOrderRef,
    printPosReceipt,
} from '../utils/androidReceiptPrinter';
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from '../constants/receiptStatus';
import { STAFF_WORK_TYPE } from '../constants/staffWorkType';

const BuyoutPage = () => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const { staff_work_lists, buyout_lists, create_order_buyout, verify_qr } = useAuthenticate();

    const [form, setForm] = useState({
        private_key: env.private_key,
        staff_id: "",
    });
    const [staffList, setStaffList] = useState([]);
    const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
    const [staffFilter, setStaffFilter] = useState("");

    const [buyoutLists, setBuyoutLists] = useState([]);
    const [buyoutType1, setBuyoutType1] = useState([]);
    const [buyoutType2, setBuyoutType2] = useState([]);
    const [selectedBuyoutTab, setSelectedBuyoutTab] = useState("normal"); // 'normal', 'hourly', 'custom'
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedBuyoutType2, setSelectedBuyoutType2] = useState(null);
    const [customHours, setCustomHours] = useState("");
    const [customAmount, setCustomAmount] = useState("");
    const [customAmountHours, setCustomAmountHours] = useState("");
    const [totalAmount, setTotalAmount] = useState(0);

    const [paymentMethodsFromGlobal, setPaymentMethodsFromGlobal] = useState([]);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [grandTotal, setGrandTotal] = useState(0);
    const [feeBreakdown, setFeeBreakdown] = useState("");
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successToastData, setSuccessToastData] = useState({});
    const [showAlertToast, setShowAlertToast] = useState(false);
    const [alertToastData, setAlertToastData] = useState({});
    const [showPaymentErrorToast, setShowPaymentErrorToast] = useState(false);
    const [paymentErrorToastData, setPaymentErrorToastData] = useState({});
    const [showQrScanner, setShowQrScanner] = useState(false);
    const isProcessingScanRef = useRef(false);
    const [orderInfo, setOrderInfo] = useState({
        staffName: "",
        amount: 0,
        customHours: "",
        customAmount: ""
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
        fetchStaffWorkList();
    }, []);

    useEffect(() => {
        if (form.staff_id) {
            fetchBuyoutPackages();
        } else {
            setBuyoutLists([]);
            setBuyoutType1([]);
            setBuyoutType2([]);
        }
    }, [form.staff_id]);

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

    const fetchStaffWorkList = async () => {
        try {
            f7.preloader.show();
            const response = await staff_work_lists({ private_key: env.private_key, type: STAFF_WORK_TYPE.BUYOUT });
            if (response.status && response.data) {
                setStaffList(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching staff work list:", error);
            setStaffList([]);
        } finally {
            f7.preloader.hide();
        }
    };

    const fetchBuyoutPackages = async () => {
        if (!form.staff_id) return;

        try {
            f7.preloader.show();
            const res = await buyout_lists({
                private_key: env.private_key,
                id: form.staff_id
            });

            if (res && res.status) {
                const data = res.data;
                setBuyoutLists(data || []);
                setBuyoutType1(data.filter((item) => item.type == 1));
                setBuyoutType2(data.filter((item) => item.type == 2));
            }
        } catch (error) {
            console.error("Error fetching buyout packages:", error);
        } finally {
            f7.preloader.hide();
        }
    };

    const handleStaffChange = (staffId) => {
        setForm(prevForm => ({
            ...prevForm,
            staff_id: staffId
        }));
        setStaffDropdownOpen(false);
        setStaffFilter("");
        // Reset selections when staff changes
        setSelectedPackage(null);
        setSelectedBuyoutType2(null);
        setCustomHours("");
        setCustomAmount("");
        setCustomAmountHours("");
        setTotalAmount(0);
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

    const handleScanStaff = async () => {
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
                handleStaffChange("");
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
            if (role !== 'staff') {
                f7.preloader.hide();
                handleStaffChange("");
                f7.toast.show({
                    text: t("Invalid QR code - staff only"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
                return;
            }

            // Get the id from the verify response
            let staffId = null;

            if (typeof responseData === 'object' && responseData !== null) {
                staffId = responseData.id || responseData.staff_id || responseData.user_id;
            } else if (typeof responseData === 'number') {
                staffId = responseData;
            } else if (typeof responseData === 'string') {
                // Try to parse as number
                const parsed = parseInt(responseData);
                if (!isNaN(parsed)) {
                    staffId = parsed;
                }
            }

            if (staffId) {
                // Find staff in the list
                const foundStaff = staffList.find(staff =>
                    staff.id.toString() === staffId.toString()
                );

                if (foundStaff) {
                    // Use the staff.id from the found staff to ensure type consistency
                    handleStaffChange(foundStaff.id);
                    f7.toast.show({
                        text: t("Staff selected successfully"),
                        position: 'center',
                        type: 'success',
                        closeTimeout: 2000,
                    });
                } else {
                    // Staff not found, fetch the list one more time for confirmation
                    try {
                        const refreshResponse = await staff_work_lists({ private_key: env.private_key, type: STAFF_WORK_TYPE.BUYOUT });
                        if (refreshResponse.status && refreshResponse.data) {
                            const refreshedList = refreshResponse.data || [];
                            setStaffList(refreshedList);

                            // Check again after refresh
                            const foundStaffAfterRefresh = refreshedList.find(staff =>
                                staff.id.toString() === staffId.toString()
                            );

                            if (foundStaffAfterRefresh) {
                                handleStaffChange(foundStaffAfterRefresh.id);
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
                        } else {
                            handleStaffChange("");
                            f7.toast.show({
                                text: t("Staff not found in the list"),
                                position: 'center',
                                type: 'error',
                                closeTimeout: 2000,
                            });
                        }
                    } catch (refreshError) {
                        console.error("Error refreshing staff list:", refreshError);
                        handleStaffChange("");
                        f7.toast.show({
                            text: t("Staff not found in the list"),
                            position: 'center',
                            type: 'error',
                            closeTimeout: 2000,
                        });
                    }
                }
            } else {
                handleStaffChange("");
                f7.toast.show({
                    text: t("Invalid QR code format"),
                    position: 'center',
                    type: 'error',
                    closeTimeout: 2000,
                });
            }
        } catch (error) {
            console.error("Error processing QR code:", error);
            handleStaffChange("");
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

    const handleBuyoutTabChange = (tab) => {
        setSelectedBuyoutTab(tab);
        setSelectedPackage(null);
        setSelectedBuyoutType2(null);
        setCustomHours("");
        setCustomAmount("");
        setCustomAmountHours("");
        setTotalAmount(0);
    };

    const handleBuyoutType1Select = (item) => {
        setSelectedPackage(item);
        setSelectedBuyoutType2(null);
        setTotalAmount(parseFloat(item.amount));
        setCustomHours("");
        setCustomAmount("");
    };

    const handleBuyoutType2Select = (item) => {
        setSelectedBuyoutType2(item);
        setSelectedPackage(null);
        setCustomHours("");
        setTotalAmount(0);
        setCustomAmount("");
    };

    const handleCustomHoursChange = (e) => {
        const value = e.target.value;
        let formatted = value
            .replace(/[^\d.]/g, '')
            .replace(/(\..*?)\..*/g, '$1')
            .replace(/^(\d*\.?\d{0,2}).*$/, '$1');
        if (formatted !== "") {
            setCustomHours(formatted);
            const hours = parseFloat(formatted) || 0;
            if (selectedBuyoutType2) {
                setTotalAmount(hours * parseFloat(selectedBuyoutType2.amount));
            } else {
                setTotalAmount(0);
            }
        } else {
            setCustomHours("");
            setTotalAmount(0);
        }
    };

    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        let formatted = value.replace(/[^\d.]/g, '');

        const parts = formatted.split('.');
        if (parts.length > 2) {
            formatted = parts[0] + '.' + parts.slice(1).join('');
        }

        if (parts.length > 1) {
            formatted = parts[0] + '.' + parts[1].slice(0, 2);
        }

        if (formatted === "0") {
            setCustomAmount("");
            setTotalAmount(0);
        } else if (formatted >= 0) {
            setCustomAmount(formatted);
            setTotalAmount(parseFloat(formatted));
            setCustomHours("");
        }
    };

    const handleCustomAmountHoursChange = (e) => {
        const value = e.target.value;
        let formatted = value
            .replace(/[^\d.]/g, '')
            .replace(/(\..*?)\..*/g, '$1')
            .replace(/^(\d*\.?\d{0,2}).*$/, '$1');
        if (formatted !== "") {
            setCustomAmountHours(formatted);
        } else {
            setCustomAmountHours("");
        }
    };

    const handleCancelPackage = () => {
        setSelectedPackage(null);
        setSelectedBuyoutType2(null);
        setTotalAmount(0);
        setCustomHours("");
        setCustomAmount("");
        setCustomAmountHours("");
    };

    const handleNextClick = () => {
        if (!form.staff_id) {
            showAlert(t("Please select a staff"));
            return;
        }

        if (selectedBuyoutTab === "normal") {
            if (!selectedPackage) {
                showAlert(t("Please select a package"));
                return;
            }
        } else if (selectedBuyoutTab === "hourly") {
            if (!selectedBuyoutType2) {
                showAlert(t("Please select an hourly package"));
                return;
            }
            if (!customHours || parseFloat(customHours) <= 0) {
                showAlert(t("Please enter custom hours"));
                return;
            }
        } else if (selectedBuyoutTab === "custom") {
            if (!customAmount || parseFloat(customAmount) === 0) {
                showAlert(t("Please enter custom amount"));
                return;
            }
        }

        const selectedStaff = staffList.find(staff => String(staff.id) === String(form.staff_id));
        const staffName = selectedStaff ? (selectedStaff.name || selectedStaff.staff_name || `Staff ${selectedStaff.id}`) : "";
        const finalAmount = parseFloat(totalAmount) || 0;

        const nextOrderInfo = {
            staffName: staffName,
            amount: finalAmount,
            customHours: selectedBuyoutTab === "hourly" ? customHours : (selectedBuyoutTab === "custom" ? customAmountHours : ""),
            customAmount: selectedBuyoutTab === "custom" ? customAmount : ""
        };

        setOrderInfo(nextOrderInfo);
        // Payment method entry is temporarily bypassed for direct order placement.
        // setPaymentAmounts({});
        // setGrandTotal(0);
        // setFeeBreakdown("");
        // setShowPaymentForm(true);
        proceedOrder({ payments: [], handle_fee: 0 }, nextOrderInfo);
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

    const handleClosePopup = () => {
        setShowPaymentForm(false);
    };

    const handleConfirmPopup = () => {
        const payments = paymentMethodsFromGlobal
            .filter((pm) => (parseFloat(paymentAmounts[pm.id] || 0) || 0) > 0)
            .map((pm) => ({ payment_method_id: pm.id, amount: parseFloat(paymentAmounts[pm.id] || 0) }));
        let subtotal = 0;
        let totalFees = 0;
        payments.forEach((p) => {
            subtotal += p.amount;
            const pm = paymentMethodsFromGlobal.find((m) => m.id === p.payment_method_id);
            if (pm) totalFees += p.amount * (parseFloat(pm.handle_fee_percentage || 0) || 0) / 100;
        });
        const orderTotal = orderInfo.amount;

        if (subtotal < orderTotal) {
            showPaymentError(
                t("Total payment amount is less than the order amount"),
                orderTotal,
                subtotal
            );
            return;
        }

        if (subtotal > orderTotal) {
            showPaymentError(
                t("Total payment amount is more than the order amount"),
                orderTotal,
                subtotal
            );
            return;
        }

        if (payments.length === 0) {
            showPaymentError(t("Please enter at least one payment amount"), orderTotal, 0);
            return;
        }

        proceedOrder({
            payments,
            handle_fee: parseFloat(totalFees.toFixed(2))
        });
        setShowPaymentForm(false);
    };

    const buildBuyoutOrderReceiptText = (paymentData, nextOrderInfo, apiData, layout) => {
        const payLater = !paymentData.payments || paymentData.payments.length === 0;
        const total = Number(nextOrderInfo.amount) || 0;
        const metaRows = [{ label: 'Staff', value: nextOrderInfo.staffName || '' }];
        const items = [];

        if (selectedBuyoutTab === 'normal' && selectedPackage) {
            const hoursLabel = selectedPackage.value === 1 ? 'Hour' : 'Hours';
            items.push({
                name: `${selectedPackage.name} (${selectedPackage.value} ${hoursLabel})`,
                qty: 1,
                total,
            });
        } else if (selectedBuyoutTab === 'hourly' && selectedBuyoutType2) {
            items.push({
                name: `${selectedBuyoutType2.name || 'Buyout'} (${customHours} Hours)`,
                qty: 1,
                total,
            });
        } else if (selectedBuyoutTab === 'custom') {
            items.push({ name: 'Buyout (Custom)', qty: 1, total });
            if (nextOrderInfo.customHours) {
                metaRows.push({ label: 'Hours', value: String(nextOrderInfo.customHours) });
            }
        } else {
            items.push({ name: 'Buyout', qty: 1, total });
        }

        return buildPosReceipt({
            title: 'Buyout',
            orderId: apiOrderRef(apiData),
            status: resolveReceiptStatusLabel(apiData, RECEIPT_STATUS_KIND.ORDER, { payLater }),
            metaRows,
            items,
            total,
            paymentRows: buildPaymentRows({
                payLater,
                payments: paymentData.payments,
                handleFee: paymentData.handle_fee,
                paymentMethodsFromGlobal,
            }),
            receiptType: payLater ? 'confirmation' : 'payment',
            layout,
        });
    };

    const proceedOrder = (paymentData, nextOrderInfo = orderInfo) => {
        f7.dialog.close();
        f7.preloader.show();

        let orderData = {
            private_key: env.private_key,
            action_type: "mummy",
            target_type: "staff",
            target_id: parseInt(form.staff_id),
            remark: null,
            amount: nextOrderInfo.amount,
            payments: paymentData.payments,
            handle_fee: paymentData.handle_fee,
            table_number: null
        };

        if (selectedBuyoutTab === "normal") {
            orderData = {
                ...orderData,
                id: selectedPackage.id,
                type: "normal",
                value: selectedPackage.value || null
            };
        } else if (selectedBuyoutTab === "hourly") {
            orderData = {
                ...orderData,
                id: selectedBuyoutType2.id,
                type: "normal",
                value: parseFloat(customHours)
            };
        } else if (selectedBuyoutTab === "custom") {
            orderData = {
                ...orderData,
                id: null,
                type: "custom",
                value: customAmountHours ? parseFloat(customAmountHours) : null,
                amount: parseFloat(customAmount)
            };
        }

        create_order_buyout(orderData).then(async (res) => {
            f7.preloader.hide();
            if (!res.status) {
                showAlert(res.message);
                return;
            }

            void printPosReceipt((layout) => buildBuyoutOrderReceiptText(paymentData, nextOrderInfo, res.data, layout));

            setSuccessToastData({
                title: t("Success"),
                message: t("Order successfully recorded!"),
                buttonText: t("Done")
            });
            setShowSuccessToast(true);
        }).catch(error => {
            f7.preloader.hide();
            showAlert(error.message || t("Error creating order"));
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

    const showPaymentError = (message, orderAmount, totalPayment) => {
        const errorMessage = `${message}\n\n${t("Order Amount")}: RM ${orderAmount.toFixed(2)}\n${t("Total Payment")}: RM ${totalPayment.toFixed(2)}`;
        setPaymentErrorToastData({
            title: t("Payment Error"),
            message: errorMessage,
            buttonText: t("Close")
        });
        setShowPaymentErrorToast(true);
    };

    const handleClosePaymentError = () => {
        setShowPaymentErrorToast(false);
    };

    const handleDone = () => {
        setShowSuccessToast(false);
        navigate(-1);
    };

    const handleCloseSuccessToast = () => {
        setShowSuccessToast(false);
        navigate(-1);
    };

    const selectedStaff = staffList.find(staff => staff.id === form.staff_id);
    const filteredStaffList = staffList.filter((staff) => {
        const staffName = (staff.name || staff.staff_name || `Staff ${staff.id}`).toLowerCase();
        return staffName.includes(staffFilter.toLowerCase());
    });

    const getOrderDisplayText = () => {
        let text = `${orderInfo?.staffName} - RM ${orderInfo?.amount?.toFixed(2)}`;
        if (orderInfo?.customAmount) {
            // Custom amount tab
            text += ` (Custom Amount${orderInfo?.customHours ? `, ${orderInfo?.customHours} Hour${orderInfo?.customHours !== "1" ? "s" : ""}` : ""})`;
        } else if (orderInfo?.customHours) {
            // Hourly tab
            text += ` (${orderInfo?.customHours} Hour${orderInfo?.customHours !== "1" ? "s" : ""})`;
        }
        return text;
    };

    return (
        <Page className="buyout-page">
            <Header title={t("Buyout")} orderListType="buyout" />
            <div className="content-panel">
                <div className="content">
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
                                                        <span>{t("Clear Selection")}</span>
                                                    </div>
                                                    {filteredStaffList.map((staff) => (
                                                        <div
                                                            key={staff.id}
                                                            className={`staff-dropdown-option ${String(form.staff_id) === String(staff.id) ? 'selected' : ''}`}
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
                            <Button
                                className="scan-staff-button font-medium"
                                onClick={handleScanStaff}
                                title={t("Scan Staff")}
                            >
                                <Icon f7="qrcode_viewfinder" />
                            </Button>
                        </div>
                    </div>

                    {!form.staff_id && (
                        <div className="staff-remark-message">
                            <i className="f7-icons">info</i>
                            <span>{t("Please select a staff member first")}</span>
                        </div>
                    )}

                    {form.staff_id && (
                        <>
                            <div className="buyout-segmented-label">
                                {t("Select Buyout Option")}
                            </div>
                            <div className="buyout-segmented-group">
                                <button
                                    type="button"
                                    className={`font-bold buyout-segment-btn${selectedBuyoutTab === "normal" ? " active" : ""}`}
                                    onClick={() => handleBuyoutTabChange("normal")}
                                >
                                    {t("Normal Package")}
                                </button>
                                <button
                                    type="button"
                                    className={`font-bold  buyout-segment-btn${selectedBuyoutTab === "hourly" ? " active" : ""}`}
                                    onClick={() => handleBuyoutTabChange("hourly")}
                                >
                                    {t("Hourly Package")}
                                </button>
                                <button
                                    type="button"
                                    className={`font-bold  buyout-segment-btn${selectedBuyoutTab === "custom" ? " active" : ""}`}
                                    onClick={() => handleBuyoutTabChange("custom")}
                                >
                                    {t("Custom Amount")}
                                </button>
                            </div>

                            {selectedBuyoutTab === "normal" && (
                                <>
                                    <BlockTitle className="font-medium font-bold" style={{ margin: "0", color: "#e1e1e2" }}>
                                        {t("Select Package")}
                                    </BlockTitle>
                                    <Block className="package-options">
                                        {buyoutType1.length > 0
                                            ? buyoutType1.map((item, index) => (
                                                <Button
                                                    key={index}
                                                    fill={selectedPackage?.id === item.id}
                                                    onClick={() => handleBuyoutType1Select(item)}
                                                    className="package-button font-medium font-bold"
                                                >
                                                    {item.name} - RM {item.amount} ({item.value} {item.value === 1 ? t("Hour") : t("Hours")})
                                                </Button>
                                            ))
                                            : (
                                                <div className="no-packages-message text-center" style={{ color: "white" }}>
                                                    {t("No packages available")}
                                                </div>
                                            )}
                                        {selectedPackage && (
                                            <Button
                                                outline
                                                onClick={() => handleCancelPackage()}
                                                className="cancel-package-button font-bold"
                                            >
                                                {t("Cancel Selection")}
                                            </Button>
                                        )}
                                    </Block>
                                </>
                            )}

                            {selectedBuyoutTab === "hourly" && (
                                <>
                                    <BlockTitle className="font-medium font-bold" style={{ margin: "0", color: "#e1e1e2" }}>
                                        {t("Select Hourly Package")}
                                    </BlockTitle>
                                    <Block className="package-options">
                                        {buyoutType2.length > 0
                                            ? buyoutType2.map((item, index) => (
                                                <Button
                                                    key={index}
                                                    fill={selectedBuyoutType2?.id === item.id}
                                                    onClick={() => handleBuyoutType2Select(item)}
                                                    className="package-button font-medium font-bold"
                                                >
                                                    {item.name} - RM {item.amount} / hour
                                                </Button>
                                            ))
                                            : (
                                                <div className="no-packages-message text-center" style={{ color: "white" }}>
                                                    {t("No hourly packages available")}
                                                </div>
                                            )}
                                        {selectedBuyoutType2 && (
                                            <Button
                                                outline
                                                color="red"
                                                onClick={() => handleCancelPackage()}
                                                className="cancel-package-button font-bold"
                                            >
                                                {t("Cancel Selection")}
                                            </Button>
                                        )}
                                    </Block>
                                    {selectedBuyoutType2 && (
                                        <Block className="custom-hour-input" style={{ padding: "0", marginTop: "0" }}>
                                            <label htmlFor="custom-hours" className="custom-hour-label">
                                                {t("Enter Custom Hours")} (RM {selectedBuyoutType2.amount} / hour) :
                                            </label>
                                            <input
                                                id="custom-hours"
                                                type="number"
                                                inputMode="decimal"
                                                step="0.01"
                                                min="0"
                                                placeholder={t("Custom Hours")}
                                                value={customHours}
                                                onChange={handleCustomHoursChange}
                                                className="custom-hour-field"
                                            />
                                        </Block>
                                    )}
                                </>
                            )}

                            {selectedBuyoutTab === "custom" && (
                                <>
                                    <Block className="custom-hour-input" style={{ padding: "0", marginTop: "0" }}>
                                        <label htmlFor="custom-amount" className="custom-hour-label">
                                            {t("Enter Custom Amount")} (RM):
                                        </label>
                                        <input
                                            id="custom-amount"
                                            type="text"
                                            inputMode="decimal"
                                            placeholder={t("Custom Amount")}
                                            value={customAmount}
                                            onChange={handleCustomAmountChange}
                                            className="custom-hour-field"
                                        />
                                    </Block>
                                    <Block className="custom-hour-input" style={{ padding: "0", marginTop: "0" }}>
                                        <label htmlFor="custom-amount-hours" className="custom-hour-label">
                                            {t("Enter Hours")}:
                                        </label>
                                        <input
                                            id="custom-amount-hours"
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            min="0"
                                            placeholder={t("Hours")}
                                            value={customAmountHours}
                                            onChange={handleCustomAmountHoursChange}
                                            className="custom-hour-field"
                                        />
                                    </Block>
                                </>
                            )}

                            {selectedPackage && (
                                <Block className="duration-display font-medium" style={{ marginTop: "0" }}>
                                    <div>
                                        <strong>
                                            {t("Selected Package")}:
                                        </strong>{" "}
                                        {selectedPackage.name} ({selectedPackage.value} {selectedPackage.value === 1 ? t("Hour") : t("Hours")})
                                    </div>
                                </Block>
                            )}

                            <div className="next-button-container">
                                <Button
                                    className="font-medium font-bold"
                                    fill
                                    onClick={() => handleNextClick()}
                                >
                                    {t("Place Order")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <Tools
                type="custom"
                active={showPaymentForm}
                data={{
                    title: t("Please Check the Details"),
                    confirmText: t("confirm"),
                    cancelText: t("Close")
                }}
                onConfirm={handleConfirmPopup}
                onCancel={handleClosePopup}
            >
                <div className="ktv-payment-form">
                    <div className="order-info text-center">
                        <p>
                            {getOrderDisplayText()}
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
                            <span className="section-title font-medium font-bold">{t("Order Total")}</span>
                        </div>
                        <div className="total-row">
                            <div className="total-item order-total-item">
                                <span className="total-label">{t("Order Total")}:</span>
                                <span className="total-value">RM {orderInfo.amount.toFixed(2)}</span>
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
                active={showSuccessToast}
                data={successToastData}
                onToastClose={handleCloseSuccessToast}
                onConfirm={handleDone}
            />
            <Tools
                type="toast"
                active={showAlertToast}
                data={alertToastData}
                onToastClose={handleCloseAlert}
            />
            <Tools
                type="toast"
                active={showPaymentErrorToast}
                data={paymentErrorToastData}
                onToastClose={handleClosePaymentError}
            />

            <QrScanner
                readerElementId="qr-reader-staff-buyout"
                active={showQrScanner}
                onActiveChange={setShowQrScanner}
                onDecoded={handleQrCodeScanned}
                isProcessingScanRef={isProcessingScanRef}
                showPreloaderOnCameraScan={false}
            />
        </Page>
    );
};

export default BuyoutPage;
