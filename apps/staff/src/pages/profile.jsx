import React, { useState, useEffect } from "react";
import { Page, Button, f7 } from "framework7-react";
import QRCode from "react-qr-code";
import Header from "../components/header";
import { loadUser, preferencesEmitter } from "../components/action/preferences";
import { useTranslation } from "../services/useTranslation";
import { PushNotifications } from "@capacitor/push-notifications";
import { Haptics } from "@capacitor/haptics";
import useCommon from "../components/action/Common";
import {
    UPDATE_STATUS,
    checkForUpdate,
    getAppVersionInfo,
    openDownloadUrl,
} from "../services/updateService";

const escapeHtml = (text) =>
    String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const Profile = () => {
    const { t, i18n } = useTranslation();
    const { navigate } = useCommon();
    const [user, setUser] = useState(null);
    const [appVersion, setAppVersion] = useState("");
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    useEffect(() => {
        getAppVersionInfo().then(({ version, build }) => {
            setAppVersion(build ? `${version} (${build})` : version);
        });
    }, []);

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

    const showUpdateDialog = (update) => {
        const lines = [
            `<div class="update-dialog-version">${escapeHtml(t("New version: {{version}}", { version: update.targetVersion }))}</div>`,
            `<div class="update-dialog-version">${escapeHtml(t("Current version: {{version}}", { version: update.currentVersion }))}</div>`,
        ];
        if (update.isForceUpdate) {
            lines.push(`<div class="update-dialog-mandatory">${escapeHtml(t("This is a mandatory update. Please update to continue using the app."))}</div>`);
        }
        if (update.releaseNotes) {
            lines.push(`<div class="update-dialog-notes-title">${escapeHtml(t("Release notes"))}</div>`);
            lines.push(`<div class="update-dialog-notes">${escapeHtml(update.releaseNotes)}</div>`);
        }
        if (!update.downloadUrl) {
            lines.push(`<div class="update-dialog-mandatory">${escapeHtml(t("Download link is not available"))}</div>`);
        }

        const buttons = [];
        if (!update.isForceUpdate) {
            buttons.push({ text: t("Later") });
        }
        if (update.downloadUrl) {
            buttons.push({
                text: t("Download"),
                bold: true,
                close: !update.isForceUpdate,
                onClick: () => openDownloadUrl(update.downloadUrl),
            });
        }
        if (buttons.length === 0) {
            buttons.push({ text: t("OK") });
        }

        f7.dialog
            .create({
                title: t("Update available"),
                text: `<div class="update-dialog-content">${lines.join("")}</div>`,
                buttons,
                cssClass: "update-dialog",
                closeByBackdropClick: !update.isForceUpdate,
            })
            .open();
    };

    const handleCheckForUpdate = async () => {
        if (isCheckingUpdate) {
            return;
        }

        setIsCheckingUpdate(true);
        f7.preloader.show();
        const update = await checkForUpdate();
        f7.preloader.hide();
        setIsCheckingUpdate(false);

        if (update.status === UPDATE_STATUS.UPGRADE) {
            showUpdateDialog(update);
            return;
        }

        const messages = {
            [UPDATE_STATUS.LATEST]: t("You are on the latest version"),
            [UPDATE_STATUS.NOT_CONFIGURED]: t("Update service not configured"),
            [UPDATE_STATUS.ERROR]: t("Unable to check for update. Please try again later."),
        };
        f7.dialog.alert(messages[update.status] || messages[UPDATE_STATUS.ERROR], t("Check for update"));
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
                    <div className="profile-info-card profile-update-card">
                        <div className="profile-info-item">
                            <div className="profile-info-label font-medium font-bold">
                                {t("App Version")}:
                            </div>
                            <div className="profile-info-value font-medium">
                                {appVersion || "-"}
                            </div>
                        </div>
                        <Button
                            className="profile-update-button font-bold"
                            fill
                            onClick={handleCheckForUpdate}
                            disabled={isCheckingUpdate}
                        >
                            {isCheckingUpdate ? t("Checking for update...") : t("Check for update")}
                        </Button>
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