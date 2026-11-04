import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import GlobalState from "../../../../../atoms/GlobalState";
import appConfig from "./../../../../../../appconfig.json";

export default function LiveChatManager(props) {
  const { t } = useTranslation();
  const global = useRecoilValue(GlobalState);

  const LICENSE = useMemo(() => {
    if (global?.theme === "blank") return "";
    return (
      global?.livechat_settings?.livechat?.license ??
      appConfig?.support_chat?.livechat?.license
    );
  }, [global?.theme, global?.livechat_settings?.livechat?.license]);

  useEffect(() => {
    if (window.__livechat_initialized) return;
    window.__livechat_initialized = true;

    const init = () => {
      if (window.__lc_injected) return;
      window.__lc_injected = true;

      window.__lc = window.__lc || {};
      window.__lc.license = LICENSE;
      window.__lc.integration_name = "manual_channels";
      window.__lc.product_name = "livechat";
      (function (n, t, c) {
        function i(n) {
          return e._h ? e._h.apply(null, n) : e._q.push(n);
        }
        var e = {
          _q: [],
          _h: null,
          _v: "2.0",
          on: function () {
            i(["on", c.call(arguments)]);
          },
          once: function () {
            i(["once", c.call(arguments)]);
          },
          off: function () {
            i(["off", c.call(arguments)]);
          },
          get: function () {
            if (!e._h)
              throw new Error(
                "[LiveChatWidget] You can't use getters before load.",
              );
            return i(["get", c.call(arguments)]);
          },
          call: function () {
            i(["call", c.call(arguments)]);
          },
          init: function () {
            var n = t.createElement("script");
            ((n.async = !0),
              (n.type = "text/javascript"),
              (n.src = "https://cdn.livechatinc.com/tracking.js"),
              t.head.appendChild(n));
          },
        };
        (!n.__lc.asyncInit && e.init(),
          (n.LiveChatWidget = n.LiveChatWidget || e));
      })(window, document, [].slice);
    };

    if (LICENSE) {
      init();
    }

    return () => {
      const iframe = document.querySelector("iframe[src*='livechat']");
      iframe?.remove?.();

      delete window.LiveChatWidget;

      window.__livechat_initialized = false;
      window.__lc_injected = false;
    };
  }, [LICENSE]);

  return <></>;
}
