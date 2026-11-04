import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { FCM } from "@capacitor-community/fcm";
import { Device } from "@capacitor/device";
import { Haptics } from "@capacitor/haptics";
import { f7 } from "framework7-react";
import env from "../../environment.json";
import { deleteFcmToken, loadFcmToken } from "../components/action/preferences.jsx";
import { useTranslation } from "../services/useTranslation";
import useAuthenticate from "../actions/Authenticate";

export function useHomePushNotifications(userRole) {
  const { t } = useTranslation();
  const { sendDeviceToken } = useAuthenticate();
  const pushNotificationListeners = useRef([]);
  const hasSentDeviceToken = useRef(false);

  useEffect(() => {
    const role = userRole?.toLowerCase();
    if (!role) return;

    const platform = Capacitor.getPlatform();
    if (platform !== "ios" && platform !== "android") return;

    const setupPushNotifications = async () => {
      try {
        const registrationListener = await PushNotifications.addListener("registration", async (token) => {
          if (token && !hasSentDeviceToken.current) {
            hasSentDeviceToken.current = true;
            const deviceInfo = await Device.getInfo();
            const deviceType = Capacitor.getPlatform();
            const { model, isVirtual } = deviceInfo;
            sendDeviceToken({
              private_key: env.private_key,
              device_token: token.value,
              device_type: deviceType,
              model,
              is_virtual: isVirtual ?? false,
              type: role,
            });
          }
        });
        pushNotificationListeners.current.push(registrationListener);

        const existingToken = await loadFcmToken();
        if (existingToken && !hasSentDeviceToken.current && role) {
          hasSentDeviceToken.current = true;
          const deviceInfo = await Device.getInfo();
          const deviceType = Capacitor.getPlatform();
          const { model, isVirtual } = deviceInfo;
          sendDeviceToken({
            private_key: env.private_key,
            device_token: existingToken,
            device_type: deviceType,
            model,
            is_virtual: isVirtual ?? false,
            type: role,
          });
        }

        const resultCheck = await PushNotifications.checkPermissions();
        if (resultCheck.receive !== "granted") {
          const resultRequest = await PushNotifications.requestPermissions();
          if (resultRequest.receive === "granted") {
            await PushNotifications.register();
            await FCM.subscribeTo({ topic: "allDevices" });
          }
        } else {
          await PushNotifications.register();
          await FCM.subscribeTo({ topic: "allDevices" });
        }

        const registrationErrorListener = await PushNotifications.addListener("registrationError", (error) => {
          console.error("=== FCM Registration Error ===");
          console.error(error);
        });
        pushNotificationListeners.current.push(registrationErrorListener);

        const playNotificationEffects = async () => {
          try {
            await Haptics.vibrate();
            const audio = new Audio("/assets/mixkit-bell-notification-933.mp3");
            await audio.play();
          } catch (error) {
            console.error("Error playing notification effects:", error);
          }
        };

        const pushNotificationReceivedListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          async (notification) => {
            await playNotificationEffects();

            const notificationFull = f7.notification.create({
              icon: '<i class="icon icon-f7"></i>',
              title: notification.title || t("New Notification"),
              titleRightText: "now",
              subtitle: notification.subtitle || "",
              text: notification.body || t("You have a new message"),
              closeTimeout: 5000,
              closeOnClick: false,
              closeButton: true,
              on: {
                close: function () {},
              },
            });

            notificationFull.open();

            PushNotifications.getDeliveredNotifications();
          }
        );
        pushNotificationListeners.current.push(pushNotificationReceivedListener);

        const pushNotificationActionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          () => {}
        );
        pushNotificationListeners.current.push(pushNotificationActionListener);
      } catch (error) {
        console.error("Error setting up push notifications:", error);
      }
    };

    setupPushNotifications();

    return () => {
      pushNotificationListeners.current.forEach((listener) => {
        if (listener && listener.remove) {
          listener.remove();
        }
      });
      pushNotificationListeners.current = [];
      hasSentDeviceToken.current = false;
    };
  }, [userRole]); // eslint-disable-line react-hooks/exhaustive-deps -- omit sendDeviceToken/t identity churn

  const unregisterPushNotifications = useCallback(async () => {
    const platform = Capacitor.getPlatform();
    if (platform !== "ios" && platform !== "android") {
      return;
    }

    try {
      await FCM.unsubscribeFrom({ topic: "allDevices" });
    } catch (error) {
      console.warn("Failed to unsubscribe from push topic:", error);
    }

    try {
      pushNotificationListeners.current.forEach((listener) => {
        if (listener?.remove) {
          listener.remove();
        }
      });
      pushNotificationListeners.current = [];
      await PushNotifications.removeAllListeners();
    } catch (error) {
      console.warn("Failed to remove push notification listeners:", error);
    }

    try {
      if (typeof PushNotifications.unregister === "function") {
        await PushNotifications.unregister();
      }
    } catch (error) {
      console.warn("Failed to unregister push notifications:", error);
    }

    hasSentDeviceToken.current = false;
    await deleteFcmToken();
  }, []);

  return { unregisterPushNotifications };
}
