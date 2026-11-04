import React, { useEffect, useRef, useMemo } from "react";
import { f7 } from "framework7-react";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { useRecoilValue } from "recoil";
import packageJson from "../../../../package.json";
import GlobalState from "../../../atoms/GlobalState";
import { open_confirm_message } from "../dialog";

const isDebug = false;

const showDebug = (type, ...args) => {
  if (isDebug) {
    return console?.[type](`[CAPGO DEBUG : ${type}] :`, ...args);
  }
};

const showDebugMessage = (...args) => {
  return showDebug("log", args);
};

const showDebugError = (...args) => {
  return showDebug("error", args);
};

/**
 * Custom React hook to handle Capgo updates for Android and iOS.
 *
 * * Requires:
 * - `CapacitorUpdater` plugin and Framework7 for dialogs.
 *
 * * Features:
 * - Checks for new app version using CapacitorUpdater.
 * - Prompts user with a confirmation dialog before downloading updates.
 * - Shows download progress with a progress dialog.
 * - Handles update failures and notifies user appropriately.
 * - Listens to app state changes to trigger update checks when app becomes active.
 *
 * Usage at app.jsx:
 * ```js
 * useCapgoUpdater();
 * ```
 *
 * ! ---------------------------------------------------------------------------
 * !! IMPORTANT:
 * !- In `capacitor.config.json`,
 * !  - set `"directUpdate": false` and `"autoUpdate": false`
 * !- If configured incorrectly, user confirmation cannot control the download.
 * ! ---------------------------------------------------------------------------
 */

export default function useCapgoUpdater(props) {
  const global = useRecoilValue(GlobalState);
  const globalTheme = useMemo(() => global?.theme, [global]);
  const isInit = useRef(false);

  const dialogRef = useRef(null);

  const showProgressDialog = (percent) => {
    if (!dialogRef.current) {
      dialogRef.current = f7.dialog.progress("Downloading update...", percent);
    } else {
      dialogRef.current.setTitle(`Downloading... ${percent}%`);
      dialogRef.current.setProgress(percent);
    }

    if (percent >= 100) {
      dialogRef.current?.close();
      dialogRef.current = null;
    }
  };

  const closeDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
      dialogRef.current = null;
    }
  };

  const isConfirmDialogExistRef = useRef(null);

  async function checkForUpdates() {
    const info = await Device.getInfo();

    if (!["android", "ios"].includes(info?.platform)) return;

    let latest;
    let currentVersion;

    currentVersion = packageJson.version;

    try {
      latest = await CapacitorUpdater.getLatest();
      if (latest?.url && latest?.version !== currentVersion) {
        if (isConfirmDialogExistRef.current) {
          showDebugMessage("[Confirm] Exist , Skip");
          return;
        }

        showDebugMessage("[Confirm] Show");

        isConfirmDialogExistRef.current = true;

        dialogRef.current = await open_confirm_message(
          "Update Available",
          `A new version (${latest.version}) is available. Download now?`,
        );

        isConfirmDialogExistRef.current = false;

        showDebugMessage("dialogRef.current", dialogRef.current);
        const resConfirm = dialogRef.current;
        dialogRef.current = null;

        if (resConfirm) {
          await CapacitorUpdater.download({
            url: latest.url,
            version: latest.version,
            sessionKey: latest.sessionKey,
          });
        }
      } else {
        showDebugMessage("No new varsion");
      }
    } catch (error) {
      showDebugError("Error getLatest:", error);
    }
  }

  //! ================================================================
  //! App Listener
  useEffect(() => {
    const notify = async () => {
      try {
        await CapacitorUpdater.notifyAppReady();
        showDebugMessage("[notifyAppReady] forced call");
      } catch (err) {
        showDebugError("[notifyAppReady] forced error:", err);
      }
    };

    const addListener = () => {
      CapacitorUpdater.addListener("appReady", () => {
        showDebugMessage("[notifyAppReady] appReady");
      });

      CapacitorUpdater.addListener("downloadComplete", async (res) => {
        try {
          await CapacitorUpdater.set(res.bundle);
        } catch (error) {
          showDebugError("Apply update failed:", error);
        }
      });

      CapacitorUpdater.addListener("download", (info) => {
        showProgressDialog(info.percent);
      });

      CapacitorUpdater.addListener("downloadFailed", async (error) => {
        showDebugError("Download failed:", error);
        closeDialog();

        const platform = Capacitor.getPlatform();

        let message =
          "Failed to download update. Please check your network and try again later.";

        if (platform === "ios") {
          message += "\n\nYou may need to restart the app manually to retry.";
        } else if (platform === "android") {
          message += "\n\nDo you want to restart the app now?";
        }

        f7.dialog.confirm(message, "Update Error", () => {
          if (platform === "android") {
            CapApp.exitApp();
          } else {
            window.location.reload();
          }
        });
      });
    };

    notify();

    showDebugMessage("[Listener] : add event listener");
    addListener();

    return () => {
      showDebugMessage("[Listener] : remove event listener");

      if (typeof CapacitorUpdater?.removeAllListeners === "function") {
        CapacitorUpdater.removeAllListeners();
      }
    };
  }, []);

  const stateChangeListenerRef = useRef(null);

  async function handleAppStateChange(state) {
    showDebugMessage("TRIGGER :State Change", JSON.stringify(state), "||");
    if (state.isActive) {
      showDebugMessage("TRIGGER :IS_ACTIVE");
      try {
        await checkForUpdates();
      } catch (error) {
        showDebugError("TRIGGER Error:", error);
      }
    }
  }

  //? init
  useEffect(() => {
    if (isInit.current || globalTheme === "blank") return;

    const init = async () => {
      const info = await Device.getInfo();

      if (!stateChangeListenerRef.current) {
        isInit.current = true;
        showDebugMessage("[stateChangeListener]: ADD");
        stateChangeListenerRef.current = CapApp.addListener(
          "appStateChange",
          handleAppStateChange,
        );

        if (info.platform !== "ios") {
          handleAppStateChange({ isActive: true });
        }
      }
    };

    init();

    return () => {
      if (stateChangeListenerRef.current) {
        showDebugMessage("[stateChangeListener]: REMOVE");
        stateChangeListenerRef.current?.remove();
      }
      isInit.current = null;
    };
  }, [globalTheme]);
  //! ================================================================

  return null;
}
