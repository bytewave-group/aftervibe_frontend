import { useState, useRef, useCallback, memo, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { Capacitor } from "@capacitor/core";
import GlobalState from "../../../../../atoms/GlobalState";
import { useTabChannelMessage } from "@my-common-tool/tool/tab-channel-message";
import { validateLanguage } from "@my-common-tool/tool/i18n-init";
import LiveChatState from "../../LiveChatState";
import appConfig from "./../../../../../../appconfig.json";
//? ==================================================================
const USE_DEFAULT_SETTINGS = appConfig?.use_default_livechat_settings;
const DEFAULT_SETTINGS = appConfig?.default_livechat_settings?.tawk;

const USE_CUSTOM_QUERY_SELECTOR_CURRENT_PAGE =
  appConfig?.custom_livechat_settings?.use_custom_query_selector_current_page;
const CURRENT_PAGE_QUERY_SELECTOR = USE_CUSTOM_QUERY_SELECTOR_CURRENT_PAGE
  ? appConfig?.custom_livechat_settings?.custom_query_selector_current_page
  : "#view-home .page-current .page-content";

const DELAY_CURRENT_PAGE_ELEMENT_EXIST =
  appConfig?.custom_livechat_settings
    ?.custom_delay_current_page_element_exist || 3000;

const iframeOriginalUrl = new URL("./iframe-index.html", import.meta.url).href;

export const TawkManager = () => {
  const { t, i18n } = useTranslation();
  const global = useRecoilValue(GlobalState);
  const [liveChateState, setLiveChateState] = useRecoilState(LiveChatState);
  const { is_show } = liveChateState;

  const IOS_FALLBACK_FULL_ORIGIN =
    global?.meta?.canonical_url ||
    global?.meta?.home?.canonical_url ||
    appConfig?.canonical_url;

  const IOS_FALLBACK_FULL_URL = `${IOS_FALLBACK_FULL_ORIGIN}/iframe_ios_webview`;

  const iframeNewOrigin = useMemo(() => {
    let origin;

    if (Capacitor.getPlatform() === "ios") {
      try {
        origin = new URL(IOS_FALLBACK_FULL_URL)?.origin;
      } catch (e) {
        origin = "*";
      }
    } else {
      origin = window.location.origin;
    }
    return origin;
  }, [IOS_FALLBACK_FULL_URL]);

  const { origin, pathname } = new URL(iframeOriginalUrl);

  const iframeFinalUrl =
    Capacitor.getPlatform() === "ios"
      ? IOS_FALLBACK_FULL_URL
      : //? use local build assets
        new URL(pathname, window.location.origin).href;

  //* ================================================== */
  //? send channel name
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [isIframeChannelReady, setIsIframeChannelReady] = useState(false);
  //* ================================================== */

  const {
    subscribe: subscribeIframeSend,
    sendToIframe,
    channelName: channelNameWithPrefix,
  } = useTabChannelMessage("message-with-iframe", {
    crossOrigin: true,
    handlePostMessageToIframe: (msg) => {
      iframeRef.current?.contentWindow?.postMessage(msg, iframeNewOrigin);
    },
  });

  //? trigger
  const { subscribe: subscribeTrigger } = useTabChannelMessage(
    "control-iframe-page",
  );
  //* ================================================== */

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isIframeLoaded || !channelNameWithPrefix) return;

    const handler = (event) => {
      setIsIframeChannelReady(true);
    };

    const unSubscribe = subscribeIframeSend("CHANNEL_READY", handler);

    sendToIframe({
      type: "INIT_MESSAGE_CHANNEL",
      data: { channelName: channelNameWithPrefix },
    });

    return () => {
      unSubscribe();
    };
  }, [isIframeLoaded, channelNameWithPrefix]);
  //* ================================================== */

  useEffect(() => {
    if (!sendToIframe) {
      return;
    }

    const unSubscribeFromIframe = subscribeIframeSend("HIDE_IFRAME", () => {
      setLiveChateState((prev) => ({
        ...prev,
        is_show: false,
      }));
    });

    const unSubscribeTriggerList = [
      {
        type: "TRIGGER_LIVE_CHAT_OPEN",
        handler: () => {
          setLiveChateState((prev) => ({
            ...prev,
            is_show: true,
          }));
          sendToIframe({ type: "TRIGGER_maximize" });
        },
      },
      {
        type: "TRIGGER_LIVE_CHAT_CLOSE",
        handler: () => {
          setLiveChateState((prev) => ({
            ...prev,
            is_show: false,
          }));
          sendToIframe({ type: "TRIGGER_minimize" });
        },
      },
    ].map((item) => {
      const unSubscribe = subscribeTrigger(item?.type, item?.handler);
      return unSubscribe;
    });

    return () => {
      unSubscribeTriggerList.forEach((unSubscribe) => unSubscribe());
      unSubscribeFromIframe();
    };
  }, [sendToIframe]);

  const currentLanguage = useMemo(() => {
    return validateLanguage(i18n?.language);
  }, [i18n.language]);
  //* ================================================== */
  const [initTawkDetail, setInitTawkDetail] = useState({
    widget_id: "",
    property_id: "",
  });

  //? get initDetail from global
  useEffect(() => {
    let widget_id;
    let property_id;

    if (USE_DEFAULT_SETTINGS) {
      widget_id = DEFAULT_SETTINGS?.widget_id;
      property_id = DEFAULT_SETTINGS?.property_id;
    } else if (global?.livechat_settings?.twakto) {
      widget_id = global.livechat_settings.twakto?.widget_id;
      property_id = global.livechat_settings.twakto?.property_id;
    } else {
      return;
    }

    setInitTawkDetail((prev) => ({
      ...prev,
      widget_id,
      property_id,
      __EXIST_DATA: true,
    }));
  }, [global.tawk, currentLanguage, DEFAULT_SETTINGS, USE_DEFAULT_SETTINGS]);
  //* ================================================== */
  //? IFRAME SECTION
  const iframeContainerRef = useRef(null);
  const iframeRef = useRef(null);
  //* ================================================== */
  //* calculate height

  useEffect(() => {
    const computeAndApplyPosition = (container) => {
      const pageContent = document.querySelector(CURRENT_PAGE_QUERY_SELECTOR);

      if (!pageContent) return;

      const computedStyle = getComputedStyle(pageContent);

      const safeAreaTopWithpx =
        computedStyle.getPropertyValue("--f7-safe-area-top") || "0px";

      const safeAreaBottomWithpx =
        computedStyle.getPropertyValue("--f7-safe-area-bottom") || "0px";

      container.style.height = `calc(100dvh - ${safeAreaTopWithpx} - ${safeAreaBottomWithpx})`;
      container.style.top = `${safeAreaTopWithpx}`;
    };

    iframeContainerRef.current.style.display = "none";
    setTimeout(() => {
      computeAndApplyPosition(iframeContainerRef.current);
    }, DELAY_CURRENT_PAGE_ELEMENT_EXIST);
  }, []);

  //? START load
  useEffect(() => {
    if (!isIframeChannelReady) return;
    if (initTawkDetail?.property_id && initTawkDetail?.widget_id) {
      sendToIframe({
        type: "INIT_TAWK",
        data: {
          propertyId: initTawkDetail?.property_id,
          widgetId: initTawkDetail?.widget_id,
        },
      });
    }
  }, [isIframeChannelReady, initTawkDetail]);
  //* ================================================== */

  return (
    <div
      ref={iframeContainerRef}
      style={{
        background: "transparent",
        zIndex: 5001,
        display: is_show ? "block" : "none",
        pointerEvents: is_show ? "auto" : "none",
      }}
      className="position-absolute w-100"
    >
      {iframeFinalUrl && (
        <iframe
          id="tawk-iframe"
          ref={iframeRef}
          src={iframeFinalUrl}
          onLoad={() => setIsIframeLoaded(true)}
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          className="w-100 h-100"
        />
      )}
    </div>
  );
};
