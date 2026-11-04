import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { validateLanguage } from "@my-common-tool/tool/i18n-init";
import promotionPopupCSS from "./promotion-popup.css?url";
import { Button } from "framework7-react";
import {
  bindSafeOpenLinks,
  preProcessHtml,
} from "@my-common-tool/tool/safe-open-link-in-dialog";
import GlobalState from "../../../atoms/GlobalState";
import PreLoader from "../../../components/common/pre-loader";
import { IoCloseSharp } from "react-icons/io5";

export default function DialogContent({
  data: item,
  type,
  onSubmit,
  containerId = "promotion-popup",
  hideButton = false,
  transition = true,

  insertToOuterContainer = false,
}) {
  const global = useRecoilValue(GlobalState);
  const { t, i18n } = useTranslation();
  const currentLanguage = validateLanguage(i18n.language);
  const customCss = global?.custom_css;
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(0);

  useEffect(() => {
    if (global?.theme !== "blank" && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      let headerContent = null;
      let promotionPopupDiv = null;

      if (item?.content) {
        try {
          const parser = new DOMParser();
          const removedHrefDoc = preProcessHtml(item?.content, {
            returnDoc: true,
          });

          const doc = removedHrefDoc;

          //? Create the div using containerId
          promotionPopupDiv = doc.createElement("div");
          promotionPopupDiv.id = containerId;

          //? =================================== */
          //? Get the promotion TITLE
          if (item?.title) {
            const titleDiv = doc.createElement("div");
            titleDiv.textContent = item.title;
            titleDiv.id = "title";
            promotionPopupDiv.appendChild(titleDiv);
          }

          //? =================================== */
          //? Get the promotion TOP Image
          const imageEl = item?.image ? doc.createElement("img") : null;
          if (imageEl) {
            imageEl.src = item.image;
            imageEl.id = "top-image";
          }

          if (imageEl) {
            promotionPopupDiv.appendChild(imageEl);
          }

          //? =================================== */
          //? Get the promotion body content
          headerContent = doc.head;
          const bodyContent = doc.body;

          //? Check for a single outer div with a background
          const firstDiv = doc.querySelector("body > div");
          const hasOnlyOneDiv = doc.querySelectorAll("body > div").length === 1;

          // const spacerDiv = doc.createElement("div");
          // spacerDiv.id = "promotion-popup-bottom-spacer";

          if (firstDiv && hasOnlyOneDiv && !insertToOuterContainer) {
            //? If there's only one div append spacerDiv inside it
            // firstDiv.appendChild(spacerDiv);
            promotionPopupDiv.appendChild(firstDiv);
          } else {
            //? Otherwise, append spacerDiv inside container and wrap original content
            while (bodyContent.firstChild) {
              promotionPopupDiv.appendChild(bodyContent.firstChild);
            }
            //   promotionPopupDiv.appendChild(spacerDiv);
          }
        } catch (error) {
          console.error("Failed to parse item.content:", error);
          promotionPopupDiv = iframeDoc.createElement("div");
          promotionPopupDiv.id = containerId;
          headerContent = iframeDoc.createElement("head");
        }
      }
      //? =================================== */
      //? wirte iframeDoc content
      iframeDoc.open();
      iframeDoc.write(
        `<html>
            <head></head>
            <body id="body-main" style="overflow:hidden; margin:0; padding:0;box-sizing:border-box;">
            
            </body>
          </html>`,
      );
      iframeDoc.close();
      //? =================================== */
      //? Transfer promotion <head> content to iframeDoc
      if (headerContent) {
        const importedNode = iframeDoc.importNode(headerContent, true);
        iframeDoc.head.appendChild(importedNode);
      }
      //? =================================== */
      //? import css file to iframeDoc

      //* global custom Css
      if (customCss) {
        const link = iframeDoc.createElement("link");
        link.rel = "stylesheet";
        link.href = customCss;
        link.onerror = () => console.error("Error:Can not load custom css:");
        iframeDoc.head.appendChild(link);
      }

      //* local promotionPopupCSS
      const link2 = iframeDoc.createElement("link");
      link2.rel = "stylesheet";
      link2.href = promotionPopupCSS;

      link2.onerror = () => console.error("Error:Can not load custom css:");
      iframeDoc.head.appendChild(link2);

      //? =================================== */
      //? Transfer nodes to iframeDoc
      if (promotionPopupDiv) {
        const importedPopupDiv = iframeDoc.importNode(promotionPopupDiv, true);
        iframeDoc.body.appendChild(importedPopupDiv);
      }

      const unbind = bindSafeOpenLinks(iframeDoc);

      //* ====================================================================== */
      //* udpate popup height  */

      const getAndSetContentHeight = () => {
        if (iframeDoc.body) {
          const popupContainer = iframeDoc.querySelector(`#${containerId}`);
          const height = popupContainer?.offsetHeight;

          if (height > 0) {
            setIframeHeight(height);
          } else {
            // if height is 0 , try again
            requestAnimationFrame(getAndSetContentHeight);
          }
        }
      };

      const raf = requestAnimationFrame(getAndSetContentHeight);

      const observer = new ResizeObserver((entries) => {
        getAndSetContentHeight();
      });

      if (iframeDoc.body) {
        observer.observe(iframeDoc.body);
      } else {
        console.error("Iframe body not available for ResizeObserver");
      }

      return () => {
        if (typeof unbind === "function") {
          unbind();
        }
        observer.disconnect();
        cancelAnimationFrame(raf);
      };
    }
  }, [global, item?.content]);

  return (
    <>
      <style>
        {`@keyframes popup-show {
  0% {
    transform: translate3d(0, -50px, 0) scale(0.9);
    opacity: 0;
  }

  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
}`}
      </style>
      <div
        onClick={() => {
          onSubmit(false);
        }}
        className={`pointer-auto d-flex-column align-items-center rounded-12 h-100  ${currentLanguage}`}
      >
        {iframeHeight === 0 && <PreLoader />}

        <div
          style={{
            maxWidth: "512px",
          }}
          className="overflow-auto w-100 h-100 px-10 pt-10 pb-4"
        >
          <div
            style={{
              opacity: iframeHeight === 0 ? 0 : 1,
              ...(transition
                ? { animation: "popup-show 0.2s ease-in-out" }
                : {}),
            }}
            className={`position-relative custom-dialog custom-dialog-dialog-bg unset-height minf-fit ${item?.containerClass}`}
          >
            {" "}
            <Button
              style={{ transition: "opacity 0.3s ease" }}
              className={`position-absolute z-2 top-0 end-0 p-1 mt-1 minw-fit`}
              onClick={(e) => {
                onSubmit(false);
              }}
            >
              <IoCloseSharp className="text28" />
            </Button>
            <iframe
              ref={iframeRef}
              style={{
                border: "none",
                height: `${iframeHeight || 0}px`,
              }}
              className="w-100"
              title="Promotion Content"
            />
            {!hideButton && iframeHeight > 0 && (
              <div className="px-3 pb-3 ">
                <div className="d-flex justify-content-center gap-2 h-fit ">
                  <div
                    // id={"promotion-popup-cancel"}
                    onClick={() => {
                      onSubmit(false, null);
                    }}
                    style={{
                      fontWeight:
                        "var(--f7-dialog-button-strong-font-weight,400)",
                    }}
                    className="iconh40 col-7 d-flex-center dialog-button rounded-10 fw-bold"
                  >
                    {t("Close")}
                  </div>{" "}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
