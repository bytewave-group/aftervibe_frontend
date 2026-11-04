import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "framework7-react";
import { useMediaQuery } from "react-responsive";
import { Swiper, SwiperSlide } from "swiper/react";
import { openNewTabCrossPlatform } from "@my-common-tool/tool/cross-platform-navigate";
import { open_login } from "@my-common-tool/tool/login-register";
import { navigate } from "@my-common-tool/tool/navigate";

import { useTokenAndUser } from "../../../components/action/user-data";
import appConfig from "./../../../../appconfig.json";
import { show_toast } from "@my-common-tool/tool/toast";
import {
  getDefaultLanguage,
  validateLanguage,
} from "@my-common-tool/tool/i18n-init";
import { IoCloseOutline } from "react-icons/io5";
import { TfiClose } from "react-icons/tfi";

function ImagePopUp({ data, onSubmit }) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const { user, token } = useTokenAndUser();
  /* ================================================= */
  const [popupState, setPopupState] = useState("open");

  /* ================================================= */
  const { list, mode, TESTING_LOCAL_IMG, IMG_MAX_WITDH } = useMemo(() => {
    return {
      list: Array.isArray(data?.list) ? data?.list : [],
      mode: data?.mode || "normal",
      TESTING_LOCAL_IMG: data?.TESTING_LOCAL_IMG,
      IMG_MAX_WITDH: data?.IMG_MAX_WITDH,
    };
  }, [data]);

  /* ================================================= */
  const forceOpenNewTabPath = ["/launch"];
  const needLoginPath = ["/deposit", "/withdraw", "/launch"];

  const handleNavigate = (pathOrLink) => {
    // pathOrLink = "https://www.google.com";
    if (!pathOrLink) return;

    const url = new URL(pathOrLink, window.location.origin);

    const pathname = url.pathname;
    const search = url.search;
    const origin = url.origin;
    const fullLink = url.href;

    const isForceNewTab = forceOpenNewTabPath.some((p) =>
      p === "/" ? pathname === "/" : pathname.startsWith(p),
    );

    const isNeedLogin = needLoginPath?.some((p) =>
      p === "/" ? pathname === "/" : pathname.startsWith(p),
    );

    if (isNeedLogin && (!user || !token)) {
      if (appConfig.is_full_page_login) {
        show_toast("Please login to continue");
        return;
      } else {
        open_login();
        closePopup();
      }
      return;
    }

    if (isForceNewTab) {
      openNewTabCrossPlatform(fullLink);
      return;
    }

    const isExternal =
      window.location.hostname !== "localhost" &&
      origin !== window.location.origin;

    if (isExternal) {
      openNewTabCrossPlatform(fullLink);
    } else {
      navigate(`${pathname}${search}`);
      closePopup();
    }
  };

  /* ================================================= */
  const swiperRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  /* ================================================= */
  const handleNext = () => {
    if (mode === "normal") {
      startCloseAnimation();
    } else if (mode === "swiper") {
      const isLastSlide = currentSlide >= list.length - 1;
      if (isLastSlide) {
        startCloseAnimation();
      } else {
        swiperRef.current?.slideNext();
      }
    }
  };

  const startCloseAnimation = () => {
    setPopupState("close");
  };

  const closePopup = () => {
    onSubmit(false);
  };

  // const [pagePadding, setPagePadding] = useState({
  //   top: 0,
  //   bottom: 0,
  // });

  // useEffect(() => {
  //   const computeAndApplyPosition = (container) => {
  //     const pageContent = document.querySelector(
  //       "#view-home .page-current .page-content",
  //     );

  //     if (!pageContent) return;

  //     const computed = getComputedStyle(pageContent);

  //     setPagePadding({
  //       top: parseFloat(computed.paddingTop) || 0,
  //       bottom: parseFloat(computed.paddingBottom) || 0,
  //     });
  //   };

  //   computeAndApplyPosition();
  // }, []);

  return (
    <>
      <style>
        {`  .custom-img-popup-backdrop {
    z-index: 5999;
    background-color: rgba(0, 0, 0, var(--opacity, 0.6));
    transition-property: transform, opacity;
    transition-duration: var(--f7-panel-transition-duration);
  }`}
      </style>
      {/* ============================ */}

      <div
        id="show_image"
        onClick={handleNext}
        className={`custom-img-popup-backdrop w-100 h-100 d-flex-center ${
          popupState === "open"
            ? "open fade-in"
            : popupState === "close"
              ? "fade-out-and-stop"
              : ""
        }`}
        style={{
          paddingTop: "var(--f7-safe-area-top,0px)",
          // paddingBottom: "var(--f7-safe-area-bottom,0px)",
        }}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && popupState === "close") {
            closePopup();
          }
        }}
      >
        <div className="position-relative mx-auto w-100 h-100 overflow-hidden">
          {/* 
            //? close icon 
            */}
          {mode === "swiper" && (
            <Button
              style={{ transition: "opacity 0.3s ease" }}
              className={`position-absolute z-2 top-0 end-0 mt-32 me-2 p-1 minw-fit`}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <IoCloseOutline className="text36" />
            </Button>
          )}

          <div
            style={{
              paddingTop:
                mode === "normal" ? "20px" : isMobile ? "70px" : "70px",
            }}
            className={`position-relative z-1 d-flex-column ${
              mode === "normal" && list?.length === 1
                ? "justify-content-center"
                : ""
            } overflow-auto h-100 w-100`}
          >
            {/* 
            //? content section
            */}
            <div
              style={{
                width: `min(${
                  mode === "swiper" ? "95vw" : "75%"
                },${IMG_MAX_WITDH}px)`,
                minHeight: mode === "swiper" ? "100%" : "",
              }}
              className={`mx-auto pb-3 ${
                mode === "swiper" ? "d-flex-center" : ""
              }`}
            >
              <div className="w-100">
                {!Array.isArray(list) ? null : mode === "normal" ? (
                  <>
                    <Button
                      style={{ transition: "opacity 0.3s ease" }}
                      className={`position-absolute z-2 top-0 end-0 m-2 p-2 minw-fit`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                    >
                      <TfiClose className="text20" />
                    </Button>

                    <div id="content-section" className="pt-5">
                      {list?.map((imgItem, imgIdx) => (
                        <div
                          id={`img-${imgIdx}`}
                          key={imgIdx}
                          className="position-relative mb-3"
                        >
                          <ImgItem
                            imgItem={imgItem}
                            onClick={() => handleNavigate(imgItem?.url)}
                            handleNext={handleNext}
                            TESTING_LOCAL_IMG={TESTING_LOCAL_IMG}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : mode === "swiper" ? (
                  <Swiper
                    spaceBetween={20}
                    onSwiper={(swiper) => {
                      swiperRef.current = swiper;
                    }}
                    onSlideChange={(swiper) => {
                      setCurrentSlide(swiper.activeIndex);
                    }}
                  >
                    {list?.map((imgItem, imgIdx) => (
                      <SwiperSlide
                        key={imgIdx}
                        className="d-flex-center h-auto"
                      >
                        <ImgItem
                          imgItem={imgItem}
                          onClick={() => handleNavigate(imgItem?.url_path)}
                          handleNext={handleNext}
                          showCountdown={currentSlide === imgIdx}
                          TESTING_LOCAL_IMG={TESTING_LOCAL_IMG}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ImagePopUp;

const ImgItem = ({
  TESTING_LOCAL_IMG = false,
  imgItem,
  onClick,
  handleNext,
}) => {
  const { i18n } = useTranslation();
  const currentLanguage = validateLanguage(i18n.language);
  const defaultLanguage = getDefaultLanguage();

  const imgSource = useMemo(() => {
    if (TESTING_LOCAL_IMG) {
      return `/assets/image/testing_home_popup/${currentLanguage}.png`;
    }

    return typeof imgItem?.image === "object" && !!imgItem?.image
      ? imgItem?.image?.[currentLanguage] ||
          imgItem?.image?.[defaultLanguage] ||
          ""
      : "";
  }, [imgItem, TESTING_LOCAL_IMG]);

  return (
    <>
      <img
        dataLink={imgItem?.url}
        onClick={onClick}
        style={{
          userSelect: "none",
        }}
        draggable="false"
        className="w-100 pointer object-fit-contain rounded-3"
        src={imgSource}
      />
      {/*  
                          //! countdown , keep 
                        */}
      {imgItem?.countdownMinutes && (
        <CountdownSection
          minutes={imgItem?.countdownMinutes}
          onFinish={handleNext}
        />
      )}
    </>
  );
};

const CountdownSection = ({ minutes = 3, onFinish, showCountdown = false }) => {
  /* ================================================= */
  /**
   * Countdown Timer Function (3-minute countdown)
   * - Starts a countdown of 3 minutes upon component mount
   * - Updates timeLeft state every second
   * - Format: HH:MM:SS
   * - When countdown reaches zero:
   *   - Set all time values to "00"
   *   - Automatically trigger close_popup_show_image()
   *
   */
  //! 🚫 Keep this countdown logic! (used for promotion popup timeout)

  const [timeLeft, setTimeLeft] = useState({
    hours: null,
    minutes: null,
    seconds: null,
  });

  const getDeadline = () => {
    const deadline = new Date();
    deadline.setTime(deadline.getTime() + minutes * 60 * 1000);
    return deadline;
  };

  const timerRef = useRef(null);

  useEffect(() => {
    if (!showCountdown || !minutes) {
      return null;
    }
    const deadline = getDeadline();

    timerRef.current = setInterval(() => {
      const now = new Date();
      const timeDiff = deadline - now;

      if (timeDiff <= 0) {
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
        clearInterval(timerRef.current);
        onFinish();
      } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        setTimeLeft({
          hours: String(hours).padStart(2, "0"),
          minutes: String(minutes).padStart(2, "0"),
          seconds: String(seconds).padStart(2, "0"),
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showCountdown, minutes]);
  /* ================================================= */
  return (
    <div
      style={{
        bottom: "30%",
      }}
      className="position-absolute start-50 translate-middle-x d-flex gap-md-3 gap-2 text-md28 text20 text-color-white"
    >
      <div className="countdown-timer p-1">
        <span>{timeLeft.hours}</span>
      </div>
      <div className="countdown-timer p-1">
        <span>{timeLeft.minutes}</span>
      </div>
      <div className="countdown-timer p-1">
        <span>{timeLeft.seconds}</span>
      </div>
    </div>
  );
};
