import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Preferences } from "@capacitor/preferences";
import { version as packageVersion } from "../../package.json";
import { CENTRAL_API_BASE } from "../config/barConfig";

const env = (key, fallback) => (import.meta.env[key] || "").trim() || fallback;

const HUB_SLUG = env("VITE_DISTRIBUTION_HUB_SLUG", "aftervibe");
const APP_SLUG = env("VITE_DISTRIBUTION_APP_SLUG", "staff");
const CHANNEL_SLUG = env("VITE_DISTRIBUTION_CHANNEL", "stable");
const ENVIRONMENT = env("VITE_DISTRIBUTION_ENVIRONMENT", "PRODUCTION");

const INSTALLATION_ID_KEY = "installation_id";

/** Update check outcomes returned by checkForUpdate(). */
export const UPDATE_STATUS = {
  UPGRADE: "upgrade",
  LATEST: "latest",
  NOT_CONFIGURED: "not_configured",
  ERROR: "error",
};

/** Distribution platform for the running build: ANDROID, IOS or WEB. */
export const getDistributionPlatform = () => {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    return "ANDROID";
  }
  if (platform === "ios") {
    return "IOS";
  }
  return "WEB";
};

/**
 * Installed app version. Native builds read it from the app bundle; the web build falls back to package.json.
 * Resolves to { version, build, packageName } (build and packageName are empty on web).
 */
export const getAppVersionInfo = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      return {
        version: (info.version || "").trim() || packageVersion,
        build: String(info.build ?? "").trim(),
        packageName: (info.id || "").trim(),
      };
    } catch (error) {
      console.error("Unable to read app info:", error);
    }
  }

  return { version: packageVersion, build: "", packageName: "" };
};

const randomId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/** Random id identifying this installation for staged rollouts; created once and kept in Preferences. */
export const getOrCreateInstallationId = async () => {
  const { value } = await Preferences.get({ key: INSTALLATION_ID_KEY });
  if (value) {
    return value;
  }

  const installationId = randomId();
  await Preferences.set({ key: INSTALLATION_ID_KEY, value: installationId });
  return installationId;
};

const pickUrl = (...candidates) =>
  candidates.find((url) => typeof url === "string" && url.trim())?.trim() || "";

/** Best download link for the platform: Android APK/Play/Huawei, iOS IPA/App Store, otherwise the web URL. */
export const pickDownloadUrl = (platform, downloadUrls = {}) => {
  if (platform === "ANDROID") {
    return pickUrl(downloadUrls.apkUrl, downloadUrls.playStoreUrl, downloadUrls.huaweiStoreUrl);
  }
  if (platform === "IOS") {
    return pickUrl(downloadUrls.ipaUrl, downloadUrls.appStoreUrl);
  }
  return pickUrl(downloadUrls.webUrl);
};

/**
 * Ask the central distribution service whether a newer build of the staff app is released.
 * Resolves to { status, currentVersion, targetVersion, releaseNotes, isForceUpdate, downloadUrl, reason };
 * status is one of UPDATE_STATUS. Never throws.
 */
export const checkForUpdate = async () => {
  const platform = getDistributionPlatform();
  const { version, build, packageName } = await getAppVersionInfo();

  const result = {
    status: UPDATE_STATUS.LATEST,
    currentVersion: version,
    targetVersion: "",
    releaseNotes: "",
    isForceUpdate: false,
    downloadUrl: "",
    reason: "",
  };

  const params = {
    platform,
    currentVersion: version || "0.0.0",
    environment: ENVIRONMENT,
    channel: CHANNEL_SLUG,
    installationId: await getOrCreateInstallationId(),
  };
  if (packageName) {
    params.packageName = packageName;
  }
  if (/^\d+$/.test(build)) {
    params.currentBuild = build;
  }

  const url = `${CENTRAL_API_BASE}/hubs/${encodeURIComponent(HUB_SLUG)}/apps/${encodeURIComponent(APP_SLUG)}/distribution/check`;

  let data;
  try {
    const res = await axios.get(url, { params, headers: { Accept: "application/json" } });
    data = res.data;
  } catch (error) {
    return {
      ...result,
      status: error.response?.status === 404 ? UPDATE_STATUS.NOT_CONFIGURED : UPDATE_STATUS.ERROR,
    };
  }

  if (!data || typeof data !== "object") {
    return { ...result, status: UPDATE_STATUS.ERROR };
  }

  const targetVersion = typeof data.targetVersion === "string" ? data.targetVersion.trim() : "";
  const notes = [data.releaseNotes, data.changelog].find((text) => typeof text === "string" && text.trim());

  return {
    ...result,
    status: data.upgradeAvailable && targetVersion ? UPDATE_STATUS.UPGRADE : UPDATE_STATUS.LATEST,
    currentVersion: data.currentVersion || version,
    targetVersion,
    releaseNotes: notes ? notes.trim() : "",
    isForceUpdate: Boolean(data.isForceUpdate),
    downloadUrl: pickDownloadUrl(platform, data.downloadUrls || {}),
    reason: data.reason || "",
  };
};

/** Open a download link outside the app (system browser on native, new tab on web). */
export const openDownloadUrl = async (url) => {
  if (!url) {
    return;
  }

  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      await Browser.open({ url });
      return;
    } catch (error) {
      console.error("Browser.open failed, falling back to window.open:", error);
    }
  }

  window.open(url, isNative ? "_system" : "_blank");
};
