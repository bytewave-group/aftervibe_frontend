import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BARS_URL, getApiUrl } from "../config/api";
import {
    clearPendingJoinToken,
    getBarLabel,
    getCurrentBar,
    hasCustomerSession,
    normalizeBarUrl,
    setCurrentBar,
    setPendingJoinToken,
} from "../config/bar";

export default function JoinPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState("loading");
    const [bar, setBar] = useState(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        const locationParams = new URLSearchParams(window.location.search);
        const token = searchParams.get("token") || locationParams.get("token");
        const api = searchParams.get("api") || locationParams.get("api");

        if (!token) {
            setStatus("error");
            setMessage(t("Invalid QR code."));
            return;
        }

        const rejectQr = () => {
            if (cancelled) return;
            setStatus("error");
            setMessage(t("Invalid QR code."));
        };

        // Only bars from the official bar list are trusted, so a forged QR cannot redirect logins to another server.
        const resolveQrBar = async () => {
            const barUrl = normalizeBarUrl(api);

            if (!barUrl) {
                return null;
            }

            const response = await fetch(BARS_URL, { headers: { Accept: "application/json" } });
            const data = await response.json();

            return (data.bars ?? []).find(
                (item) => normalizeBarUrl(item.url || item.domain) === barUrl
            ) ?? null;
        };

        const run = async () => {
            if (api) {
                let listedBar = null;

                try {
                    listedBar = await resolveQrBar();
                } catch (error) {
                    console.error("JOIN BAR LIST ERROR =", error);
                }

                if (cancelled) return;

                if (!listedBar) {
                    rejectQr();
                    return;
                }

                setCurrentBar({
                    id: listedBar.id,
                    name: listedBar.name,
                    url: listedBar.url || listedBar.domain,
                });
            }

            setBar(getCurrentBar());

            if (!hasCustomerSession()) {
                setPendingJoinToken(token);
                setStatus("login");
                return;
            }

            joinBar();
        };

        const joinBar = () => fetch(`${getApiUrl()}/bar/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("customer_token")}`,
                Accept: "application/json",
            },
            body: JSON.stringify({ token }),
        })
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || t("Invalid or expired QR code.")
                    );
                }

                return data;
            })
            .then((data) => {
                if (cancelled) return;

                clearPendingJoinToken();

                setBar(
                    data.bar?.name
                        ? setCurrentBar({ ...getCurrentBar(), name: data.bar.name })
                        : getCurrentBar()
                );
                setStatus("success");
            })
            .catch((error) => {
                console.error("JOIN BAR ERROR =", error);
                if (cancelled) return;

                clearPendingJoinToken();
                setStatus("error");
                setMessage(error.message);
            });

        run();

        return () => {
            cancelled = true;
        };
    }, [searchParams, t]);

    if (status === "loading") {
        return (
            <div style={styles.container}>
                <div>{t("Checking QR code...")}</div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2>{t("Unable to Join")}</h2>
                    <p>{message}</p>

                    <button
                        onClick={() => navigate("/login")}
                        style={styles.button}
                    >
                        {t("Back to Login")}
                    </button>
                </div>
            </div>
        );
    }

    if (status === "login") {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2>{t("Welcome")}</h2>

                    <p>{t("You are joining:")}</p>

                    <h3>{getBarLabel(bar)}</h3>

                    <p>{t("Please log in or register to join this bar.")}</p>

                    <button
                        onClick={() => navigate("/login")}
                        style={styles.button}
                    >
                        {t("Login")}
                    </button>{" "}
                    <button
                        onClick={() => navigate("/register")}
                        style={styles.button}
                    >
                        {t("Register")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2>{t("Welcome")}</h2>

                <p>
                    {t("You are joining:")}
                </p>

                <h3>{getBarLabel(bar)}</h3>

                <button
                    onClick={() => navigate("/home")}
                    style={styles.button}
                >
                    {t("Continue")}
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
    },

    card: {
        width: "100%",
        maxWidth: "400px",
        padding: "30px",
        textAlign: "center",
        borderRadius: "12px",
        border: "1px solid #ddd",
    },

    button: {
        marginTop: "20px",
        padding: "10px 25px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
    },
};
