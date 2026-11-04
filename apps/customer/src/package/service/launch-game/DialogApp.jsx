import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  Fragment,
  useCallback,
} from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { Clipboard } from "@capacitor/clipboard";
import { show_toast } from "@my-common-tool/tool/toast";
import appConfig from "../../../../appconfig.json";
import { FaRegCopy } from "react-icons/fa";
import { Button } from "framework7-react";

import GlobalState from "../../../atoms/GlobalState";
import { formatAmount } from "@my-common-tool/tool/common";
import { openNewTabCrossPlatform } from "@my-common-tool/tool/cross-platform-navigate";
import { TiVendorAndroid } from "react-icons/ti";
import { IoLogoApple } from "react-icons/io5";

const IS_TESTING_PLATFORM_MOBILE = false;
const TESTING_PLATFORM = "android";

const formatTurnoverDisplay = (amount, currency) => {
  const num = Number(amount);
  if (isNaN(num)) return "--";
  return `${num > 0 ? "+" : num < 0 ? "-" : ""}${currency} ${Math.abs(num)}`;
};

function DialogApp({
  type,
  productDetail,
  accountDetail,
  gameStatistics,
  onf7DialogConfirm,
}) {
  const { t } = useTranslation();
  const global = useRecoilValue(GlobalState);
  const currency = global?.settings?.currency;

  //* ======================================================== */
  const detectMobileOS = () => {
    if (IS_TESTING_PLATFORM_MOBILE) {
      return TESTING_PLATFORM;
    }
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 1;

    const platform = navigator.platform;
    const isDesktop = ["Win32", "MacIntel", "Linux x86_64"].includes(platform);

    if (!hasTouch || isDesktop) return "web";

    if (/android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";

    return "web";
  };

  const { platform, platformDeeplink } = useMemo(() => {
    const platform = detectMobileOS();

    const deeplink_android = accountDetail?.deeplink_android;
    const deeplink_ios = accountDetail?.deeplink_ios;
    const deeplink_normal = accountDetail?.url;

    const platformDeeplink =
      platform === "android"
        ? deeplink_android
        : platform === "ios"
          ? deeplink_ios
          : "PC_WEBSITE"; //pc website not deeplink

    const deeplink =
      platformDeeplink === "PC_WEBSITE"
        ? ""
        : platformDeeplink || deeplink_normal;

    return { platform, platformDeeplink: deeplink };
  }, [accountDetail]);

  const handleDownloadApp = useCallback(
    (url) => {
      openNewTabCrossPlatform(url, "_blank");
    },
    [openNewTabCrossPlatform],
  );

  const handleDeeplinkOpen = () => {
    const res = openNewTabCrossPlatform(platformDeeplink, "_blank");
    if (res === "opening_in_app_broswer") {
      onf7DialogConfirm(true);
    }
  };
  //* ======================================================== */

  return (
    <div className="dialog-app-theme text-theme-text">
      {!appConfig?.gameLaunch?.hideProductImg &&
        !!productDetail?.product_image && (
          <div className="col-6 mx-auto dialog-app-theme__image-wrap">
            <img
              className="w-100 rounded-2"
              src={productDetail?.product_image}
              alt={productDetail?.name || "game"}
            />
          </div>
        )}
      <div className="w-100 text-center dialog-app-theme__title-wrap mb-12">
        <span className="text24 text-md36 fwNoweight-bold text-game-launch-dialog-title dialog-app-theme__title">
          {productDetail?.name || "-"}
        </span>
      </div>

      <div className="text-center dialog-app-theme__balance mb-12">
        <span>
          {t("Balance")}: {global?.settings?.currency}{" "}
          {formatAmount(accountDetail?.balance)}
        </span>
      </div>

      {/* Game Data Box for Regular Games */}
      {!appConfig?.gameLaunch?.hideGameStatistics && (
        <div className="dialog-app-theme__stats rounded-3 p-3 px-2">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="text14 text-md18">{t("Rebate")}: </span>
            <span className="text14 text-md18 fw-bold">
              {isNaN(parseFloat(gameStatistics?.rebate))
                ? "--"
                : `${gameStatistics?.rebate * 100}%`}
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="text14 text-md18">{t("Yesterday Turnover")}:</span>
            <span className="text14 text-md18 fw-bold">
              {formatTurnoverDisplay(gameStatistics?.yesterday_stake, currency)}
            </span>
          </div>

          <div className="d-flex align-items-center justify-content-between">
            <span className="text14 text-md18">{t("Today Turnover")}: </span>
            <span className="text14 text-md18 fw-bold">
              {formatTurnoverDisplay(gameStatistics?.today_stake, currency)}
            </span>
          </div>
        </div>
      )}

      <AccountDetail accountDetail={accountDetail} />

      {type === "deeplink" && (
        <div className="text14 my-2 text-center">
          {t("This game is only allowed to play in app")}
        </div>
      )}

      <div className="d-flex-center dialog-app-theme__download-wrap">
        <div>
          <div className="fw-bold text-center mb-2 dialog-app-theme__download-title">
            {t("Download here")}
          </div>

          <div className="d-flex justify-content-center gap-3 mb-3">
            {accountDetail?.android_url &&
              (appConfig?.gameLaunch?.iconOverrides?.download_android ===
              "image" ? (
                <img
                  onClick={() => handleDownloadApp(accountDetail?.android_url)}
                  className="pointer icon32 dialog-app-theme__download-icon"
                  src={"/images/android-download.png"}
                />
              ) : (
                <TiVendorAndroid
                  onClick={() => handleDownloadApp(accountDetail?.android_url)}
                  className="pointer icon36 icon-dialog-app-android-download"
                />
              ))}

            {accountDetail?.ios_url &&
              (appConfig?.gameLaunch?.iconOverrides?.download_ios ===
              "image" ? (
                <img
                  onClick={() => handleDownloadApp(accountDetail?.ios_url)}
                  className="pointer icon32 dialog-app-theme__download-icon"
                  src={"/images/ios-download.png"}
                />
              ) : (
                <IoLogoApple
                  onClick={() => handleDownloadApp(accountDetail?.ios_url)}
                  className="pointer icon36 icon-dialog-app-ios-download"
                />
              ))}
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 dialog-app-theme__actions">
        <Button
          onClick={() => onf7DialogConfirm(false, { data: null })}
          className="border-2 text-16 text-md20 fwNoweight-bold py-2 py-md-12 rounded-10 w-100 dialog-app-theme__btn dialog-app-theme__btn--cancel"
        >
          {t("Cancel")}
        </Button>

        {/* --- Start Game Button --- */}
        {(type === "deeplink" ||
          (["app", "deeplink"].includes(type) && platformDeeplink)) && (
          <Button
            onClick={handleDeeplinkOpen}
            className="border-2 text-16 text-md20 fwNoweight-bold py-2 py-md-12 rounded-10 w-100 dialog-app-theme__btn dialog-app-theme__btn--primary"
          >
            {t("Start Game")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default DialogApp;

const AccountDetail = ({ accountDetail }) => {
  const { t } = useTranslation();
  const copyToClipboard = async (text) => {
    try {
      await Clipboard.writeText(text);
      show_toast(t("Copy successful"));
    } catch (error) {
      show_toast(t("Error, can't copy text"));
    }
  };

  const fields = [
    {
      label: t("Account"),
      value: accountDetail?.account,
      copy: true,
    },
    {
      label: t("Password"),
      value: accountDetail?.password,
      copy: true,
    },
    // {
    //   label: t("Balance"),
    //   value: `${global?.settings?.currency} ${formatAmount(accountDetail?.balance)}`,
    //   copy: false,
    // },
  ];

  if (appConfig?.gameLaunch?.accountDetailDisplayMode === "pattern2") {
    return (
      <div className="dialog-app-theme__credentials">
        {fields.map((item, idx) => (
          <div className="dialog-app-theme__credential-row" key={idx}>
            <div className="dialog-app-theme__credential-text">
              <span className="dialog-app-theme__label">{item.label}</span>
              <span className="dialog-app-theme__colon">:</span>
              <span className="dialog-app-theme__value">{item.value}</span>
            </div>
            {item.copy && (
              <Button
                onClick={() => copyToClipboard(item.value)}
                className="copy-btn iconh32 dialog-app-theme__copy-btn"
              >
                {/* <FaRegCopy className="text16 text-md20" /> */}
                <img
                  src="/images/copy2.png"
                  alt="Copy"
                  draggable={false}
                  style={{ width: "20px", height: "20px" }}
                />
              </Button>
            )}
            {!item.copy && <div />}
          </div>
        ))}
      </div>
    );
  } else {
    return (
      <div className="dialog-app-theme__credentials">
        <div
          style={{
            gridTemplateColumns: "auto auto 1fr auto",
          }}
          className="dialog-app-theme__credential-text d-grid align-items-center mb-2"
        >
          {fields.map((item, idx) => (
            <Fragment key={idx}>
              <span className="dialog-app-theme__label">{item.label}</span>
              <span className="dialog-app-theme__colon px-1">:</span>
              <span className="dialog-app-theme__value">{item.value}</span>
              {item.copy ? (
                <Button
                  onClick={() => copyToClipboard(item.value)}
                  className="unset-btn-text-color icon-dialog-app-copy copy-btn iconh32 dialog-app-theme__copy-btn minw-fit px-2"
                >
                  <FaRegCopy className="text16 text-md20 " />
                  {/* <img
                  src="/images/copy2.png"
                  alt="Copy"
                  draggable={false}
                  style={{ width: "20px", height: "20px" }}
                /> */}
                </Button>
              ) : (
                <div />
              )}
            </Fragment>
          ))}{" "}
        </div>
      </div>
    );
  }
};
