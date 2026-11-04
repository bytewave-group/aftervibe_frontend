import React, { useState, useEffect } from "react";
import { Page, f7 } from "framework7-react";
import QRCode from "react-qr-code";
import Header from "../components/header";
import { loadUser, preferencesEmitter } from "../components/action/preferences";
import { useTranslation } from "../services/useTranslation";
import { PushNotifications } from "@capacitor/push-notifications";
import { Haptics } from "@capacitor/haptics";
import useCommon from "../components/action/Common";

const Profile = () => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const userData = await loadUser();
            setUser(userData);
        };
        fetchUser();

        // Listen to user data updates from preferencesEmitter (e.g., when getProfile updates user data)
        const unsubscribe = preferencesEmitter.on("userUpdated", (updatedUserData) => {
            // Handle both nested structure { token, user } and flat structure
            const userData = updatedUserData?.user || updatedUserData;
            if (userData) {
                setUser(userData);
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

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

                const playNotificationEffects = async () => {
                    try {
                        await Haptics.vibrate();
                        const audio = new Audio('/assets/mixkit-bell-notification-933.mp3');
                        await audio.play();
                    } catch (error) {
                        // ignore playback errors
                    }
                };

                const pushNotificationReceivedListener = await PushNotifications.addListener(
                    "pushNotificationReceived",
                    async (notification) => {
                        await playNotificationEffects();

                        const notificationFull = f7.notification.create({
                            icon: '<i class="icon icon-f7"></i>',
                            title: notification.title || 'New Notification',
                            titleRightText: 'now',
                            subtitle: notification.subtitle || '',
                            text: notification.body || 'You have a new message',
                            closeTimeout: 5000,
                            closeOnClick: false,
                            closeButton: true,
                            on: {
                                close: function () {},
                            }
                        });

                        notificationFull.open();

                        if (notification.data?.checkin_status && isActive) {
                            setTimeout(() => {
                                if (!isActive) return;
                                const router = f7.views?.main?.router;
                                if (router?.currentRoute?.path === "/home") return;
                                navigate("/home", { animate: false });
                            }, 100);
                        }
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
    }, [navigate]);

    const formatLastLogin = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `${formattedDate} ${formattedTime}`;
    };

    const getRoleDisplay = (role) => {
        if (!role) return "-";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getLocaleDisplay = (locale) => {
        const localeMap = {
            'en': 'English',
            'cn': '中文',
            'thai': 'Thailand',
            'viet': 'Vietnamese'
        };
        return localeMap[locale] || locale || "-";
    };

    if (!user) {
        return (
            <Page className="profile-page">
                <Header title={t("Profile")} />
                <div className="content-panel">
                    <div className="content">
                        <div className="profile-loading">
                            {t("Loading...")}
                        </div>
                    </div>
                </div>
            </Page>
        );
    }

    return (
        <Page className="profile-page">
            <Header title={t("Profile")} />
            <div className="content-panel">
                <div className="content">
                    <div className="profile-info-card">
                        <div className="profile-info-item">
                            <div className="profile-info-label font-medium font-bold">
                                {t("Name")}:
                            </div>
                            <div className="profile-info-value font-medium">
                                {user?.name || "-"}
                            </div>
                        </div>
                        <div className="profile-info-item">
                            <div className="profile-info-label font-medium font-bold">
                                {t("Username")}:
                            </div>
                            <div className="profile-info-value font-medium">
                                {user?.username || "-"}
                            </div>
                        </div>
                        <div className="profile-info-item">
                            <div className="profile-info-label font-medium font-bold">
                                {t("Role")}:
                            </div>
                            <div className="profile-info-value font-medium">
                                {getRoleDisplay(user?.role)}
                            </div>
                        </div>
                        {/* <div className="profile-info-item">
                            <div className="profile-info-label font-medium font-bold">
                                {t("Language")}:
                            </div>
                            <div className="profile-info-value font-medium">
                                {getLocaleDisplay(user?.locale)}
                            </div>
                        </div> */}
                        {/* <div className="profile-info-item">
                            <div className="profile-info-label font-medium font-bold">
                                {t("Last Login")}:
                            </div>
                            <div className="profile-info-value font-medium">
                                {formatLastLogin(user?.last_login_at)}
                            </div>
                        </div> */}
                    </div>
                    {user.qr && (
                        <div className="qr-code-container">
                            <QRCode value={user.qr} />
                        </div>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default Profile;