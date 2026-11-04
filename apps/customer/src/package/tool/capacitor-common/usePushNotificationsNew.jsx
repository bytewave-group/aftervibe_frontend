// hooks/usePushNotifications.jsx
import { useEffect, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { Preferences } from "@capacitor/preferences";
import { show_toast } from "../toast";
import { useTokenAndUser } from "../../../components/action/user-data";
import { add_device_token } from "../common-api";

export const push_notification_add = async () => {
  try {
    const deviceType = Capacitor.getPlatform();
    if (deviceType === "ios" || deviceType === "android") {
      const deviceInfo = await Device.getInfo();
      const { model, isVirtual } = deviceInfo;

      const deviceToken = await loadDeviceToken();

      if (deviceToken) {
        const res = await add_device_token({
          device_token: deviceToken,
          device_type: deviceType,
          model: model,
          is_virtual: isVirtual ?? false,
        });
      }
    }
  } catch (e) {}
};

export const push_notification_remove = async () => {
  PushNotifications.unregister();
};

async function saveDeviceToken(item) {
  await Preferences.set({
    key: "push_notification_token",
    value: item,
  });
}

async function loadDeviceToken() {
  const { value } = await Preferences.get({ key: "push_notification_token" });
  // if (value) {
  // }
  return value;
}

export default function usePushNotifications({ isMain = false } = {}) {
  const { token, user } = useTokenAndUser();

  const listenersRef = useRef([]);
  const initialized = useRef(false);

  // push notification
  useEffect(() => {
    let registrationListener, registrationErrorListener;
    let notificationReceivedListener, notificationActionListener;

    const initPushNotification = async () => {
      const platform = Capacitor.getPlatform();

      if (platform !== "ios" && platform !== "android") return;

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== "granted") {
        const request = await PushNotifications.requestPermissions();
        if (request.receive !== "granted") {
          // console.warn("Push permission not granted");
          return;
        }
      }

      await PushNotifications.register();

      // Listen for push notification registration success (FCM token)
      registrationListener = await PushNotifications.addListener(
        "registration",
        async (token) => {
          await saveDeviceToken(token.value);
        },
      );

      // Listen for push notification errors
      registrationErrorListener = await PushNotifications.addListener(
        "registrationError",
        (error) => {
          // console.error("Push registration error:", error);
          if (platform !== "ios") show_toast?.("Push registration failed");
        },
      );

      // Listen for incoming push notifications
      notificationReceivedListener = await PushNotifications.addListener(
        "notificationReceived",
        async (notification) => {
          // console.log('Push notification received:', notification);// Fetch and log all delivered notifications
          const deliveredNotifications =
            await PushNotifications.getDeliveredNotifications();
          // console.log('All delivered notifications:', deliveredNotifications);
        },
      );
    };

    listenersRef.current = [
      registrationListener,
      registrationErrorListener,
      notificationReceivedListener,
      notificationActionListener,
    ];

    initPushNotification();

    return () => {
      listenersRef.current.forEach((l) => l?.remove?.());
      listenersRef.current = [];
      initialized.current = false;
    };
  }, []);

  return;
}
