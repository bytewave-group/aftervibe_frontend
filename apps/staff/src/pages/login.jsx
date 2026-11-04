import React, { useState, useEffect } from "react";
import { Page, Button, Icon, f7 } from "framework7-react";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import { useTokenAndUser } from "../components/action/user-data";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { FCM } from "@capacitor-community/fcm";
import { Preferences } from "@capacitor/preferences";
import { warmUpPrinterConnection } from "../utils/printerConnection";
import {
    saveFcmToken,
    loadFcmToken,
    saveBar,
    loadBar,
    deleteBar,
} from "../components/action/preferences";
import LanguageSelector from "../components/LanguageSelector";
import Tools from "../components/tools";
import env from "../../environment.json";
import { useTenantName } from "../hooks/useTenantName";
import { fetchBars } from "../services/barService";
import { FIXED_BAR } from "../config/barConfig";

const LoginPage = () => {
    const { t } = useTranslation();
    const tenantName = useTenantName();
    const { token } = useTokenAndUser();
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuthenticate();
    const [sendFcm, setSendFcm] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastData, setToastData] = useState({});
    const [selectedBar, setSelectedBar] = useState(null);
    const [isBarLoaded, setIsBarLoaded] = useState(false);
    const [bars, setBars] = useState([]);
    const [isLoadingBars, setIsLoadingBars] = useState(true);
    const [barsLoadFailed, setBarsLoadFailed] = useState(false);
    // const [showRoleSelection, setShowRoleSelection] = useState(true);
    // const [selectedRole, setSelectedRole] = useState(null);

    const [form, setForm] = useState({
        private_key: env.private_key,
        // type: "manager",
        username: "",
        password: "",
        // fcm_token: null,
    });

    // const roles = [
    //     { value: "manager", label: t("Manager") },
    //     { value: "mummy", label: t("Mummy") },
    //     { value: "staff", label: t("Staff") },
    // ];

    // const selectRole = (role) => {
    //     setSelectedRole(role);
    //     setForm({
    //         private_key: env.private_key,
    //         type: role,
    //         username: "",
    //         password: "",
    //         fcm_token: form.fcm_token,
    //     });
    //     setShowPassword(false);
    //     setShowRoleSelection(false);
    // };

    // const goBackToRoleSelection = () => {
    //     setShowRoleSelection(true);
    //     setSelectedRole(null);
    //     setForm({
    //         private_key: env.private_key,
    //         type: "manager",
    //         username: "",
    //         password: "",
    //         fcm_token: form.fcm_token,
    //     });
    //     setShowPassword(false);
    // };


    /* ================================================================ */
    // push notification
    useEffect(() => {
        const platform = Capacitor.getPlatform();
        if (platform === "ios" || platform === "android") {
            checkAndRegisterFCM();
        }
    }, []);

    const checkAndRegisterFCM = async () => {
        const storedToken = await loadFcmToken();
        if (storedToken) {
            // console.log("FCM Token already exists:", storedToken);
            setSendFcm(0);
            return;
        }

        PushNotifications.checkPermissions().then((resultCheck) => {
            if (resultCheck.receive !== "granted") {
                PushNotifications.requestPermissions().then((resultRequest) => {
                    if (resultRequest.receive === "granted") {
                        registerPushNotifications();
                    }
                });
            } else {
                registerPushNotifications();
            }
        });
    };

    const registerPushNotifications = () => {
        PushNotifications.register();
        FCM.subscribeTo({ topic: "allDevices" });

        PushNotifications.addListener("registration", async (fcmTokenData) => {
            // console.log("New FCM Token:", fcmTokenData.value);
            await saveFcmToken(fcmTokenData.value);
            setSendFcm(1);
        });
    };

    useEffect(() => {
        if (sendFcm == 1) {
            const fetchFcmToken = async () => {
                const fcmToken = await loadFcmToken();
                if (fcmToken) {
                    setForm({ ...form, fcm_token: fcmToken });
                }
            };
            fetchFcmToken();
        }
    }, [sendFcm]);

    useEffect(() => {
        if (token) {
            f7.views?.main?.router?.navigate?.("/home");
        }
    }, [token]);

    /* ================================================================ */
    // bar selection
    useEffect(() => {
        loadBar().then((bar) => {
            setSelectedBar(bar);
            setIsBarLoaded(true);
        });

        fetchBars()
            .then((barList) => {
                setBars(barList);
                setBarsLoadFailed(false);

                const listedFixedBar = FIXED_BAR && !import.meta.env.VITE_FIXED_BAR_NAME
                    ? barList.find((bar) => bar.url === FIXED_BAR.url)
                    : null;
                if (listedFixedBar) {
                    saveBar(listedFixedBar).then(() => setSelectedBar(listedFixedBar));
                }
            })
            .catch(() => {
                setBarsLoadFailed(true);
            })
            .finally(() => {
                setIsLoadingBars(false);
            });
    }, []);

    const showMessage = (message) => {
        setToastData({
            title: "",
            message,
            buttonText: t("OK"),
        });
        setShowToast(true);
    };

    const handleSelectBar = async (bar) => {
        await saveBar(bar);
        setSelectedBar(bar);
    };

    const handleChangeBar = async () => {
        await deleteBar();
        setSelectedBar(null);
        setForm({ ...form, username: "", password: "" });
        setShowPassword(false);
    };

    const handleLogin = (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (!selectedBar) {
            showMessage(t("Please select a bar"));
            return;
        }

        if (form.username === "") {
            setToastData({
                title: "",
                message: t("Please enter username"),
                buttonText: t("OK"),
            });
            setShowToast(true);
            return;
        }

        if (form.password === "") {
            setToastData({
                title: "",
                message: t("Please enter password"),
                buttonText: t("OK"),
            });
            setShowToast(true);
            return;
        }

        setIsLoading(true);
        f7.preloader.show();

        login(form)
            .then(async (res) => {
                setIsLoading(false);
                f7.preloader.hide();
                if (!res.status) {
                    setToastData({
                        title: "",
                        message: res.message,
                        buttonText: t("OK"),
                    });
                    setShowToast(true);
                    return;
                }
                if (res.data && res.data.locale) {
                    await Preferences.set({
                        key: "language",
                        value: res.data.locale,
                    });
                }
                await warmUpPrinterConnection();
                f7.views?.main?.router?.navigate?.("/home");
            })
            .catch(() => {
                setIsLoading(false);
                f7.preloader.hide();
            });
    };

    const handleToastClose = () => {
        setShowToast(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleLogin(e);
        }
    };

    return (
        <Page className="login-page">
            <LanguageSelector />

            <div className="content-panel">
                <div className="login-header">
                    <img
                        src="/images/nightclub_app_logo.webp"
                        className="company-logo"
                        alt="Logo"
                    />
                    <div className="login-header-text">
                        <h1>{t("Welcome to {{name}}", { name: selectedBar?.name || tenantName })}</h1>
                        <p>{t("Please login to continue")}</p>
                    </div>
                </div>

                <div className="content">
                    {/* {showRoleSelection ? (
                        <div className="role-selection">
                            <h2 className="role-selection-title">{t("Select Role")}</h2>
                            <div className="role-options">
                                {roles.map((role) => (
                                    <div
                                        key={role.value}
                                        className="role-option"
                                        onClick={() => selectRole(role.value)}
                                    >
                                        <span>{role.label}</span>
                                        <Icon f7="chevron_right" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : ( */}
                    {isBarLoaded && !selectedBar ? (
                        <div className="role-selection bar-selection">
                            <h2 className="role-selection-title">{t("Select Bar")}</h2>
                            {isLoadingBars && (
                                <p className="bar-selection-status">{t("Loading bars...")}</p>
                            )}
                            {!isLoadingBars && barsLoadFailed && (
                                <p className="bar-selection-status">{t("Unable to load bar list")}</p>
                            )}
                            {!isLoadingBars && !barsLoadFailed && bars.length === 0 && (
                                <p className="bar-selection-status">{t("No bars available")}</p>
                            )}
                            <div className="role-options">
                                {bars.map((bar) => (
                                    <div
                                        key={bar.id ?? bar.url}
                                        className="role-option"
                                        onClick={() => handleSelectBar(bar)}
                                    >
                                        <span>{bar.name}</span>
                                        <Icon f7="chevron_right" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : selectedBar ? (
                    <div className="login-form">
                        {!FIXED_BAR && (
                            <div className="selected-role-header">
                                <Button
                                    className="back-button"
                                    onClick={handleChangeBar}
                                    iconOnly
                                    iconF7="chevron_left"
                                />
                                <div className="selected-bar-info">
                                    <span className="selected-role-text">{selectedBar.name}</span>
                                    <span className="selected-bar-url">{selectedBar.url}</span>
                                </div>
                                <Button
                                    className="change-bar-button"
                                    small
                                    onClick={handleChangeBar}
                                >
                                    {t("Change Bar")}
                                </Button>
                            </div>
                        )}

                        {/* {selectedRole && (
                                <div className="selected-role-header">
                                    <Button
                                        className="back-button"
                                        onClick={goBackToRoleSelection}
                                        iconOnly
                                        iconF7="chevron_left"
                                    />
                                    <span className="selected-role-text">
                                        {roles.find((r) => r.value === selectedRole)?.label}
                                    </span>
                                </div>
                            )} */}

                        <div className="Username-container">
                            <label className="font-large font-bold">
                                {t("Username")}
                            </label>
                            <div className="Username-input">
                                <input
                                    type="text"
                                    placeholder={t("Username")}
                                    value={form.username}
                                    onChange={(e) =>
                                        setForm({ ...form, username: e.target.value })
                                    }
                                    onKeyDown={handleKeyPress}
                                    required
                                />
                            </div>
                        </div>

                        <div className="Password-container">
                            <label className="font-large font-bold">
                                {t("Password")}
                            </label>
                            <div className="Password-input">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t("Password")}
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm({ ...form, password: e.target.value })
                                    }
                                    onKeyDown={handleKeyPress}
                                    required
                                />
                                <div className="eye-icon-container">
                                    <div
                                        className="eye-icon"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <Icon f7={showPassword ? "eye_slash" : "eye"} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="login-button">
                            <Button
                                className="font-bold"
                                fill
                                onClick={() => handleLogin()}
                                disabled={isLoading}
                            >
                                {isLoading ? t("Logging in...") : t("Login")}
                            </Button>
                        </div>
                    </div>
                    ) : null}
                    {/* )} */}
                </div>
            </div>

            <Tools
                type="toast"
                active={showToast}
                data={toastData}
                onToastClose={handleToastClose}
            />
        </Page>
    );
};

export default LoginPage;
