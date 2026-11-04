import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { getApiUrl } from "../../config/api";
import {
    getCurrentBar,
    getCurrentBarUrl,
    parseBarQrCode,
    setCurrentBar,
} from "../../config/bar";

function BarAccessPopup({ onSuccess }) {
    const navigate = useNavigate();

    console.log("BAR ACCESS POPUP RENDERED");
    const [mode, setMode] = useState("options");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const scannerRef = useRef(null);
    const scannerStartedRef = useRef(false);

    const token = localStorage.getItem("customer_token");
    const barId = localStorage.getItem("bar_id");

    // Stop QR Scanner
    const stopScanner = async () => {
        if (!scannerRef.current) return;
        try {
            if (scannerStartedRef.current) {
                await scannerRef.current.stop();
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("QR SCANNER STOP ERROR:", err);
        }
        try {
            await scannerRef.current.clear();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("QR SCANNER CLEAR ERROR:", err);
        }
        scannerRef.current = null;
        scannerStartedRef.current = false;
    };

    // Start QR Scanner
    const startScanner = async () => {
        setError("");
        setMode("qr");
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("bar-access-qr-reader");
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: {
                            width: 250,
                            height: 250,
                        },
                    },
                    async (decodedText) => {
                        await handleQrSuccess(decodedText);
                    },
                    () => {
                        // ignore
                    }
                );
                scannerStartedRef.current = true;
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error("QR SCANNER START ERROR:", err);
                setError(
                    "Unable to access camera. Please allow camera permission."
                );
                setMode("options");
            }
        }, 100);
    };

    // QR Success
    const handleQrSuccess = async (decodedText) => {
        if (loading) return;
        setLoading(true);
        setError("");
        await stopScanner();

        const { token: qrToken, barUrl } = parseBarQrCode(decodedText);

        if (barUrl && qrToken && barUrl !== getCurrentBarUrl()) {
            setLoading(false);
            navigate(`/join?${new URLSearchParams({ token: qrToken, api: barUrl })}`);
            return;
        }

        try {
            if (!token) {
                throw new Error("Customer session expired. Please login again.");
            }
            if (!qrToken) {
                throw new Error("Invalid or expired QR code.");
            }
            const response = await fetch(
                `${getApiUrl()}/bar/join`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        token: qrToken,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Invalid or expired QR code.");
            }

            if (data.bar?.name) {
                setCurrentBar({ ...getCurrentBar(), name: data.bar.name });
            }

            onSuccess();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("QR VERIFICATION ERROR:", err);
            setError(err.message);
            setMode("qr");
        } finally {
            setLoading(false);
        }
    };

    // PIN Submit
    const handlePinSubmit = async (e) => {
        e.preventDefault();

        if (pin.length !== 6) {
            setError("Please enter a 6-digit PIN.");
            return;
        }

        if (!token || !getCurrentBarUrl()) {
            setError("Unable to identify the bar.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${getApiUrl()}/bar/verify-pin`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        bar_id: Number(barId),
                        pin,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Invalid or expired PIN.");
            }

            if (data.bar?.name) {
                setCurrentBar({ ...getCurrentBar(), name: data.bar.name });
            }

            setPin("");
            setError("");
            onSuccess();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("PIN VERIFICATION ERROR:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // PIN Change
    const handlePinChange = (e) => {
        const value = e.target.value.replace(/\D/g, "");
        if (value.length <= 6) {
            setPin(value);
            setError("");
        }
    };

    // Back to Options
    const backToOptions = async () => {
        await stopScanner();
        setMode("options");
        setPin("");
        setError("");
        setLoading(false);
    };

    // Cleanup
    useEffect(() => {
        return () => { stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return createPortal(
        <div className="bar-access-overlay">
            <div className="bar-access-popup">

                <div className="bar-access-glow bar-access-glow-1" />
                <div className="bar-access-glow bar-access-glow-2" />

                {mode === "options" && (
                    <div className="bar-access-content">

                        <div className="bar-access-logo">
                            AFTER VIBE
                        </div>

                        <h2>BAR ACCESS</h2>

                        <p className="bar-access-description">
                            Scan the QR code or enter the PIN
                            to access this bar.
                        </p>

                        {error && (
                            <div className="bar-access-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            className="bar-access-button"
                            onClick={startScanner}
                        >
                            SCAN QR CODE
                        </button>

                        <div className="bar-access-divider">
                            <span>OR</span>
                        </div>

                        <button
                            type="button"
                            className="bar-access-button"
                            onClick={() => {
                                setMode("pin");
                                setError("");
                            }}
                        >
                            ENTER PIN
                        </button>

                        <div className="bar-access-hint">
                            Bar access is required once per day.
                        </div>
                    </div>
                )}

                {mode === "qr" && (
                    <div className="bar-access-content">

                        <div className="bar-access-logo">
                            AFTER VIBE
                        </div>

                        <h2>SCAN QR</h2>

                        <p className="bar-access-description">
                            Point your camera at the QR code
                            displayed by the bar.
                        </p>

                        {error && (
                            <div className="bar-access-error">
                                {error}
                            </div>
                        )}

                        <div className="bar-access-scanner-wrapper">
                            <div
                                id="bar-access-qr-reader"
                                className="bar-access-scanner"
                            />

                            <div className="bar-access-scan-frame">
                                <span className="corner top-left" />
                                <span className="corner top-right" />
                                <span className="corner bottom-left" />
                                <span className="corner bottom-right" />
                                <div className="scan-line" />
                            </div>
                        </div>

                        {loading && (
                            <div className="bar-access-loading">
                                VERIFYING...
                            </div>
                        )}

                        <button
                            type="button"
                            className="bar-access-button back"
                            onClick={backToOptions}
                            disabled={loading}
                        >
                            BACK
                        </button>
                    </div>
                )}

                {mode === "pin" && (
                    <form
                        className="bar-access-content"
                        onSubmit={handlePinSubmit}
                    >
                        <div className="bar-access-logo">
                            AFTER VIBE
                        </div>

                        <h2>ENTER PIN</h2>

                        <p className="bar-access-description">
                            Enter the 6-digit PIN displayed
                            by the bar.
                        </p>

                        {error && (
                            <div className="bar-access-error">
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            className="bar-access-pin-input"
                            value={pin}
                            onChange={handlePinChange}
                            placeholder="000000"
                            autoFocus
                        />

                        <button
                            type="submit"
                            className="bar-access-button mb-3"
                            disabled={loading || pin.length !== 6}
                        >
                            {loading
                                ? "VERIFYING..."
                                : "VERIFY PIN"}
                        </button>

                        <button
                            type="button"
                            className="bar-access-button back"
                            onClick={backToOptions}
                            disabled={loading}
                        >
                            BACK
                        </button>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}

export default BarAccessPopup;