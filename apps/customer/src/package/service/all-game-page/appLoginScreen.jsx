import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { show_toast } from "@my-common-tool/tool/toast";
import { launch } from "@my-common-tool/tool/api";
import { openNewTabCrossPlatform } from "@my-common-tool/tool/cross-platform-navigate";

import "./app-login-screen.scss";

import FullPagePreloader from "../../../components/FullPagePreloader.jsx";

const normalizeValue = (value) => {
  if (value == null) return "";
  return String(value)?.trim();
};

const CredentialField = ({ label, value, placeholder, onCopy }) => {
  const hasValue = Boolean(value);

  return (
    <div className="app-login-screen-field-group">
      <label className="app-login-screen-field-label">{label}</label>
      <div className="app-login-screen-field">
        <input
          type="text"
          readOnly
          value={value}
          placeholder={placeholder}
          aria-label={label}
        />
        <button
          type="button"
          className={`app-login-screen-copy-btn${hasValue ? "" : " is-disabled"}`}
          onClick={() => hasValue && onCopy?.(value)}
          disabled={!hasValue}
          aria-label={`Copy ${label}`}
        >
          <img src="/images/copy2.png" alt="Copy" draggable={false} />
        </button>
      </div>
    </div>
  );
};

const PlatformButton = ({ icon, label, onClick, disabled = false }) => (
  <button
    type="button"
    className={`app-login-screen-platform-btn${disabled ? " is-disabled" : ""}`}
    onClick={onClick}
    disabled={disabled}
  >
    <img src={icon} alt="" draggable={false} />
    <span>{label}</span>
  </button>
);

export default function AppLoginScreen({
  brandImage,
  brandName,
  username,
  password,
  providerCode,
  footerText,
  apiStatus,
  onOpenIos,
  onOpenAndroid,
  onBack,
}) {
  const { t } = useTranslation();
  const [launchDetails, setLaunchDetails] = useState(null);
  const [launchStatusMessage, setLaunchStatusMessage] = useState("");
  const [isLaunchLoading, setIsLaunchLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchLaunchDetails = async () => {
      if (!providerCode) {
        setLaunchDetails(null);
        setLaunchStatusMessage("");
        setIsLaunchLoading(false);
        return;
      }

      setIsLaunchLoading(true);
      const isMobile = window.innerWidth < 768;
      try {
        const res = await launch({
          code: providerCode,
          game: "",
          isMobile,
        });

        if (cancelled) return;

        if (!res?.status) {
          setLaunchDetails(null);
          setLaunchStatusMessage(
            normalizeValue(res?.message) || t("Unable to load app details."),
          );
          return;
        }

        const launcher = res?.launcher ?? {};
        const memberAccount = launcher?.member_account ?? {};
        setLaunchStatusMessage("");

        setLaunchDetails({
          username: normalizeValue(memberAccount?.username),
          password: normalizeValue(memberAccount?.password),
          iosUrl: normalizeValue(launcher?.ios_url),
          androidUrl: normalizeValue(launcher?.android_url),
        });
      } finally {
        if (!cancelled) {
          setIsLaunchLoading(false);
        }
      }
    };

    void fetchLaunchDetails();

    return () => {
      cancelled = true;
    };
  }, [providerCode, t]);

  const resolvedUsername = useMemo(
    () => normalizeValue(launchDetails?.username || username),
    [launchDetails?.username, username],
  );
  const resolvedPassword = useMemo(
    () => normalizeValue(launchDetails?.password || password),
    [launchDetails?.password, password],
  );
  const iosUrl = normalizeValue(launchDetails?.iosUrl);
  const androidUrl = normalizeValue(launchDetails?.androidUrl);
  const resolvedStatusMessage =
    normalizeValue(apiStatus) || launchStatusMessage;

  const handleCopy = useCallback(
    async (value) => {
      if (!value) return;

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          show_toast(t("Copy successful"));
          return;
        }
      } catch (error) { }

      show_toast(t("Copy not supported"));
    },
    [t],
  );

  const handleOpenUrl = useCallback(
    (url) => {
      if (url) {
        openNewTabCrossPlatform(
          url.startsWith("http") ? url : `http://${url}`,
          "_blank",
          "noopener,noreferrer",
        );
        return;
      }

      show_toast(t("Download link unavailable"));
    },
    [t],
  );

  return (
    <div className="app-login-screen">
      {/* {isLaunchLoading ? <FullPagePreloader /> : null} */}
      {resolvedStatusMessage ? (
        <div className="app-login-screen-status-message text-center font-large font-bold">
          {resolvedStatusMessage}
        </div>
      ) : null}
      <div className="app-login-screen-panel">
        <div className="app-login-screen-brand">
          {brandImage ? (
            <img
              src={brandImage}
              alt={brandName || "Provider"}
              draggable={false}
            />
          ) : (
            <span className="app-login-screen-brand-name">{brandName}</span>
          )}
        </div>

        <div className="app-login-screen-fields">
          <CredentialField
            label={t("Username")}
            value={resolvedUsername}
            placeholder={t("Available after launch")}
            onCopy={handleCopy}
          />
          <CredentialField
            label={t("Password")}
            value={resolvedPassword}
            placeholder={t("Available after launch")}
            onCopy={handleCopy}
          />
        </div>

        <div className="app-login-screen-actions">
          <PlatformButton
            icon="/images/ios-download.png"
            label={t("iOS 64bit")}
            onClick={() => handleOpenUrl(iosUrl)}
            disabled={isLaunchLoading || !iosUrl}
          />
          <PlatformButton
            icon="/images/android-download.png"
            label={t("Android")}
            onClick={() => handleOpenUrl(androidUrl)}
            disabled={isLaunchLoading || !androidUrl}
          />
        </div>

        {footerText ? (
          <p className="app-login-screen-hint">{footerText}</p>
        ) : null}
      </div>
    </div>
  );
}
