import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { f7 } from "framework7-react";
import { ScreenOrientation } from "@capacitor/screen-orientation";

import navigate from "../navigate/Navigate";
import {
  getLanguage,
  getNavigateData,
  setNavigateData,
} from "../preferences/Preferences";

export function getUrlType(url) {
  const isAbsolute = /^https?:\/\//i.test(url);
  const isDeeplink = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(url) && !isAbsolute;
  const isInternal = !isAbsolute && !isDeeplink;
  return { isAbsolute, isDeeplink, isInternal };
}

export async function crossPlatformNavigate(urlOrPath) {
  const platform = Capacitor.getPlatform();

  const { isAbsolute, isDeeplink } = getUrlType(urlOrPath);

  if (platform === "web") {
    if (isDeeplink) {
      window.open(urlOrPath, "_blank", "noopener,noreferrer");
    } else {
      window.location.replace(urlOrPath);
    }
  } else {
    if (isAbsolute || isDeeplink) {
      openInAppBrowserWithoutHook(urlOrPath);
    } else {
      navigate(urlOrPath);
    }
  }
}

export async function openNewTabCrossPlatform(
  finalPath,
  target = "_blank",
  features = "noopener,noreferrer",
) {
  if (!finalPath || typeof finalPath !== "string") return;

  const platform = Capacitor.getPlatform();

  const { isAbsolute, isDeeplink } = getUrlType(finalPath);

  if (platform === "web") {
    const finalUrl =
      isDeeplink || isAbsolute
        ? finalPath
        : `${
            typeof window !== "undefined" ? window.location.origin : ""
          }${finalPath}`;

    window.open(finalUrl, target, features);
    return {
      status: "web",
    };
  } else {
    const finalUrl = finalPath;

    if (isAbsolute || isDeeplink) {
      setTimeout(() => {
        openInAppBrowserWithoutHook(finalUrl);
      }, 600); //delay to avoid display error f7 animate
      return {
        status: "opening_in_app_browser",
      };
    } else {
      if (
        ["/launch", "/launch_deposit"].some((prefix) =>
          String(finalUrl).startsWith(prefix),
        )
      ) {
        await setNavigateData({ comeFromPath: location?.pathname });
      }
      navigate(finalPath);

      return {
        status: "app_internal",
      };
    }
  }
}

async function showOpenInBrowserDialog(url, err) {
  let language;

  try {
    const getLang = await getLanguage();
    language = getLang || "en";
  } catch (error) {
    language = "en";
  }

  const messages = {
    en: "Unable to open this link in the app. Open in browser?",
    cn: "无法在应用内打开此链接。是否在浏览器中打开？",
    bm: "Pautan ini tidak dapat dibuka dalam aplikasi. Buka di pelayar?",
    th: "ไม่สามารถเปิดลิงก์นี้ในแอปได้ ต้องการเปิดในเบราว์เซอร์หรือไม่?",
    vi: "Không thể mở liên kết này trong ứng dụng. Mở bằng trình duyệt?",
  };
  f7.dialog.confirm(messages?.[language] || messages?.en, "", () => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

async function openInAppBrowserWithoutHook(url) {
  const { isDeeplink } = getUrlType(url);

  if (isDeeplink) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // **************************************************************************  */
  const handlerLoad = Browser.addListener("browserPageLoaded", async () => {
    await ScreenOrientation.unlock();
    handlerLoad.remove();
  });

  const handler = Browser.addListener("browserFinished", async () => {
    const navidate_data = await getNavigateData();
    const comeFromPaths = navidate_data?.comeFromPath;
    if (comeFromPaths) {
      navigate("/?forceCloseLoading=true");
    }

    await ScreenOrientation.lock({ orientation: "portrait" });
    handler.remove();
  });

  try {
    await Browser.open({ url: url }).catch((err) => {
      handlerLoad.remove();
      handler.remove?.();
      showOpenInBrowserDialog(url, err);
    });
  } catch (err) {
    handlerLoad.remove();
    handler.remove?.();
    showOpenInBrowserDialog(url, err);
  }
}
