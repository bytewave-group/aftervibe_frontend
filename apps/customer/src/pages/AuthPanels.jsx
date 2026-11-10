import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BarSelector from "../components/bar/BarSelector";
import { BARS_URL, getApiUrl } from "../config/api";
import {
    applyTenantFromLocation,
    getCurrentBar,
    getPendingJoinToken,
    isBarLocked,
    loginRoute,
    setCustomerSession,
    tenantFromLocation,
} from "../config/bar";

function digitsOnly(value) {
    return value.replace(/\D/g, "");
}

function withMalaysiaCode(localDigits) {
    if (localDigits.startsWith("0") || localDigits.startsWith("60")) {
        return localDigits;
    }

    return `60${localDigits}`;
}

const LANGUAGE_KEY = "customer_language";

function AuthPanels({ mode }) {
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage === "cn" || i18n.language?.startsWith("cn") ? "cn" : "en";
    const navigate = useNavigate();
    const location = useLocation();
    const isLogin = mode === "login";

    const [bar, setBar] = useState(getCurrentBar);
    const [barLocked, setBarLocked] = useState(isBarLocked);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [loginPhone, setLoginPhone] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    const [username, setUsername] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [registerPhone, setRegisterPhone] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [codeSending, setCodeSending] = useState(false);
    const [codeSent, setCodeSent] = useState(false);

    useEffect(() => {
        let cancelled = false;

        applyTenantFromLocation(BARS_URL)
            .then((result) => {
                if (cancelled) {
                    return;
                }

                if (result.missing) {
                    setBar(null);
                    setBarLocked(false);
                    setError(t("This venue link is not valid."));
                    return;
                }

                setBar(result.bar);
                setBarLocked(result.locked);
                if (result.locked) {
                    setError("");
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(t("Unable to load bars."));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [t, location.search]);

    const goHome = () => {
        const pendingJoinToken = getPendingJoinToken();
        navigate(
            pendingJoinToken
                ? `/join?${new URLSearchParams({ token: pendingJoinToken })}`
                : "/home"
        );
    };

    const selectLanguage = (code) => {
        localStorage.setItem(LANGUAGE_KEY, code);
        i18n.changeLanguage(code);
    };

    const goToOtherPage = () => {
        if (!isLogin) {
            navigate(loginRoute(location.search));
            return;
        }

        const params = new URLSearchParams(location.search);
        if (!params.get("tenant")) {
            const tenant = tenantFromLocation();
            if (tenant) {
                params.set("tenant", tenant);
            }
        }

        const query = params.toString();
        navigate({
            pathname: "/register",
            search: query ? `?${query}` : "",
        });
    };

    const handleLogin = async (event) => {
        event.preventDefault();

        if (!bar) {
            setError(t("Please select a bar."));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${getApiUrl()}/customer/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    phone: loginPhone,
                    password: loginPassword,
                    bar_id: bar.id ? Number(bar.id) : null,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Invalid phone or password.");
            }

            setCustomerSession(data.token, data.customer);
            goHome();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (!bar) {
            setError(t("Please select a bar."));
            return;
        }

        if (!registerPhone) {
            setError(t("Enter phone number"));
            return;
        }

        setCodeSending(true);
        setError("");

        try {
            const response = await fetch(`${getApiUrl()}/customer/otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    phone: withMalaysiaCode(registerPhone),
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to send verification code.");
            }

            setCodeSent(true);
        } catch (requestError) {
            setCodeSent(false);
            setError(requestError.message);
        } finally {
            setCodeSending(false);
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();

        if (!bar) {
            setError(t("Please select a bar."));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${getApiUrl()}/customer/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    phone: withMalaysiaCode(registerPhone),
                    username,
                    password: registerPassword,
                    password_confirmation: passwordConfirmation,
                    otp: verificationCode,
                    bar_id: bar.id ? Number(bar.id) : null,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed.");
            }

            if (data.token) {
                setCustomerSession(data.token, data.customer);
                goHome();
                return;
            }

            setUsername("");
            setRegisterPassword("");
            setPasswordConfirmation("");
            setRegisterPhone("");
            setVerificationCode("");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-language" role="group" aria-label={t("Language")}>
                <button
                    type="button"
                    className={currentLanguage === "en" ? "is-active" : ""}
                    onClick={() => selectLanguage("en")}
                >
                    EN
                </button>
                <button
                    type="button"
                    className={currentLanguage === "cn" ? "is-active" : ""}
                    onClick={() => selectLanguage("cn")}
                >
                    中文
                </button>
            </div>

            {!barLocked && (
                <div className="auth-bar-picker">
                    <BarSelector
                        bar={bar}
                        onBarChange={(selectedBar) => {
                            setBar(selectedBar);
                            setError("");
                        }}
                        textClassName="text-white"
                    />
                </div>
            )}

            <div className="auth-board">
                {isLogin ? (
                    <form className="auth-card" onSubmit={handleLogin}>
                        <div className="auth-card-head">
                            <h2>{t("Login")}</h2>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <input
                            className="auth-input"
                            type="text"
                            inputMode="numeric"
                            value={loginPhone}
                            onChange={(event) => setLoginPhone(digitsOnly(event.target.value))}
                            placeholder={t("Enter phone number")}
                            autoComplete="tel"
                            required
                        />
                        <input
                            className="auth-input"
                            type="password"
                            value={loginPassword}
                            onChange={(event) => setLoginPassword(event.target.value)}
                            placeholder={t("Enter password")}
                            autoComplete="current-password"
                            required
                        />

                        <div className="auth-forgot">{t("Forgot password")}</div>

                        <button className="auth-submit" type="submit" disabled={loading || !bar}>
                            {loading ? t("Logging in...") : t("Login account")}
                        </button>

                        <button className="auth-switch" type="button" onClick={goToOtherPage}>
                            {t("Register now")}
                        </button>
                        <div className="auth-hint">{t("No account yet?")}</div>
                    </form>
                ) : (
                    <form className="auth-card" onSubmit={handleRegister}>
                        <div className="auth-card-head">
                            <h2>{t("Register")}</h2>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <input
                            className="auth-input"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder={t("Enter username")}
                            autoComplete="username"
                            required
                        />
                        <div className="auth-phone-row">
                            <span className="auth-dial">MY +60</span>
                            <input
                                className="auth-input auth-phone-input"
                                type="text"
                                inputMode="numeric"
                                value={registerPhone}
                                onChange={(event) => setRegisterPhone(digitsOnly(event.target.value))}
                                placeholder={t("Enter phone number")}
                                autoComplete="tel"
                                required
                            />
                        </div>

                        <div className="auth-code-row">
                            <input
                                className="auth-input auth-code-input"
                                type="text"
                                inputMode="numeric"
                                value={verificationCode}
                                onChange={(event) => setVerificationCode(digitsOnly(event.target.value).slice(0, 6))}
                                placeholder="000000"
                            />
                            <button
                                className="auth-send-code"
                                type="button"
                                onClick={handleSendCode}
                                disabled={codeSending || !bar}
                            >
                                {codeSending
                                    ? t("Sending...")
                                    : codeSent
                                        ? t("Sent")
                                        : t("Send verification code")}
                            </button>
                        </div>
                        <input
                            className="auth-input"
                            type="password"
                            value={registerPassword}
                            onChange={(event) => setRegisterPassword(event.target.value)}
                            placeholder={t("Enter password")}
                            autoComplete="new-password"
                            required
                        />
                        <input
                            className="auth-input"
                            type="password"
                            value={passwordConfirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            placeholder={t("Confirm password")}
                            autoComplete="new-password"
                            required
                        />

                        <button className="auth-submit" type="submit" disabled={loading || !bar}>
                            {loading ? t("Registering...") : t("Register account")}
                        </button>

                        <button className="auth-switch" type="button" onClick={goToOtherPage}>
                            {t("Login account")}
                        </button>
                        <div className="auth-hint">{t("Already have an account")}</div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default AuthPanels;
