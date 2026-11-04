import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Device } from "@capacitor/device";
import { App as CapacitorApp } from "@capacitor/app";
import { f7 } from "framework7-react";
import { open_confirm_message } from "../dialog";

export default function useNativeMobileBack({ isMain = false } = {}) {
  const { t } = useTranslation();

  useEffect(() => {
    let platform = null;
    let backHandler = null;

    const setup = async () => {
      const info = await Device.getInfo();
      platform = info.platform;

      backHandler = await CapacitorApp.addListener("backButton", async () => {
        if (platform !== "ios") {
          if (f7.views.main?.router?.history?.length > 1) {
            f7.views.main.router.back();
          } else {
            const res = await open_confirm_message(
              "",
              t("Are you sure you want to exit the app?"),
            );
            if (res && typeof CapacitorApp?.exitApp === "function") {
              CapacitorApp.exitApp();
            }
          }
        }
      });
    };

    if (isMain) {
      setup();
    }

    return () => {
      backHandler?.remove();
    };
  }, []);
}
