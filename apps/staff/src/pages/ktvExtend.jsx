import React, { useEffect, useMemo, useState } from "react";
import {
    Page,
    f7,
    Input,
    Button,
} from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import useCommon from "../components/action/Common";
import { Preferences } from "@capacitor/preferences";
import env from "../../environment.json";
import Tools from "../components/tools";
import {
    KTV_MIN_DURATION,
    KTV_MAX_DURATION,
    formatAmountInput,
    formatDurationInput,
    isValidAmount,
    isValidDuration,
    previewEndTimeFrom,
} from "../utils/ktvSession";

const EXTEND_DURATION_CHIPS = [30, 60];

const KtvExtendPage = ({ f7route }) => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const { ktv_session_lists, extend_order_ktv } = useAuthenticate();

    const orderId = f7route?.params?.orderId;
    const query = f7route?.query || {};

    const [session, setSession] = useState(() => ({
        id: orderId,
        staff_name: query.staff_name || "",
        table: query.table || "",
        end_time: query.end_time || "",
        can_extend: true,
    }));
    const [loadError, setLoadError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [durationMinutes, setDurationMinutes] = useState("");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [warningMessage, setWarningMessage] = useState("");

    const [paymentMethodsFromGlobal, setPaymentMethodsFromGlobal] = useState([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmounts, setPaymentAmounts] = useState({});
    const [grandTotal, setGrandTotal] = useState(0);
    const [feeBreakdown, setFeeBreakdown] = useState("");
    const [orderInfo, setOrderInfo] = useState({
        staffName: "",
        amount: 0,
        durationMinutes: "",
        tableNumber: "",
    });

    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successToastData, setSuccessToastData] = useState({});
    const [showAlertToast, setShowAlertToast] = useState(false);
    const [alertToastData, setAlertToastData] = useState({});
    const [showPaymentErrorToast, setShowPaymentErrorToast] = useState(false);
    const [paymentErrorToastData, setPaymentErrorToastData] = useState({});

    useEffect(() => {
        const handleLanguageChange = (event) => {
            i18n.changeLanguage(event.detail);
        };
        window.addEventListener("languageChanged", handleLanguageChange);
        return () => window.removeEventListener("languageChanged", handleLanguageChange);
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
            } catch (error) {
                console.error("Error loading global data for payment methods:", error);
            }
        };
        loadGlobal();
        fetchSession();
    }, [orderId]);

    const fetchSession = async () => {
        setIsLoading(true);
        try {
            const response = await ktv_session_lists({ private_key: env.private_key });
            if (response.status) {
                const list = Array.isArray(response.data) ? response.data : [];
                const found = list.find((item) => String(item.id) === String(orderId));
                if (found) {
                    setSession(found);
                    setLoadError(found.can_extend ? "" : t("This session cannot be extended"));
                } else if (query.end_time) {
                    setLoadError("");
                } else {
                    setLoadError(t("KTV session not found"));
                }
            } else if (!query.end_time) {
                setLoadError(response.message || t("Failed to load KTV sessions"));
            } else {
                setLoadError("");
            }
        } catch (error) {
            console.error("Error loading KTV session:", error);
            if (!query.end_time) {
                setLoadError(error.message || t("Failed to load KTV sessions"));
            }
        } finally {
            setIsLoading(false);
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

    const getMethodsForType = (typeId) => paymentMethodsFromGlobal.filter((pm) => pm.type_id === typeId);

    const handlePaymentAmountChange = (methodId, value) => {
        const formatted = formatAmountInput(value);
        setPaymentAmounts((prev) => ({
            ...prev,
            [methodId]: formatted,
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
        setFeeBreakdown(breakdownLines.join("\n"));
    }, [paymentAmounts, paymentMethodsFromGlobal, t]);

    const showAlert = (message) => {
        setAlertToastData({
            title: t("Alert"),
            message,
            buttonText: t("OK"),
        });
        setShowAlertToast(true);
    };

    const showPaymentError = (message, orderAmount, totalPayment) => {
        const errorMessage = `${message}\n\n${t("Order Amount")}: RM ${orderAmount.toFixed(2)}\n${t("Total Payment")}: RM ${totalPayment.toFixed(2)}`;
        setPaymentErrorToastData({
            title: t("Payment Error"),
            message: errorMessage,
            buttonText: t("Close"),
        });
        setShowPaymentErrorToast(true);
    };

    const handleNextClick = () => {
        if (!isValidDuration(Number(durationMinutes))) {
            showAlert(t("Please enter a valid duration (1-720 minutes)."));
            return;
        }
        if (!isValidAmount(amount)) {
            showAlert(t("Please enter a valid amount"));
            return;
        }
        if (session && session.can_extend === false) {
            showAlert(t("This session cannot be extended"));
            return;
        }

        const nextOrderInfo = {
            staffName: session?.staff_name || "",
            amount: parseFloat(amount),
            durationMinutes,
            tableNumber: session?.table || "",
        };
        setOrderInfo(nextOrderInfo);
        setPaymentAmounts({});
        setGrandTotal(0);
        setFeeBreakdown("");
        setShowPaymentForm(true);
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
            if (pm) {
                totalFees += p.amount * (parseFloat(pm.handle_fee_percentage || 0) || 0) / 100;
            }
        });
        const orderTotal = orderInfo.amount;

        if (subtotal < orderTotal) {
            showPaymentError(t("Total payment amount is less than the order amount"), orderTotal, subtotal);
            return;
        }
        if (subtotal > orderTotal) {
            showPaymentError(t("Total payment amount is more than the order amount"), orderTotal, subtotal);
            return;
        }
        if (payments.length === 0) {
            showPaymentError(t("Please enter at least one payment amount"), orderTotal, 0);
            return;
        }

        proceedExtend({
            payments,
            handle_fee: parseFloat(totalFees.toFixed(2)),
        });
        setShowPaymentForm(false);
    };

    const proceedExtend = (paymentData) => {
        f7.dialog.close();
        f7.preloader.show();

        extend_order_ktv({
            private_key: env.private_key,
            order_id: parseInt(orderId, 10),
            duration_minutes: parseInt(durationMinutes, 10),
            amount: parseFloat(amount),
            remark: remark || null,
            payments: paymentData.payments,
            handle_fee: paymentData.handle_fee,
        }).then((res) => {
            f7.preloader.hide();
            if (!res.status) {
                showAlert(res.message);
                return;
            }

            setWarningMessage(res.warning && res.warning_message ? res.warning_message : "");
            setSuccessToastData({
                title: t("Success"),
                message: t("Order successfully recorded!"),
                buttonText: t("Done"),
            });
            setShowSuccessToast(true);
        }).catch((error) => {
            f7.preloader.hide();
            showAlert(error.message || t("Error creating order"));
        });
    };

    const handleDone = () => {
        setShowSuccessToast(false);
        navigate("/ktv?tab=sessions");
    };

    const newEndTimePreview = previewEndTimeFrom(session?.end_time, Number(durationMinutes));

    const canShowForm = !isLoading && (Boolean(session?.end_time) || !loadError || loadError === t("This session cannot be extended"));

    return (
        <Page name="ktv-extend" className="ktv-page">
            <Header title={t("Extend time")} />
            <div className="content-panel">
                <div className="content">
                    {isLoading && (
                        <div className="ktv-empty">{t("Loading...")}</div>
                    )}
                    {!isLoading && loadError && (
                        <div className="ktv-warning">{loadError}</div>
                    )}
                    {warningMessage && (
                        <div className="ktv-warning">
                            {warningMessage}
                            <button type="button" className="ktv-warning-close" onClick={() => setWarningMessage("")}>
                                {t("Close")}
                            </button>
                        </div>
                    )}
                    {canShowForm && (
                    <>

                    <div className="ktv-preview">
                        <span className="form-label font-medium font-bold">{t("Staff")}</span>
                        <span>{session?.staff_name || "—"}</span>
                    </div>
                    {session?.table ? (
                        <div className="ktv-preview">
                            <span className="form-label font-medium font-bold">{t("Table")}</span>
                            <span>{session.table}</span>
                        </div>
                    ) : null}
                    <div className="ktv-preview">
                        <span className="form-label font-medium font-bold">{t("Current end time")}</span>
                        <span>{session?.end_time || "—"}</span>
                    </div>

                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Duration (minutes)")}</span>
                        <div className="ktv-chip-row">
                            {EXTEND_DURATION_CHIPS.map((chip) => (
                                <button
                                    key={chip}
                                    type="button"
                                    className={`ktv-chip${String(durationMinutes) === String(chip) ? " active" : ""}`}
                                    onClick={() => setDurationMinutes(String(chip))}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder={`${KTV_MIN_DURATION}–${KTV_MAX_DURATION}`}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(formatDurationInput(e.target.value))}
                            className="custom-hour-field ktv-text-field"
                        />
                    </div>
                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Amount")} (RM)</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                            className="custom-hour-field ktv-text-field"
                        />
                    </div>
                    <div className="form-group">
                        <span className="form-label font-medium font-bold">{t("Remark")}</span>
                        <input
                            type="text"
                            placeholder={t("Remark")}
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="custom-hour-field ktv-text-field"
                        />
                    </div>
                    {newEndTimePreview && (
                        <div className="ktv-preview">
                            <span className="form-label font-medium font-bold">{t("New end time")}</span>
                            <span>{newEndTimePreview}</span>
                        </div>
                    )}
                    <div className="next-button-container">
                        <Button className="font-medium font-bold" fill onClick={handleNextClick}>
                            {t("Extend time")}
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
                    confirmText: t("Confirm"),
                    cancelText: t("Close"),
                }}
                onConfirm={handleConfirmPopup}
                onCancel={() => setShowPaymentForm(false)}
            >
                <div className="ktv-payment-form">
                    <div className="order-info text-center">
                        <p>
                            {orderInfo.staffName} — RM {Number(orderInfo.amount || 0).toFixed(2)}
                            {orderInfo.durationMinutes ? ` (${orderInfo.durationMinutes} ${t("Minutes")})` : ""}
                            {orderInfo.tableNumber ? ` · ${t("Table")} ${orderInfo.tableNumber}` : ""}
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
                                                    <label className="payment-method-label font-large">
                                                        {t(pm.name)}
                                                        {pm.handle_fee_percentage && parseFloat(pm.handle_fee_percentage) > 0 ? ` (${pm.handle_fee_percentage}%)` : ""}
                                                    </label>
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
                                <span className="total-value">RM {Number(orderInfo.amount || 0).toFixed(2)}</span>
                            </div>
                            {feeBreakdown && (
                                <div className="fee-breakdown">
                                    {feeBreakdown.split("\n").map((line, index) => {
                                        const parts = line.split(": RM ");
                                        const label = parts[0] + (parts[1] ? ":" : "");
                                        const value = parts[1] ? `RM ${parts[1]}` : "";
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

            <Tools type="toast" active={showSuccessToast} data={successToastData} onToastClose={handleDone} onConfirm={handleDone} />
            <Tools type="toast" active={showAlertToast} data={alertToastData} onToastClose={() => setShowAlertToast(false)} />
            <Tools type="toast" active={showPaymentErrorToast} data={paymentErrorToastData} onToastClose={() => setShowPaymentErrorToast(false)} />
        </Page>
    );
};

export default KtvExtendPage;
