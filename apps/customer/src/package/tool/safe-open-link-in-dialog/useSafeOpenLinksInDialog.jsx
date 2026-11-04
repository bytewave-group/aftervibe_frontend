import { useState, useEffect, useRef } from "react";
import { openNewTabCrossPlatform } from "../cross-platform-navigate";

export function preProcessHtml(html, { returnDoc = false } = {}) {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const links = doc.querySelectorAll("a");
  links.forEach((link) => {
    let href = link.getAttribute("href");
    if (!href) return;

    if (/^javascript:/i.test(href)) return;

    if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
      if (href.startsWith("/")) {
        href = window.location.origin + href;
      } else {
        href = "https://" + href;
      }
    }

    link.setAttribute("data-href", href);
    link.removeAttribute("href");
    link.removeAttribute("target");
  });

  if (returnDoc) {
    return doc;
  }

  return doc.body.innerHTML;
}

export function bindSafeOpenLinks(
  root,
  {
    onOpen = (href) =>
      openNewTabCrossPlatform(href, "_blank", "noopener,noreferrer"),
    capture = true,
  } = {},
) {
  if (!root) return () => {};

  const handleClick = (e) => {
    const link = e.target.closest?.("a[data-href]");
    if (!link) return;

    e.preventDefault();

    const href = link.dataset.href;
    if (!href) return;

    onOpen(href, link, e);
  };

  root.addEventListener("click", handleClick, capture);

  return () => {
    root.removeEventListener("click", handleClick, capture);
  };
}

export default function useSafeOpenLinksInDialog({ containerRef, onOpen }) {
  useEffect(() => {
    const unbind = bindSafeOpenLinks(containerRef.current, { onOpen });

    return () => {
      if (typeof unbind === "function") {
        unbind();
      }
    };
  }, [containerRef, onOpen]);
}
