import React, { useEffect, useMemo, useRef } from "react";

import {
  getLanguage,
  getLastImageShown,
  setLastImageShown,
} from "@my-common-tool/tool/preferences";

import GlobalState from "../../../atoms/GlobalState";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { openPopup } from "@my-common-tool/tool/popup-manager";
import ImagePopUp from "./ImagePopUp";
import { isEqual } from "lodash";
import DialogContent from "./DialogContent";
import { getDefaultLanguage } from "@my-common-tool/tool/i18n-init";

const TESTING_LOCAL_IMG = false;

//? swiper || normal
const POPUP__DISPLAY_MODE = "normal";
const IMG_MAX_WITDH = 500;

export default function useStartupPagePopup() {
  const { t, i18n } = useTranslation();

  const global = useRecoilValue(GlobalState);

  const cacheListRef = useRef([]);

  const popupList = useMemo(() => {
    const source = global?.popup_settings;

    const globalList = ["first_layer", "second_layer"]
      .map((i) => source?.[i])
      .filter((i) => Boolean(i) && Array.isArray(i) && i?.length > 0);

    const list = Array.isArray(globalList) ? globalList : [];

    if (isEqual(cacheListRef.current, list)) {
      return cacheListRef.current;
    }

    cacheListRef.current = list;
    return list;
  }, [global?.popup_settings]);

  useEffect(() => {
    const timeArrayToMs = ([days, hours, minutes]) => {
      return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60) * 1000;
    };

    const checkIsOverTimeThreshold = async () => {
      const last = await getLastImageShown();

      const now = Date.now();

      const duration = [0, 0, 0]; //day,hour,minutes

      const threshold = timeArrayToMs(duration);
      const shouldShow = !last || now - Number(last) > threshold;

      return { shouldShow, now };
    };

    const checkImagePopup = async () => {
      const { shouldShow, now } = await checkIsOverTimeThreshold();

      if (shouldShow) {
        if (popupList?.length > 0) {
          await setLastImageShown(now);
          const currentLanguage = await getLanguage();
          const defaultLang = await getDefaultLanguage();

          for (const layer of popupList ?? []) {
            const allImageType =
              Array.isArray(layer) &&
              layer.every((i) => String(i?.type) === "1");
            const allTextType =
              Array.isArray(layer) &&
              layer.every((i) => String(i?.type) === "2");

            if (allImageType) {
              const resOpenPopup = await openPopup({
                title: "",
                component: ImagePopUp,
                data: {
                  list: layer.map((i) => ({
                    ...i,
                  })),
                  mode: POPUP__DISPLAY_MODE,
                  TESTING_LOCAL_IMG,
                  IMG_MAX_WITDH,
                },
                className: "bg-transparent",
                animate: false,
                backdrop: false,
                full_screen: true,
              });
            } else {
              const texts = layer
                .map((item) => {
                  const body = item?.body;
                  return (
                    (body && (body?.[currentLanguage] ?? body?.en ?? body)) ??
                    ""
                  );
                })
                .map((t) => (typeof t === "string" ? t.trim() : ""))
                .filter((t) => t.length > 0);

              if (texts.length > 0) {
                const combinedContent = texts.join("\n\n");
                const resConfirm = await openPopup({
                  title: "",
                  component: DialogContent,
                  data: {
                    content: combinedContent,
                    containerClass: "promotion-dialog-wrapper rounded-2",
                  },
                  full_screen: true,
                  animate: false,
                  className: "bg-transparent",
                });

                if (resConfirm?.status) {
                }
              }
            }
          }
        }
      }
    };

    const start = async (params) => {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 400);
      });
      if (location?.pathname === "/") {
        checkImagePopup();
      }
    };

    if (window?.["__PRERENDER_INJECTED"]?.["__IS_PRERENDER"]) {
      return;
    }

    start();
  }, [popupList]);

  return null;
}
