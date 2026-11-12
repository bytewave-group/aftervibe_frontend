import React, { useEffect, useRef, useState } from "react";
import { Page, f7, Icon } from "framework7-react";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate, { VERIFY_QR_TYPE } from "../actions/Authenticate";
import useCommon from "../components/action/Common";
import QrScanner from "../components/QrScanner";
import env from "../../environment.json";
import { STAFF_WORK_TYPE } from "../constants/staffWorkType";
import {
    buildConfirmationSlipReceipt,
    buildPaymentRows,
    apiOrderRef,
    printPosReceipt,
} from "../utils/androidReceiptPrinter";
import { RECEIPT_STATUS_KIND, resolveReceiptStatusLabel } from "../constants/receiptStatus";

const staffLabel = (staff) =>
    staff?.name || staff?.staff_name || (staff?.id != null ? `Staff ${staff.id}` : "");

const mummyLabel = (mummy) =>
    mummy?.name || mummy?.mummy_name || (mummy?.id != null ? `Mummy ${mummy.id}` : "");

/** Quick amounts (RM) for the flower amount; the field still accepts any value with up to 2 decimals. */
const QUICK_AMOUNTS = [50, 100, 200, 500];
const AMOUNT_STEP = 10;
/** Extra quick amounts learned from recent claims (backend: flower_frequent_amounts). */
const FREQUENT_AMOUNT_LIMIT = 4;

const sameAmount = (a, b) => Math.round(Number(a) * 100) === Math.round(Number(b) * 100);

/** Keeps positive, unique amounts that are not already fixed quick buttons. */
const normalizeFrequentAmounts = (rows) => {
    const result = [];
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const amount = Math.round(Number(row?.amount ?? row) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) return;
        if (QUICK_AMOUNTS.some((fixed) => sameAmount(fixed, amount))) return;
        if (result.some((existing) => sameAmount(existing, amount))) return;
        result.push(amount);
    });
    return result.slice(0, FREQUENT_AMOUNT_LIMIT);
};

const formatQuickAmount = (value) =>
    Number.isInteger(value) ? String(value) : value.toFixed(2);
/** Show the staff search box once the list gets long. */
const STAFF_SEARCH_MIN = 9;

const initialsOf = (name) => {
    const text = String(name || "").replace(/^[A-Za-z]\d*_/, "").trim();
    return (Array.from(text)[0] || "?").toUpperCase();
};

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0.00";
    return amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Tenant setting values arrive as 1 / "1" / "0" / true; treat anything else as off. */
const isSettingEnabled = (value) => value === true || value === 1 || value === "1" || value === "true";

const FlowerTrackingPage = () => {
    const {
        staff_work_lists,
        mummy_lists,
        flower_frequent_amounts,
        create_claim_flower_record_from_staff,
        verify_qr,
        global: fetchGlobal,
    } = useAuthenticate();
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [staffList, setStaffList] = useState([]);
    const [mummyList, setMummyList] = useState([]);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [selectedMummyId, setSelectedMummyId] = useState(null);
    const [staffQr, setStaffQr] = useState(null);
    const [mummyQr, setMummyQr] = useState(null);
    const [mummyRequiresQr, setMummyRequiresQr] = useState(false);
    const [staffRequiresQr, setStaffRequiresQr] = useState(false);
    const [scanTarget, setScanTarget] = useState(null);
    const scanTargetRef = useRef(null);
    const isProcessingScanRef = useRef(false);
    const [flowerAmount, setFlowerAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [staffQuery, setStaffQuery] = useState("");
    const [brokenAvatars, setBrokenAvatars] = useState(() => new Set());
    const [frequentAmounts, setFrequentAmounts] = useState([]);

    useEffect(() => {
        const handleLanguageChange = (event) => {
            i18n.changeLanguage(event.detail);
        };
        window.addEventListener("languageChanged", handleLanguageChange);
        return () => window.removeEventListener("languageChanged", handleLanguageChange);
    }, [i18n]);

    useEffect(() => {
        let cancelled = false;
        const fetchLists = async () => {
            try {
                f7.preloader.show();
                const [staffResponse, mummyResponse, globalResponse] = await Promise.all([
                    staff_work_lists({ private_key: env.private_key, type: STAFF_WORK_TYPE.CLAIM_FLOWER }),
                    mummy_lists({ private_key: env.private_key }),
                    fetchGlobal(),
                ]);
                if (cancelled) return;
                const settings = globalResponse?.data?.settings || {};
                setMummyRequiresQr(isSettingEnabled(settings.claim_flower_mummy_require_qr));
                setStaffRequiresQr(isSettingEnabled(settings.claim_flower_staff_require_qr));
                if (staffResponse.status) {
                    setStaffList(staffResponse.data || []);
                } else {
                    setStaffList([]);
                    f7.toast.show({
                        text: staffResponse.message || "An error occurred",
                        position: "center",
                        closeTimeout: 2000,
                    });
                }
                if (mummyResponse.status) {
                    setMummyList(mummyResponse.data || []);
                } else {
                    setMummyList([]);
                    f7.toast.show({
                        text: mummyResponse.message || "An error occurred",
                        position: "center",
                        closeTimeout: 2000,
                    });
                }
            } catch (error) {
                console.error("Error fetching flower tracking lists:", error);
                if (!cancelled) {
                    setStaffList([]);
                    setMummyList([]);
                }
            } finally {
                f7.preloader.hide();
            }
        };
        fetchLists();
        // Optional extra chips; any failure just leaves the fixed ones.
        flower_frequent_amounts({ exclude: QUICK_AMOUNTS, limit: FREQUENT_AMOUNT_LIMIT })
            .then((response) => {
                if (!cancelled && response?.status) {
                    setFrequentAmounts(normalizeFrequentAmounts(response.data));
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            f7.preloader.hide();
        };
    }, []);

    const selectedStaff = staffList.find((staff) => String(staff.id) === String(selectedStaffId));
    const selectedMummy = mummyList.find((mummy) => String(mummy.id) === String(selectedMummyId));

    const showToast = (text) => {
        f7.toast.show({
            text,
            position: "center",
            closeTimeout: 2000,
        });
    };

    const resetSelection = () => {
        setSelectedStaffId(null);
        setSelectedMummyId(null);
        setStaffQr(null);
        setMummyQr(null);
        setFlowerAmount("");
        setStaffQuery("");
    };

    /** Opens the scanner to confirm the tapped mummy / staff; they are only selected once their own QR is scanned. */
    const openConfirmScanner = (target) => {
        scanTargetRef.current = target;
        setScanTarget(target);
    };

    const handleScannerActiveChange = (open) => {
        if (!open) {
            setScanTarget(null);
        }
    };

    const handleSelectMummy = (mummy) => {
        if (mummyRequiresQr) {
            openConfirmScanner({ role: "mummy", id: mummy.id, name: mummyLabel(mummy) });
            return;
        }
        setSelectedMummyId(mummy.id);
    };

    const handleSelectStaff = (staff) => {
        if (selectedMummyId == null || selectedMummyId === "") {
            showToast(t("Please select a mummy first"));
            return;
        }
        if (staffRequiresQr) {
            openConfirmScanner({ role: "staff", id: staff.id, name: staffLabel(staff) });
            return;
        }
        setSelectedStaffId(staff.id);
    };

    /** Verifies the scanned QR belongs to the mummy / staff that was tapped, then selects them. */
    const handleQrCodeScanned = async (qrCode) => {
        const target = scanTargetRef.current;
        if (!target) {
            isProcessingScanRef.current = false;
            return;
        }

        f7.preloader.show();
        try {
            const verifyResponse = await verify_qr({ qr: qrCode, type: VERIFY_QR_TYPE.ORDER });
            if (!verifyResponse?.status) {
                showToast(verifyResponse?.message || t("QR code verification failed"));
                return;
            }

            const user = verifyResponse.data || {};
            const role = String(user.role || "").toLowerCase();
            const userId = user.id ?? user.user_id;

            if (role !== target.role) {
                showToast(t(target.role === "mummy" ? "Invalid QR code - mummy only" : "Invalid QR code - staff only"));
                return;
            }
            if (String(userId) !== String(target.id)) {
                showToast(t(target.role === "mummy" ? "QR code does not match the selected mummy" : "QR code does not match the selected staff"));
                return;
            }

            if (target.role === "mummy") {
                setSelectedMummyId(target.id);
                setMummyQr(qrCode);
            } else {
                setSelectedStaffId(target.id);
                setStaffQr(qrCode);
            }
        } catch (error) {
            console.error("Error verifying flower tracking QR:", error);
            showToast(t("QR code verification failed"));
        } finally {
            scanTargetRef.current = null;
            isProcessingScanRef.current = false;
            f7.preloader.hide();
        }
    };

    const handleFlowerAmountChange = (e) => {
        const value = e.target.value;
        if (value === "" || value === ".") {
            setFlowerAmount(value);
            return;
        }
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setFlowerAmount(value);
        }
    };

    const setAmountValue = (value) => {
        const next = Math.max(0, Math.round(value * 100) / 100);
        setFlowerAmount(next > 0 ? String(next) : "");
    };

    const stepAmount = (delta) => {
        const current = parseFloat(flowerAmount) || 0;
        setAmountValue(current + delta);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (selectedMummyId == null || selectedMummyId === "") {
            showToast(t("Please select a mummy"));
            return;
        }
        if (selectedStaffId == null || selectedStaffId === "") {
            showToast(t("Please select a staff"));
            return;
        }
        const amount = parseFloat(flowerAmount);
        if (!flowerAmount || !Number.isFinite(amount) || amount <= 0) {
            showToast(t("Please enter a valid flower amount"));
            return;
        }

        const updatedForm = {
            staff_id: parseInt(selectedStaffId, 10),
            mummy_id: null,
            given_mummy_id: parseInt(selectedMummyId, 10),
            staff_qr: staffRequiresQr ? staffQr : null,
            mummy_qr: mummyRequiresQr ? mummyQr : null,
            amount,
            remark: null,
        };

        try {
            setSubmitting(true);
            f7.preloader.show();
            const response = await create_claim_flower_record_from_staff(updatedForm);
            if (response.status) {
                const staffName = staffLabel(selectedStaff);
                const givenMummyName = mummyLabel(selectedMummy);
                void printPosReceipt((layout) => buildConfirmationSlipReceipt({
                    serviceName: "Claim Flower",
                    orderId: apiOrderRef(response.data),
                    status: resolveReceiptStatusLabel(response.data, RECEIPT_STATUS_KIND.FLOWER_RECORD, { payLater: true }),
                    partyRows: [
                        { label: "Mummy", value: givenMummyName },
                        { label: "Staff", value: staffName },
                    ],
                    amount,
                    paymentRows: buildPaymentRows({
                        payLater: true,
                        payments: null,
                        handleFee: 0,
                        paymentMethodsFromGlobal: [],
                    }),
                    payLater: true,
                    layout,
                }));
                showToast(response.message);
                resetSelection();
            } else {
                showToast(response.message || t("An error occurred"));
            }
        } catch (error) {
            console.error("Error creating flower tracking record:", error);
            showToast(t("An error occurred"));
        } finally {
            setSubmitting(false);
            f7.preloader.hide();
        }
    };

    const parsedAmount = parseFloat(flowerAmount);
    const amountValid = flowerAmount !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
    const amountInvalid = flowerAmount !== "" && flowerAmount !== "." && !amountValid;
    const mummyDone = Boolean(selectedMummy);
    const staffDone = Boolean(selectedStaff);
    const canSubmit = mummyDone && staffDone && amountValid && !submitting;
    const query = staffQuery.trim().toLowerCase();
    const visibleStaff = query
        ? staffList.filter((staff) => staffLabel(staff).toLowerCase().includes(query))
        : staffList;

    const stepBadge = (number, done, active) => (
        <span className={`flower-tracking-step-badge ${done ? "is-done" : active ? "is-active" : ""}`} aria-hidden="true">
            {done ? <Icon f7="checkmark_alt" /> : number}
        </span>
    );

    const stepHeader = (number, label, done, active, value) => (
        <div className="flower-tracking-step-head">
            {stepBadge(number, done, active)}
            <div className="flower-tracking-step-label">{label}</div>
            {value ? <div className="flower-tracking-step-value">{value}</div> : null}
        </div>
    );

    return (
        <Page className="flower-tracking-page">
            <div className="flower-tracking-shell">
                <div className="flower-tracking-card">
                    <div className="flower-tracking-header">
                        <button
                            type="button"
                            className="flower-tracking-back"
                            onClick={() => navigate(-1)}
                            aria-label={t("Back")}
                        >
                            <Icon f7="chevron_left" />
                        </button>
                        <h1 className="flower-tracking-title">FLOWER TRACKING</h1>
                        <span className="flower-tracking-status">
                            <span className="flower-tracking-status-dot" />
                            {t("In service")}
                        </span>
                    </div>

                    <section className={`flower-tracking-step ${mummyDone ? "is-done" : "is-active"}`}>
                        {stepHeader(1, t("Step 1: Select Mummy"), mummyDone, !mummyDone, mummyDone ? mummyLabel(selectedMummy) : null)}
                        {mummyList.length === 0 ? (
                            <div className="flower-tracking-empty">{t("No results found")}</div>
                        ) : (
                            <div className="flower-tracking-group-grid">
                                {mummyList.map((mummy) => {
                                    const selected = String(mummy.id) === String(selectedMummyId);
                                    return (
                                        <button
                                            key={mummy.id}
                                            type="button"
                                            className={`flower-tracking-group ${selected ? "is-selected" : ""}`}
                                            aria-pressed={selected}
                                            onClick={() => handleSelectMummy(mummy)}
                                        >
                                            <span className="flower-tracking-group-name">{mummyLabel(mummy)}</span>
                                            {selected ? (
                                                <span className="flower-tracking-check" aria-hidden="true"><Icon f7="checkmark_alt" /></span>
                                            ) : mummyRequiresQr ? (
                                                <Icon f7="qrcode" className="flower-tracking-qr-icon" />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className={`flower-tracking-step ${mummyDone ? (staffDone ? "is-done" : "is-active") : "is-locked"}`}>
                        {stepHeader(2, t("Step 2: Select Staff"), staffDone, mummyDone && !staffDone, staffDone ? staffLabel(selectedStaff) : null)}
                        {staffList.length >= STAFF_SEARCH_MIN && (
                            <label className="flower-tracking-search">
                                <Icon f7="search" />
                                <input
                                    type="search"
                                    value={staffQuery}
                                    placeholder={t("Search staff")}
                                    aria-label={t("Search staff")}
                                    onChange={(e) => setStaffQuery(e.target.value)}
                                />
                            </label>
                        )}
                        {staffList.length === 0 || visibleStaff.length === 0 ? (
                            <div className="flower-tracking-empty">{t("No results found")}</div>
                        ) : (
                            <div className="flower-tracking-agent-grid">
                                {visibleStaff.map((staff) => {
                                    const selected = String(staff.id) === String(selectedStaffId);
                                    const name = staffLabel(staff);
                                    const avatar = staff.profile_image && !brokenAvatars.has(staff.id) ? staff.profile_image : null;
                                    const position = staff.profile_image_position;
                                    return (
                                        <button
                                            key={staff.id}
                                            type="button"
                                            className={`flower-tracking-agent ${selected ? "is-selected" : ""}`}
                                            aria-pressed={selected}
                                            onClick={() => handleSelectStaff(staff)}
                                        >
                                            <span className="flower-tracking-avatar">
                                                {avatar ? (
                                                    <img
                                                        src={avatar}
                                                        alt=""
                                                        loading="lazy"
                                                        style={position && Number.isFinite(position.x) && Number.isFinite(position.y)
                                                            ? { objectPosition: `${position.x}% ${position.y}%` }
                                                            : undefined}
                                                        onError={() => setBrokenAvatars((prev) => new Set(prev).add(staff.id))}
                                                    />
                                                ) : (
                                                    <span className="flower-tracking-avatar-initial">{initialsOf(name)}</span>
                                                )}
                                                {selected && (
                                                    <span className="flower-tracking-check" aria-hidden="true"><Icon f7="checkmark_alt" /></span>
                                                )}
                                                {staffRequiresQr && !selected && (
                                                    <span className="flower-tracking-avatar-qr" aria-hidden="true"><Icon f7="qrcode" /></span>
                                                )}
                                            </span>
                                            <span className="flower-tracking-agent-name">{name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className={`flower-tracking-step flower-tracking-step-amount ${amountValid ? "is-done" : staffDone ? "is-active" : ""}`}>
                        {stepHeader(3, t("Step 3: Enter amount"), amountValid, staffDone && !amountValid, null)}
                        <div className={`flower-tracking-amount ${amountInvalid ? "is-invalid" : ""}`}>
                            <button
                                type="button"
                                className="flower-tracking-stepper"
                                aria-label={`- ${AMOUNT_STEP}`}
                                disabled={!amountValid}
                                onClick={() => stepAmount(-AMOUNT_STEP)}
                            >
                                <Icon f7="minus" />
                            </button>
                            <div className="flower-tracking-amount-field">
                                <span className="flower-tracking-currency">RM</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="flower-tracking-amount-input"
                                    value={flowerAmount}
                                    placeholder="0.00"
                                    aria-label={t("Flower Amount")}
                                    aria-invalid={amountInvalid}
                                    onChange={handleFlowerAmountChange}
                                />
                            </div>
                            <button
                                type="button"
                                className="flower-tracking-stepper"
                                aria-label={`+ ${AMOUNT_STEP}`}
                                onClick={() => stepAmount(AMOUNT_STEP)}
                            >
                                <Icon f7="plus" />
                            </button>
                        </div>
                        <div className="flower-tracking-quick">
                            {QUICK_AMOUNTS.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    data-quick-amount={value}
                                    className={`flower-tracking-quick-chip ${amountValid && parsedAmount === value ? "is-selected" : ""}`}
                                    onClick={() => setAmountValue(value)}
                                >
                                    RM {value}
                                </button>
                            ))}
                        </div>
                        {frequentAmounts.length > 0 && (
                            <div className="flower-tracking-frequent">
                                <span className="flower-tracking-frequent-label">
                                    <Icon f7="clock" />
                                    {t("Frequently used")}
                                </span>
                                <div className="flower-tracking-frequent-chips">
                                    {frequentAmounts.map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            data-frequent-amount={value}
                                            className={`flower-tracking-quick-chip is-frequent ${amountValid && sameAmount(parsedAmount, value) ? "is-selected" : ""}`}
                                            onClick={() => setAmountValue(value)}
                                        >
                                            RM {formatQuickAmount(value)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {amountInvalid && (
                            <div className="flower-tracking-error" role="alert">{t("Please enter a valid flower amount")}</div>
                        )}
                    </section>

                    <div className={`flower-tracking-summary ${canSubmit ? "is-ready" : ""}`} aria-live="polite">
                        <span className="flower-tracking-summary-label">{t("Summary")}</span>
                        <span className="flower-tracking-summary-text">
                            <span className={mummyDone ? "" : "is-missing"}>{mummyDone ? mummyLabel(selectedMummy) : t("Mummy")}</span>
                            <Icon f7="arrow_right" className="flower-tracking-summary-arrow" />
                            <span className={staffDone ? "" : "is-missing"}>{staffDone ? staffLabel(selectedStaff) : t("Staff")}</span>
                            <span className="flower-tracking-summary-dot">·</span>
                            <strong className={amountValid ? "" : "is-missing"}>RM {amountValid ? formatMoney(parsedAmount) : "0.00"}</strong>
                        </span>
                    </div>

                    <button
                        type="button"
                        className={`flower-tracking-submit ${submitting ? "is-loading" : ""}`}
                        disabled={!canSubmit}
                        aria-busy={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting && <span className="flower-tracking-spinner" aria-hidden="true" />}
                        {submitting ? t("Submitting...") : t("Confirm flower registration")}
                    </button>
                    {!canSubmit && !submitting && (
                        <div className="flower-tracking-hint">{t("Complete the steps above to continue")}</div>
                    )}
                </div>
            </div>

            <QrScanner
                readerElementId="qr-reader-flower-tracking"
                active={scanTarget !== null}
                onActiveChange={handleScannerActiveChange}
                onDecoded={handleQrCodeScanned}
                isProcessingScanRef={isProcessingScanRef}
                showPreloaderOnCameraScan={false}
                title={scanTarget ? `${t("Scan QR to confirm")}: ${scanTarget.name}` : undefined}
            />
        </Page>
    );
};

export default FlowerTrackingPage;
