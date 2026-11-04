import React, { useState, useEffect, useRef, useCallback } from "react";
import { f7, Page, Button, Icon } from "framework7-react";
import Header from "../components/header";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";
import QRCode from "react-qr-code";
import { loadGlobalData, loadUser, saveUser } from "../components/action/preferences";
import { useTokenAndUser } from "../components/action/user-data";
import env from "../../environment.json";
import useCommon from "../components/action/Common";
import { PushNotifications } from "@capacitor/push-notifications";

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") {
        return null;
    }

    const parts = timeStr.trim().split(/[.:]/);
    const hour = parseInt(parts[0], 10);
    const minutes = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;

    if (Number.isNaN(hour) || hour < 0 || hour > 23) {
        return null;
    }

    if (Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    return hour * 60 + minutes;
};

const isAtOrPastEndCheckoutTime = (startBusinessTime, endCheckoutTime) => {
    const startMinutes = parseTimeToMinutes(startBusinessTime);
    const endMinutes = parseTimeToMinutes(endCheckoutTime);

    if (startMinutes === null || endMinutes === null) {
        return false;
    }

    const now = new Date();
    let currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isOvernight = endMinutes < startMinutes;

    if (isOvernight) {
        if (currentMinutes < startMinutes) {
            currentMinutes += 1440;
        }

        let normalizedEndMinutes = endMinutes;
        if (normalizedEndMinutes < startMinutes) {
            normalizedEndMinutes += 1440;
        }

        return currentMinutes >= normalizedEndMinutes;
    }

    return currentMinutes >= endMinutes;
};

const CheckinPage = () => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const { getProfile, checkOut } = useAuthenticate();
    const { user } = useTokenAndUser();
    const getProfileRef = useRef(getProfile);
    getProfileRef.current = getProfile;
    const [checkinStatus, setCheckinStatus] = useState(1);
    const [checkinTime, setCheckinTime] = useState(null);
    const [profileQr, setProfileQr] = useState(null);
    const [verifiedCheckoutQr, setVerifiedCheckoutQr] = useState(false);
    const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
    const [startBusinessTime, setStartBusinessTime] = useState(null);
    const [endCheckoutTime, setEndCheckoutTime] = useState(null);
    const [isPastEndCheckoutTime, setIsPastEndCheckoutTime] = useState(false);
    const normalizeCheckinStatus = (status) => {
        if (status === null || status === undefined || status === "") {
            return null;
        }

        const numericStatus = Number(status);
        return Number.isNaN(numericStatus) ? status : numericStatus;
    };

    const isCheckedInStatus = (status) => normalizeCheckinStatus(status) === 2;
    const isCheckedIn = isCheckedInStatus(checkinStatus);
    const canCheckoutDirectly = verifiedCheckoutQr || isPastEndCheckoutTime;

    const refreshProfileData = useCallback(async (showLoader = false) => {
        if (!user?.role) {
            return false;
        }

        if (showLoader) {
            f7.preloader.show();
        }

        try {
            const profileForm = {
                private_key: env.private_key,
                type: user.role,
            };

            const response = await getProfileRef.current(profileForm);
            if (response.status) {
                const nextVerifiedCheckoutQr = Boolean(response?.data?.verified_checkout_qr);
                const nextCheckinStatus = normalizeCheckinStatus(response.data.checkin_status);
                setCheckinStatus(nextCheckinStatus);
                setCheckinTime(response.data.checkin_time || null);
                setVerifiedCheckoutQr(nextVerifiedCheckoutQr);

                if (response?.data?.qr) {
                    setProfileQr(response.data.qr);
                }

                const userData = await loadUser();
                if (userData) {
                    const updatedUserData = {
                        ...userData,
                        checkin_status: nextCheckinStatus,
                        checkin_time: response.data.checkin_time,
                        verified_checkout_qr: nextVerifiedCheckoutQr,
                        ...(response?.data?.qr ? { qr: response.data.qr } : {}),
                    };
                    await saveUser(updatedUserData);
                }

                return nextVerifiedCheckoutQr;
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            if (showLoader) {
                f7.preloader.hide();
            }
        }

        return false;
    }, [user?.role]);

    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;

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
        if (!user?.role) {
            return;
        }

        refreshProfileData(true);
    }, [user?.role, refreshProfileData]);

    useEffect(() => {
        const loadEndCheckoutTime = async () => {
            try {
                const value = await loadGlobalData();
                if (!value) {
                    return;
                }

                const globalData = JSON.parse(value);
                const settings = globalData?.settings;
                const startTime = settings?.start_business_time ?? null;
                const endTime = settings?.end_check_out_time ?? null;
                setStartBusinessTime(startTime);
                setEndCheckoutTime(endTime);
                setIsPastEndCheckoutTime(
                    isAtOrPastEndCheckoutTime(startTime, endTime)
                );
            } catch (error) {
                console.error("Error loading end check-out time:", error);
            }
        };

        void loadEndCheckoutTime();
    }, []);

    useEffect(() => {
        if (!startBusinessTime || !endCheckoutTime) {
            return;
        }

        const updateCheckoutTimeStatus = () => {
            setIsPastEndCheckoutTime(
                isAtOrPastEndCheckoutTime(startBusinessTime, endCheckoutTime)
            );
        };

        updateCheckoutTimeStatus();
        const intervalId = setInterval(updateCheckoutTimeStatus, 60000);

        return () => {
            clearInterval(intervalId);
        };
    }, [startBusinessTime, endCheckoutTime]);

    useEffect(() => {
        if (!user?.role || !isCheckedIn || canCheckoutDirectly) {
            return;
        }

        let isStopped = false;
        let timeoutId = null;

        const pollProfileStatus = async () => {
            const isVerified = await refreshProfileData(false);
            if (isStopped || isVerified) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                return;
            }

            timeoutId = setTimeout(pollProfileStatus, 5000);
        };

        timeoutId = setTimeout(pollProfileStatus, 5000);

        return () => {
            isStopped = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [user?.role, isCheckedIn, canCheckoutDirectly]);

    useEffect(() => {
        if (user) {
            setCheckinStatus(normalizeCheckinStatus(user.checkin_status));
            setCheckinTime(user.checkin_time || null);
            if (user.qr) {
                setProfileQr(user.qr);
            }
            setVerifiedCheckoutQr(Boolean(user.verified_checkout_qr));
        }
    }, [user]);

    useEffect(() => {
        let isActive = true;
        const listeners = [];

        const setupPushNotifications = async () => {
            try {
                const resultCheck = await PushNotifications.checkPermissions();

                if (resultCheck.receive !== "granted") {
                    const resultRequest = await PushNotifications.requestPermissions();

                    if (resultRequest.receive === "granted") {
                        await PushNotifications.register();
                    }
                } else {
                    await PushNotifications.register();
                }

                if (!isActive) return;

                const pushNotificationReceivedListener = await PushNotifications.addListener(
                    "pushNotificationReceived",
                    (notification) => {
                        if (!notification.data?.checkin_status) {
                            return;
                        }

                        void refreshProfileData(false).finally(() => {
                            setTimeout(() => {
                                if (!isActive) return;
                                const router = f7.views?.main?.router;
                                if (router?.currentRoute?.path === "/home") return;
                                navigateRef.current("/home", { animate: false });
                            }, 100);
                        });
                    }
                );
                listeners.push(pushNotificationReceivedListener);
            } catch (error) {
                console.error("Error setting up push notifications:", error);
            }
        };

        setupPushNotifications();

        return () => {
            isActive = false;
            listeners.forEach((listener) => listener?.remove?.());
        };
    }, [refreshProfileData]);

    const checkoutActionQrValue = profileQr
        ? JSON.stringify({ type: "checkout", qr: profileQr })
        : null;

    const handleCheckout = async () => {
        if (!profileQr || !user?.role || isSubmittingCheckout) {
            return;
        }

        setIsSubmittingCheckout(true);
        f7.preloader.show();

        try {
            const response = await checkOut({
                private_key: env.private_key,
                type: user.role,
                qr: profileQr,
            });

            f7.toast.show({
                text: response.message
                    ? t(response.message)
                    : response.status
                        ? t("Check-out request sent")
                        : t("Check-out failed"),
                position: "center",
                closeTimeout: 2000,
                cssClass: response.status ? "" : "error-toast",
            });

            if (response.status) {
                navigate("/home");
            }
        } catch (error) {
            console.error("Error processing check out:", error);
            f7.toast.show({
                text: t("Check-out failed"),
                position: "center",
                closeTimeout: 2000,
                cssClass: "error-toast",
            });
        } finally {
            setIsSubmittingCheckout(false);
            f7.preloader.hide();
        }
    };

    return (
        <Page className="check-in-page">
            <Header title={t("Check In / Out")} />

            <div className="content-panel checkin-content">
                <div className="time-display">
                    {checkinTime && isCheckedIn && (
                        <div className="checkin-time-display">
                            {t("Checked in at")}: {checkinTime}
                        </div>
                    )}
                </div>

                {!isCheckedIn ? (
                    <div className="qr-section">
                        <div className="checkin-message-container">
                            <p className="checkin-message">
                                {t("Show this QR to manager for check in action")}
                            </p>
                            {!profileQr && (
                                <Button
                                    className="go-to-profile-button"
                                    onClick={() => navigate("/profile")}
                                    fill
                                >
                                    <Icon f7="person" />
                                    <span>{t("Go to Profile")}</span>
                                </Button>
                            )}
                        </div>
                        {profileQr && (
                            <div className="qr-code-container">
                                <QRCode value={profileQr} />
                            </div>
                        )}
                    </div>
                ) : !canCheckoutDirectly ? (
                    <div className="qr-section">
                        <div className="checkin-message-container">
                            <p className="checkin-message">
                                {t("Show this QR to manager for check out verification")}
                            </p>
                            {!profileQr && (
                                <Button
                                    className="go-to-profile-button"
                                    onClick={() => navigate("/profile")}
                                    fill
                                >
                                    <Icon f7="person" />
                                    <span>{t("Go to Profile")}</span>
                                </Button>
                            )}
                        </div>
                        {checkoutActionQrValue && (
                            <div className="qr-code-container">
                                <QRCode value={checkoutActionQrValue} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="qr-section">
                        <div className="checkin-message-container">
                            <p className="checkin-message">
                                {isPastEndCheckoutTime && !verifiedCheckoutQr
                                    ? t("End check-out time reached. You can proceed to check out")
                                    : t("Check out verification complete. You can proceed to check out")}
                            </p>
                            <Button
                                className="go-to-profile-button"
                                onClick={handleCheckout}
                                disabled={isSubmittingCheckout || !profileQr}
                                fill
                            >
                                <Icon f7="arrow_right_circle" />
                                <span>{t("Check Out")}</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Page>
    );
};

export default CheckinPage;
