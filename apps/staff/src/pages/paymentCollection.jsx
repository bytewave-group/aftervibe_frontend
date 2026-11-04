import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { f7, Page, Button, Input, Icon } from 'framework7-react';
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import useCommon from "../components/action/Common";
import { useTokenAndUser } from "../components/action/user-data";
import env from "../../environment.json";
import Tools from "../components/tools";
import { Preferences } from "@capacitor/preferences";
import QrScanner from '../components/QrScanner';
import {
    buildPosReceipt,
    buildPaymentRows,
    apiOrderRef,
    printPosReceipt,
} from '../utils/androidReceiptPrinter';
import { HAND_OVER_STATUS, RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from '../constants/receiptStatus';

const EMPTY_PAYMENT_SUMMARY = { total: "0.00", paid: "0.00", remaining: "0.00", cta: "0.00" };
const AMOUNT_INPUT_REGEX = /^\d*\.?\d{0,2}$/;
const NEGATIVE_AMOUNT_INPUT_REGEX = /^-?\d*\.?\d{0,2}$/;
const todayIsoDate = () => new Date().toISOString().split("T")[0];

const isCtaPaymentMethod = (method) =>
    method?.type === "CTA" || method?.name === "CTA";

const formatPaymentValue = (val) => {
    if (val == null || val === '') return '0.00';
    const str = String(val).replace(/,/g, '');
    const num = parseFloat(str);
    return Number.isFinite(num) ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(val);
};

const getMummyLabel = (mummy, t) =>
    mummy?.name || mummy?.mummy_name || (mummy?.id != null ? `${t("Mummy")} ${mummy.id}` : "");

const normalizePaymentHistory = (rawHistory) => {
    const list = Array.isArray(rawHistory)
        ? rawHistory.filter((item) => item && item.id != null)
        : Object.keys(rawHistory || {})
            .map((key) => ({ ...rawHistory[key], _key: key }))
            .filter((item) => item && item.id != null);
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

const extractMummyId = (responseData) => {
    if (typeof responseData === 'object' && responseData !== null) {
        return responseData.id ?? responseData.mummy_id ?? responseData.user_id ?? null;
    }
    if (typeof responseData === 'number') return responseData;
    if (typeof responseData === 'string') {
        const parsed = parseInt(responseData, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};

const parseQrPayload = (decodedText) => {
    try {
        return JSON.parse(atob(decodedText));
    } catch {
        return decodedText;
    }
};

const showF7Toast = (text, type = 'error') => {
    f7.toast.show({ text, position: 'center', type, closeTimeout: 2000 });
};

const PaymentDetailRow = ({ label, value, highlight }) => (
    <div className={`payment-detail-row ${highlight ? 'payment-detail-row--highlight' : ''}`}>
        <span className="payment-detail-label font-medium font-bold">{label}</span>
        <span className="payment-detail-value font-medium font-bold">RM {formatPaymentValue(value)}</span>
    </div>
);

const PaymentHistoryItem = ({ item, t }) => {
    const dateStr = item.date || (item.created_at && item.created_at.split("T")[0]) || "—";
    const timeStr = item.created_at
        ? new Date(item.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
        : "";
    const statusText =
        item.status === HAND_OVER_STATUS.APPROVED
            ? t('Approved')
            : item.status === HAND_OVER_STATUS.REJECTED
                ? t('Rejected')
                : t('Pending');
    const statusClass =
        item.status === HAND_OVER_STATUS.APPROVED
            ? 'completed'
            : item.status === HAND_OVER_STATUS.REJECTED
                ? 'cancelled'
                : 'pending';
    const payments = Array.isArray(item.payments) ? item.payments : [];

    return (
        <div className="mummy-payment-history-item">
            <div className="mummy-payment-history-item-header">
                <span className="mummy-payment-history-ref">{item.unique_key || `#${item.id}`}</span>
                <span className={`mummy-payment-history-status status-${statusClass}`}>{statusText}</span>
            </div>
            <div className="mummy-payment-history-item-body">
                <div className="mummy-payment-history-row">
                    <span className="mummy-payment-history-label">{t("date")}</span>
                    <span className="mummy-payment-history-value">{dateStr}{timeStr ? ` · ${timeStr}` : ""}</span>
                </div>
                <div className="mummy-payment-history-row">
                    <span className="mummy-payment-history-label">{t("Amount")}</span>
                    <span className="mummy-payment-history-value mummy-payment-history-amount">RM {formatPaymentValue(item.total)}</span>
                </div>
                {payments.length > 0 && (
                    <div className="mummy-payment-history-payments-block">
                        <span className="mummy-payment-history-label mummy-payment-history-payments-label">{t("Payment methods")}</span>
                        <div className="mummy-payment-history-payments-list">
                            {payments.map((p, idx) => (
                                <div key={idx} className="mummy-payment-history-payment-item">
                                    <span className="mummy-payment-history-payment-method">{t(p.payment_method_name || "—")}</span>
                                    <span className="mummy-payment-history-payment-amount">RM {formatPaymentValue(p.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {item.handle_fee != null && parseFloat(item.handle_fee) > 0 && (
                    <div className="mummy-payment-history-row">
                        <span className="mummy-payment-history-label">{t("Handle Fee")}</span>
                        <span className="mummy-payment-history-value">RM {formatPaymentValue(item.handle_fee)}</span>
                    </div>
                )}
                {item.manager?.name && (
                    <div className="mummy-payment-history-row">
                        <span className="mummy-payment-history-label">{t("Checked by")}</span>
                        <span className="mummy-payment-history-value">{item.manager.name}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const PaymentHistoryList = ({ history, t }) => {
    const list = normalizePaymentHistory(history);
    if (list.length === 0) {
        return <div className="mummy-payment-history-empty">{t("No payment history for this period.")}</div>;
    }
    return list.map((item) => <PaymentHistoryItem key={item.id} item={item} t={t} />);
};

const ManagerPaymentSummary = ({ selectedMummyId, loading, details, t }) => {
    if (!selectedMummyId) {
        return <div className="manager-payment-summary-hint">{t("*Select a mummy to view the total")}</div>;
    }
    if (loading) {
        return <div className="manager-payment-summary-loading">{t("loading")}</div>;
    }
    const rows = [
        { label: t("Total"), value: details.total },
        { label: t("Paid"), value: details.paid },
        { label: t("Remaining"), value: details.remaining, highlight: true },
        { label: t("CTA"), value: details.cta },
    ];
    return rows.map(({ label, value, highlight }) => (
        <div
            key={label}
            className={`manager-payment-summary-row${highlight ? ' manager-payment-summary-row--remaining' : ''}`}
        >
            <span className="manager-payment-summary-label">{label}</span>
            <span className="manager-payment-summary-value">RM {formatPaymentValue(value)}</span>
        </div>
    ));
};

const PaymentCollectionPage = () => {
    const { navigate } = useCommon();
    const { t } = useTranslation();
    const { user } = useTokenAndUser();
    const { create_hand_over_account, payment_details, mummy_lists, verify_qr } = useAuthenticate();

    const userRole = user?.role || user?.user?.role;
    const roleLower = userRole?.toLowerCase();
    const isManager = roleLower === 'manager';
    const isMummyView = roleLower === 'mummy' || roleLower === 'doctor';

    const [paymentMethodsFromGlobal, setPaymentMethodsFromGlobal] = useState([]);
    const [form, setForm] = useState({
        amount: "",
        remark: "",
        selectedTypeId: null,
        selectedPaymentMethodId: null,
    });

    const [mummyList, setMummyList] = useState([]);
    const [selectedMummyId, setSelectedMummyId] = useState("");
    const [mummyFilter, setMummyFilter] = useState("");
    const [mummyDropdownOpen, setMummyDropdownOpen] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const isProcessingScanRef = useRef(false);

    const [paymentDetailsData, setPaymentDetailsData] = useState(null);
    const [pendingPaymentLoading, setPendingPaymentLoading] = useState(false);
    const [pendingPaymentError, setPendingPaymentError] = useState(null);

    const [mummyStartDate, setMummyStartDate] = useState(todayIsoDate);
    const [mummyEndDate, setMummyEndDate] = useState(todayIsoDate);

    const [managerPaymentDetails, setManagerPaymentDetails] = useState(EMPTY_PAYMENT_SUMMARY);
    const [managerPaymentDetailsLoading, setManagerPaymentDetailsLoading] = useState(false);
    const lastFetchedMummyIdRef = useRef(null);

    const [showToast, setShowToast] = useState(false);
    const [toastData, setToastData] = useState({});
    const [shouldNavigate, setShouldNavigate] = useState(false);
    const [showConfirmToast, setShowConfirmToast] = useState(false);
    const [confirmToastData, setConfirmToastData] = useState({});

    const hasFetchedMummyList = useRef(false);
    const hasLoadedGlobal = useRef(false);

    const showValidationToast = useCallback((message) => {
        setToastData({ title: t("Validation Error"), message, buttonText: t("OK") });
        setShowToast(true);
        setShouldNavigate(false);
    }, [t]);

    useEffect(() => {
        if (!isManager || hasLoadedGlobal.current) return;
        hasLoadedGlobal.current = true;
        (async () => {
            try {
                const { value } = await Preferences.get({ key: "global_data" });
                if (!value) return;
                const globalData = JSON.parse(value);
                const methods = globalData?.payment_methods ?? [];
                setPaymentMethodsFromGlobal(Array.isArray(methods) ? methods : []);
            } catch (e) {
                console.error("Error loading global data for payment methods:", e);
            }
        })();
    }, [isManager]);

    useEffect(() => {
        if (!isMummyView || !mummyStartDate || !mummyEndDate) return;
        (async () => {
            setPendingPaymentLoading(true);
            setPendingPaymentError(null);
            try {
                const payload = { private_key: env.private_key, user_type: roleLower };
                if (mummyStartDate) payload.start_date = mummyStartDate;
                if (mummyEndDate) payload.end_date = mummyEndDate;
                const response = await payment_details(payload);
                if (response.status && response.data) {
                    setPaymentDetailsData(response.data);
                } else {
                    setPendingPaymentError(response.message || t("Failed to load payment details"));
                }
            } catch (e) {
                console.error("Error fetching payment details:", e);
                setPendingPaymentError(t("An error occurred. Please try again."));
            } finally {
                setPendingPaymentLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMummyView, mummyStartDate, mummyEndDate, roleLower]);

    useEffect(() => {
        if (!isManager || hasFetchedMummyList.current) return;
        hasFetchedMummyList.current = true;
        (async () => {
            try {
                f7.preloader.show();
                const response = await mummy_lists({ private_key: env.private_key });
                setMummyList(response.status ? response.data || [] : []);
            } catch (error) {
                console.error("Error fetching mummy list:", error);
                setMummyList([]);
            } finally {
                f7.preloader.hide();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isManager]);

    useEffect(() => {
        if (!isManager) return;
        if (!selectedMummyId) {
            setManagerPaymentDetails(EMPTY_PAYMENT_SUMMARY);
            lastFetchedMummyIdRef.current = null;
            return;
        }
        if (lastFetchedMummyIdRef.current === selectedMummyId) return;
        lastFetchedMummyIdRef.current = selectedMummyId;
        (async () => {
            setManagerPaymentDetailsLoading(true);
            try {
                const response = await payment_details({
                    private_key: env.private_key,
                    user_type: "mummy",
                    user_id: parseInt(selectedMummyId, 10),
                });
                if (response.status && response.data) {
                    setManagerPaymentDetails({
                        total: response.data.total ?? "0.00",
                        paid: response.data.paid ?? "0.00",
                        remaining: response.data.remaining ?? "0.00",
                        cta: response.data.cta ?? "0.00",
                    });
                } else {
                    setManagerPaymentDetails(EMPTY_PAYMENT_SUMMARY);
                }
            } catch (e) {
                console.error("Error fetching manager payment details:", e);
                setManagerPaymentDetails(EMPTY_PAYMENT_SUMMARY);
            } finally {
                setManagerPaymentDetailsLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isManager, selectedMummyId]);

    useEffect(() => {
        if (!mummyDropdownOpen) return;
        const handleClickOutside = (event) => {
            if (!event.target.closest('.mummy-custom-dropdown')) {
                setMummyDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [mummyDropdownOpen]);

    const handleMummyChange = useCallback((mummyId) => {
        setSelectedMummyId(mummyId);
        setMummyDropdownOpen(false);
        setMummyFilter("");
    }, []);

    const handleQrCodeScanned = useCallback(async (qrCode) => {
        f7.preloader.show();
        try {
            const verifyResponse = await verify_qr({ qr: qrCode, type: VERIFY_QR_TYPE.HAND_OVER });
            if (!verifyResponse.status) {
                handleMummyChange("");
                showF7Toast(verifyResponse.message || t("QR code verification failed"));
                return;
            }

            const responseData = verifyResponse.data || verifyResponse;
            const role = (responseData && typeof responseData === 'object' && responseData.role)
                ? String(responseData.role).toLowerCase()
                : '';
            if (role !== 'mummy') {
                handleMummyChange("");
                showF7Toast(t("Invalid QR code - mummy only"));
                return;
            }

            const mummyId = extractMummyId(responseData);
            if (!mummyId) {
                handleMummyChange("");
                showF7Toast(t("Invalid QR code format"));
                return;
            }

            const idStr = mummyId.toString();
            let foundMummy = mummyList.find((m) => m.id.toString() === idStr);
            if (!foundMummy) {
                try {
                    const refreshResponse = await mummy_lists({ private_key: env.private_key });
                    if (refreshResponse.status) {
                        const refreshedList = refreshResponse.data || [];
                        setMummyList(refreshedList);
                        foundMummy = refreshedList.find((m) => m.id.toString() === idStr);
                    }
                } catch (refreshError) {
                    console.error("Error refreshing mummy list:", refreshError);
                }
            }

            if (foundMummy) {
                handleMummyChange(idStr);
                showF7Toast(t("Mummy selected successfully"), 'success');
            } else {
                handleMummyChange("");
                showF7Toast(t("Mummy not found in the list"));
            }
        } catch (error) {
            console.error("Error processing QR code:", error);
            handleMummyChange("");
            showF7Toast(t("Error processing QR code"));
        } finally {
            isProcessingScanRef.current = false;
            f7.preloader.hide();
        }
    }, [handleMummyChange, mummyList, mummy_lists, t, verify_qr]);

    const uniqueTypes = useMemo(() => {
        const byTypeId = new Map();
        paymentMethodsFromGlobal.forEach((pm) => {
            if (!byTypeId.has(pm.type_id)) {
                byTypeId.set(pm.type_id, { type_id: pm.type_id, type: pm.type });
            }
        });
        return Array.from(byTypeId.values());
    }, [paymentMethodsFromGlobal]);

    const methodsForSelectedType = useMemo(() => {
        if (form.selectedTypeId == null) return [];
        return paymentMethodsFromGlobal.filter((pm) => pm.type_id === form.selectedTypeId);
    }, [paymentMethodsFromGlobal, form.selectedTypeId]);

    const needsSpecificMethodSelection = methodsForSelectedType.length > 1;
    const resolvedPaymentMethod =
        needsSpecificMethodSelection
            ? paymentMethodsFromGlobal.find((pm) => pm.id === form.selectedPaymentMethodId)
            : methodsForSelectedType[0] ?? null;

    const isCtaSelected = useMemo(() => {
        if (isCtaPaymentMethod(resolvedPaymentMethod)) return true;
        if (form.selectedTypeId == null) return false;
        const selectedType = uniqueTypes.find((type) => type.type_id === form.selectedTypeId);
        return selectedType?.type === "CTA";
    }, [resolvedPaymentMethod, form.selectedTypeId, uniqueTypes]);

    const handleFee = useMemo(() => {
        const amount = parseFloat(form.amount) || 0;
        if (amount <= 0 || !resolvedPaymentMethod) return 0;
        const feePct = parseFloat(resolvedPaymentMethod.handle_fee_percentage || 0) || 0;
        return parseFloat((amount * (feePct / 100)).toFixed(2));
    }, [form.amount, resolvedPaymentMethod]);

    const filteredMummyList = useMemo(() => {
        const query = mummyFilter.toLowerCase();
        return mummyList.filter((mummy) => getMummyLabel(mummy, t).toLowerCase().includes(query));
    }, [mummyList, mummyFilter, t]);

    const selectedMummy = mummyList.find((m) => m.id.toString() === selectedMummyId.toString());

    const buildPaymentCollectionReceiptText = useCallback((apiData, layout) => {
        const method = resolvedPaymentMethod;
        const totalAmount = parseFloat(form.amount) || 0;
        const metaRows = [];
        if (isManager && selectedMummy) {
            metaRows.push({
                label: 'Mummy',
                value: selectedMummy.name || selectedMummy.mummy_name || String(selectedMummy.id),
            });
        }
        if (form.remark?.trim()) {
            metaRows.push({ label: 'Remark', value: form.remark.trim() });
        }
        let paymentRows = method && totalAmount !== 0
            ? buildPaymentRows({
                payLater: false,
                payments: [{ payment_method_id: method.id, amount: totalAmount }],
                handleFee: Number(handleFee) || 0,
                paymentMethodsFromGlobal,
            })
            : [];
        if (method && paymentRows.length === 0) {
            let pmValue = method.name ?? '';
            if (method.type) pmValue += ` (${method.type})`;
            paymentRows.push({ label: 'Payment Method', value: pmValue });
        }
        return buildPosReceipt({
            title: 'Payment Confirmation',
            orderId: apiOrderRef(apiData),
            status: resolveReceiptStatusLabel(apiData, RECEIPT_STATUS_KIND.HAND_OVER),
            metaRows,
            items: [{ name: 'Payment Collection', total: totalAmount }],
            total: totalAmount,
            paymentRows,
            receiptType: 'payment',
            hideQty: true,
            layout,
        });
    }, [form.amount, form.remark, handleFee, isManager, paymentMethodsFromGlobal, resolvedPaymentMethod, selectedMummy]);

    const handleAmountChange = (value) => {
        const amountRegex = isCtaSelected ? NEGATIVE_AMOUNT_INPUT_REGEX : AMOUNT_INPUT_REGEX;
        if (value === '' || amountRegex.test(value)) {
            setForm((prev) => ({ ...prev, amount: value }));
        }
    };

    const handleSend = () => {
        if (isManager && !selectedMummyId) {
            showValidationToast(t("Please select a mummy"));
            return;
        }
        const totalAmount = parseFloat(form.amount);
        if (form.amount === '' || !Number.isFinite(totalAmount) || totalAmount === 0) {
            showValidationToast(t("Please enter total amount"));
            return;
        }
        if (!isCtaSelected && totalAmount < 0) {
            showValidationToast(t("Please enter total amount"));
            return;
        }
        if (form.selectedTypeId == null || (needsSpecificMethodSelection && form.selectedPaymentMethodId == null)) {
            showValidationToast(t("Please select payment method"));
            return;
        }

        const method = resolvedPaymentMethod;
        const totalAmountStr = totalAmount.toFixed(2);
        let confirmationMessage = `${t("Payment Details")}:\n`;
        if (isManager && selectedMummy) {
            confirmationMessage += `${t("Mummy")}: ${getMummyLabel(selectedMummy, t)}\n`;
        }
        confirmationMessage += `${t("Total Amount")}: RM ${totalAmountStr}\n`;
        if (handleFee > 0) {
            const feePct = parseFloat(method?.handle_fee_percentage || 0) || 0;
            confirmationMessage += `${t("Handle Fee")} (${feePct}%): RM ${handleFee.toFixed(2)}\n`;
        }
        confirmationMessage += `${t("Payment Method")}: ${method?.name ?? ""}`;
        if (method?.type) confirmationMessage += ` (${method.type})`;
        confirmationMessage += `\n`;
        if (form.remark?.trim()) {
            confirmationMessage += `${t("Remark")}: ${form.remark.trim()}\n`;
        }
        confirmationMessage += `\n${t("Are you sure you want to submit this payment?")}`;

        setConfirmToastData({
            title: t("Confirm Payment"),
            message: confirmationMessage,
            confirmText: t("Confirm"),
            cancelText: t("Cancel"),
        });
        setShowConfirmToast(true);
    };

    const handleConfirmPayment = async () => {
        setShowConfirmToast(false);
        const method = resolvedPaymentMethod;
        if (!method) {
            showValidationToast(t("Please select payment method"));
            return;
        }

        const totalAmount = parseFloat(form.amount);
        const payload = {
            private_key: env.private_key,
            user_type: "mummy",
            amount: totalAmount,
            payments: [{ payment_method_id: method.id, amount: totalAmount }],
            remark: form.remark?.trim() || null,
            handle_fee: parseFloat(handleFee.toFixed(2)),
            target_type: "mummy",
        };
        if (isManager && selectedMummyId) {
            payload.target_id = parseInt(selectedMummyId, 10);
        }

        f7.preloader.show();
        try {
            const response = await create_hand_over_account(payload);
            if (response.status) {
                void printPosReceipt((layout) => buildPaymentCollectionReceiptText(response.data, layout));
                setToastData({ title: t("Success"), message: response.message, buttonText: t("OK") });
                setShowToast(true);
                setForm({ amount: "", remark: "", selectedTypeId: null, selectedPaymentMethodId: null });
                setSelectedMummyId("");
                setShouldNavigate(true);
            } else {
                setToastData({ title: t("Error"), message: response.message, buttonText: t("OK") });
                setShowToast(true);
                setShouldNavigate(false);
            }
        } catch (error) {
            console.error("Error submitting payment:", error);
            setToastData({ title: t("Error"), message: t("An error occurred. Please try again."), buttonText: t("OK") });
            setShowToast(true);
            setShouldNavigate(false);
        } finally {
            f7.preloader.hide();
        }
    };

    const handleToastClose = () => {
        setShowToast(false);
        setToastData({});
        if (shouldNavigate) {
            setShouldNavigate(false);
            navigate(-1);
        }
    };

    if (isMummyView) {
        return (
            <Page className="payment-collection-page">
                <Header title={t("Pending Payment")} />
                <div className="content-panel">
                    <div className="content">
                        <div className="payment-collection-container">
                            <div className="date-picker-container">
                                <div className="start-date-container">
                                    <label htmlFor="mummy-start-date" className="form-label">{t("Start Date")}</label>
                                    <div className="form-input-container">
                                        <Input
                                            type="date"
                                            value={mummyStartDate}
                                            onChange={(e) => setMummyStartDate(e.target.value || todayIsoDate())}
                                            id="mummy-start-date"
                                            className="form-input date-picker"
                                        />
                                    </div>
                                </div>
                                <div className="end-date-container">
                                    <label htmlFor="mummy-end-date" className="form-label">{t("End Date")}</label>
                                    <div className="form-input-container">
                                        <Input
                                            type="date"
                                            value={mummyEndDate}
                                            onChange={(e) => setMummyEndDate(e.target.value || todayIsoDate())}
                                            id="mummy-end-date"
                                            className="form-input date-picker"
                                        />
                                    </div>
                                </div>
                            </div>
                            {pendingPaymentLoading && (
                                <div className="font-medium">{t("loading")}</div>
                            )}
                            {pendingPaymentError && (
                                <div className="payment-pending-error font-medium">{pendingPaymentError}</div>
                            )}
                            {!pendingPaymentLoading && !pendingPaymentError && paymentDetailsData && (
                                <div className="payment-details-pending">
                                    <div className="payment-details-section payment-details-summary">
                                        <div className="payment-details-section-title underline">{t("Summary")}</div>
                                        <PaymentDetailRow label={t("Total")} value={paymentDetailsData.total} />
                                        <PaymentDetailRow label={t("Paid")} value={paymentDetailsData.paid} />
                                        <PaymentDetailRow label={t("Remaining Amount")} value={paymentDetailsData.remaining} highlight />
                                        <PaymentDetailRow label={t("CTA")} value={paymentDetailsData.cta} />
                                    </div>
                                    {paymentDetailsData.history && typeof paymentDetailsData.history === "object" && (
                                        <div className="payment-details-section mummy-payment-history-section">
                                            <div className="payment-details-section-title underline">{t("Payment History")}</div>
                                            <div className="mummy-payment-history-list">
                                                <PaymentHistoryList history={paymentDetailsData.history} t={t} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Page>
        );
    }

    if (!isManager) {
        return (
            <Page className="payment-collection-page">
                <Header title={t("Payment Collection")} />
                <div className="content-panel">
                    <div className="content">
                        <div className="payment-collection-container">
                            <div className="font-medium">{t("You do not have access to this page.")}</div>
                        </div>
                    </div>
                </div>
            </Page>
        );
    }

    return (
        <Page className="payment-collection-page">
            <Header title={t("Payment Collection")} showHandOver />
            <div className="content-panel">
                <div className="content">
                    <div className="payment-collection-container">
                        <div className="payment-collection-desc font-large font-bold">
                            {t("Enter amount")}
                        </div>
                        <div className="payment-methods">
                            <div className="form-group">
                                <span className="form-label font-medium font-bold">{t("Mummy")}</span>
                                <div className="form-input-container font-medium mummy-input-with-scan">
                                    <div className="mummy-custom-dropdown">
                                        <div
                                            className="selected-mummy"
                                            onClick={() => {
                                                setMummyDropdownOpen((prev) => !prev);
                                                if (!mummyDropdownOpen) setMummyFilter("");
                                            }}
                                        >
                                            {selectedMummy ? (
                                                <span>{getMummyLabel(selectedMummy, t)}</span>
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
                                                        onChange={(e) => setMummyFilter(e.target.value)}
                                                        placeholder={t("Search mummy...")}
                                                        className="mummy-search-input"
                                                        clearButton
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="mummy-options-list">
                                                    {filteredMummyList.length > 0 ? (
                                                        <>
                                                            <div className="mummy-dropdown-option" onClick={() => handleMummyChange("")}>
                                                                <span>{t("Select Mummy")}</span>
                                                            </div>
                                                            {filteredMummyList.map((mummy) => (
                                                                <div
                                                                    key={mummy.id}
                                                                    className={`mummy-dropdown-option ${selectedMummyId === mummy.id.toString() ? "selected" : ""}`}
                                                                    onClick={() => handleMummyChange(mummy.id.toString())}
                                                                >
                                                                    <span>{getMummyLabel(mummy, t)}</span>
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
                                        onClick={() => setShowQrScanner(true)}
                                        title={t("Scan Mummy")}
                                    >
                                        <Icon f7="qrcode_viewfinder" />
                                    </Button>
                                </div>
                            </div>
                            <div className="manager-payment-summary">
                                <ManagerPaymentSummary
                                    selectedMummyId={selectedMummyId}
                                    loading={managerPaymentDetailsLoading}
                                    details={managerPaymentDetails}
                                    t={t}
                                />
                            </div>
                            <div className="payment-method-dropdown-row">
                                <div className="payment-method">
                                    <label className="font-bold">{t("Select Payment Method")}</label>
                                    <select
                                        className="payment-collection-select"
                                        value={form.selectedTypeId ?? ""}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? null : Number(e.target.value);
                                            setForm((prev) => ({ ...prev, selectedTypeId: value, selectedPaymentMethodId: null }));
                                        }}
                                    >
                                        <option value="">{t("Select Payment Method")}</option>
                                        {uniqueTypes.map((type) => (
                                            <option key={type.type_id} value={type.type_id}>
                                                {t(type.type)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {needsSpecificMethodSelection && (
                                <div className="payment-method-dropdown-row">
                                    <div className="payment-method">
                                        <label className="font-bold">{t("Select option")}</label>
                                        <select
                                            className="payment-collection-select"
                                            value={form.selectedPaymentMethodId ?? ""}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? null : Number(e.target.value);
                                                setForm((prev) => ({ ...prev, selectedPaymentMethodId: value }));
                                            }}
                                        >
                                            <option value="">{t("Select option")}</option>
                                            {methodsForSelectedType.map((pm) => (
                                                <option key={pm.id} value={pm.id}>
                                                    {t(pm.name)}{pm.handle_fee_percentage && parseFloat(pm.handle_fee_percentage) > 0 ? ` (${pm.handle_fee_percentage}%)` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="payment-row">
                                <div className="payment-method">
                                    <label className="font-bold">{t("Total Amount")}</label>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => handleAmountChange(e.target.value)}
                                        placeholder={t("Enter total amount")}
                                        min={isCtaSelected ? undefined : "0"}
                                        step="0.01"
                                    />
                                    {isCtaSelected && (
                                        <div className="remark-message font-small text-justify">
                                            {t("You may enter a negative value to deduct CTA balance.")}
                                        </div>
                                    )}
                                    {handleFee > 0 && resolvedPaymentMethod && (
                                        <div className="payment-handle-fee-line">
                                            *{t("Handle Fee")} ({parseFloat(resolvedPaymentMethod.handle_fee_percentage || 0) || 0}%): RM {handleFee.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="payment-row">
                                <div className="payment-method">
                                    <label className="font-bold">{t("Remark")} ({t("Optional")})</label>
                                    <div className="form-input-container">
                                        <textarea
                                            value={form.remark}
                                            onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                                            placeholder={t("Enter remarks (optional)")}
                                            className="form-input form-textarea"
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="send-button-container">
                                <Button fill className="send-button font-bold" onClick={handleSend}>
                                    {t("Send")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Tools
                type="toast"
                active={showConfirmToast}
                data={confirmToastData}
                onConfirm={handleConfirmPayment}
                onCancel={() => setShowConfirmToast(false)}
                onToastClose={() => setShowConfirmToast(false)}
            />
            <Tools type="toast" active={showToast} data={toastData} onToastClose={handleToastClose} />

            <QrScanner
                readerElementId="qr-reader-payment-collection"
                active={showQrScanner}
                onActiveChange={setShowQrScanner}
                onDecoded={(value) => handleQrCodeScanned(parseQrPayload(value))}
                isProcessingScanRef={isProcessingScanRef}
                enabled={isManager}
                showPreloaderOnCameraScan={false}
            />
        </Page>
    );
};

export default PaymentCollectionPage;
