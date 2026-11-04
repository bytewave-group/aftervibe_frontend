import React, { useState, useEffect, useRef } from "react";
import { show_toast } from "../toast";

export default function useAntiInspect(props) {
  const interval = useRef(null);

  useEffect(() => {
    //? SKIP Anti Inspect when localhost
    const hostname = location.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      ["3000", "3001", "3002", "5173", "5174", "5175", "5176", "5177"].includes(
        String(location.port),
      )
    ) {
      console.log(
        "%c[Anti-DevTools] Local, Skip Anti DevTool",
        "color:#0a0;font-size:13px",
      );
      return;
    }

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          ["I", "J", "C", "U", "F"].includes(String(e.key).toLowerCase())) ||
        (e.metaKey &&
          e.altKey &&
          ["I", "C", "U", "J"].includes(String(e.key).toLowerCase())) ||
        (e.shiftKey &&
          e.altKey &&
          e.metaKey &&
          ["T"].includes(String(e.key).toLowerCase())) ||
        (e.shiftKey && e.metaKey && ["C"].includes(String(e.key).toLowerCase()))
      ) {
        e.preventDefault();
        show_toast("DevTools open detected");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    function detectDevTools() {
      const start = performance.now();
      debugger;
      const end = performance.now();
    }

    interval.current = setInterval(() => {
      detectDevTools();
    }, 50);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      if (interval.current) clearInterval(interval.current);
    };
  }, []);
}
