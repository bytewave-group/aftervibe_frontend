import React, { useState, useEffect, useRef } from "react";
import { Device } from "@capacitor/device";
import { ScreenOrientation } from "@capacitor/screen-orientation";

export default function useLockScreenOrientation(props) {
  useEffect(() => {
    let isMounted = true;
    const lockScreenOrientation = async () => {
      try {
        const info = await Device.getInfo();

        if (info.platform === "android" || info.platform === "ios") {
          await ScreenOrientation.lock({ orientation: "portrait" });
        } else {
        }
      } catch (e) {
        console.error("Failed to lock screen orientation:");
      }
    };

    lockScreenOrientation();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
