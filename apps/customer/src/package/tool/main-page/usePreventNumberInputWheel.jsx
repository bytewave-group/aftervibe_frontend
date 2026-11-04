import React, { useState, useEffect, useRef } from "react";

export default function usePreventNumberInputWheel(props) {
  useEffect(() => {
    const handleWheel = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" && target.type === "number") {
        target.blur();
      }
    };

    window.addEventListener("wheel", handleWheel, {
      passive: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("wheel", handleWheel, {
        passive: true,
        capture: true,
      });
    };
  }, []);
}
