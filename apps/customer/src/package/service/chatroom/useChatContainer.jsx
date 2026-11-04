import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CHAT_SDK_CSS,
  CONTAINER_HIDDEN_STYLE,
  CONTAINER_ID,
  CONTAINER_VISIBLE_STYLE,
  GLOBAL_CONTAINER_ID,
  GLOBAL_CONTAINER_STYLE,
  INNER_CONTAINER_STYLE,
  LIVE_CHAT_ROUTE,
  PAGE_SELECTOR,
} from "./config";
import { usePathname } from "@my-common-tool/tool/navigate";

export default function useChatContainer({ isReady = false }) {
  const [isContainerExist, setIsContainerExist] = useState(false);
  const globalContainerRef = useRef(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  //? ========================================================================
  const computeAndApplyPosition = useCallback((container) => {
    if (!container) return;
    const pageContent = document.querySelector(PAGE_SELECTOR);
    if (!pageContent) return;
    const style = getComputedStyle(pageContent);
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    container.style.height = `calc(100dvh - ${paddingTop + paddingBottom}px)`;
    container.style.top = `${paddingTop}px`;
  }, []);
  //? ========================================================================
  const getContainer = useCallback(() => {
    return (
      globalContainerRef.current || document.getElementById(GLOBAL_CONTAINER_ID)
    );
  }, []);

  const showContainer = useCallback(() => {
    const el = getContainer();

    if (!el) {
      return;
    }

    // console.log("show , el.style.visibility", el?.style?.visibility);

    computeAndApplyPosition(el);
    Object.assign(el.style, CONTAINER_VISIBLE_STYLE);
  }, [computeAndApplyPosition, getContainer]);

  const hideContainer = useCallback(() => {
    const el = getContainer();

    // console.log("hide , el.style.visibility", el?.style?.visibility);

    if (!el) {
      return;
    }

    Object.assign(el.style, CONTAINER_HIDDEN_STYLE);
  }, [getContainer]);
  //? ========================================================================
  //? check path , is live chat , show
  useEffect(() => {
    if (!isReady) return;

    if (pathname.startsWith(LIVE_CHAT_ROUTE)) {
      showContainer();
    } else {
      hideContainer();
    }
  }, [pathname, isReady, showContainer, hideContainer]);
  //? ========================================================================
  //? listen resize event , and change chatroom container width height
  useEffect(() => {
    const onResize = () => {
      if (pathnameRef.current.startsWith(LIVE_CHAT_ROUTE)) {
        computeAndApplyPosition(globalContainerRef.current);
      }
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);
  //? ========================================================================
  //? create container
  useEffect(() => {
    if (!isReady) return;

    const existing = document.getElementById(GLOBAL_CONTAINER_ID);
    if (existing) {
      globalContainerRef.current = existing;
      setIsContainerExist(true);
      return;
    }

    window.process ??= {};
    window.process.env ??= {};
    window.process.env.NODE_ENV ??= "production";

    if (!document.querySelector(`link[href="${CHAT_SDK_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CHAT_SDK_CSS;
      document.head.appendChild(link);
    }

    const globalContainer = document.createElement("div");
    globalContainer.id = GLOBAL_CONTAINER_ID;
    globalContainer.style.cssText = GLOBAL_CONTAINER_STYLE;

    const inner = document.createElement("div");
    inner.id = CONTAINER_ID;
    inner.style.cssText = INNER_CONTAINER_STYLE;
    globalContainer.appendChild(inner);

    document.body.appendChild(globalContainer);
    globalContainerRef.current = globalContainer;
    setIsContainerExist(true);

    // intentionally keep global container alive
  }, [isReady]);
  //? ========================================================================

  return {
    isContainerExist,
    showContainer,
    hideContainer,
  };
}
