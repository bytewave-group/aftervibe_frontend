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

/** Tenant setting values arrive as 1 / "1" / "0" / true; treat anything else as off. */
const isSettingEnabled = (value) => value === true || value === 1 || value === "1" || value === "true";

const FlowerTrackingPage = () => {
    const {
        staff_work_lists,
        mummy_lists,
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

                    <section className="flower-tracking-step">
                        <div className="flower-tracking-step-label">{t("Step 1: Select Mummy")}</div>
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
                                            {mummyLabel(mummy)}
                                            {mummyRequiresQr && !selected && <Icon f7="qrcode" className="flower-tracking-qr-icon" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className={`flower-tracking-step ${selectedMummy ? "" : "is-locked"}`}>
                        <div className="flower-tracking-step-label">{t("Step 2: Select Staff")}</div>
                        {staffList.length === 0 ? (
                            <div className="flower-tracking-empty">{t("No results found")}</div>
                        ) : (
                            <div className="flower-tracking-agent-grid">
                                {staffList.map((staff) => {
                                    const selected = String(staff.id) === String(selectedStaffId);
                                    return (
                                        <button
                                            key={staff.id}
                                            type="button"
                                            className={`flower-tracking-agent ${selected ? "is-selected" : ""}`}
                                            aria-pressed={selected}
                                            onClick={() => handleSelectStaff(staff)}
                                        >
                                            {staffLabel(staff)}
                                            {staffRequiresQr && !selected && <Icon f7="qrcode" className="flower-tracking-qr-icon" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="flower-tracking-step flower-tracking-step-amount">
                        <div className="flower-tracking-step-label">{t("Step 3: Enter amount")}</div>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="flower-tracking-amount-input"
                            value={flowerAmount}
                            placeholder={t("Flower Amount")}
                            aria-label={t("Flower Amount")}
                            onChange={handleFlowerAmountChange}
                        />
                    </section>

                    <button
                        type="button"
                        className="flower-tracking-submit"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {t("Confirm flower registration")}
                    </button>
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
