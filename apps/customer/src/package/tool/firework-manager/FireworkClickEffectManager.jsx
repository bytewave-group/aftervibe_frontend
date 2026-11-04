import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FireworkManager from "./FireworkManager";
import { FIREWORK_CLICK_EFFECT_CONFIG } from "./constant";
import { isPlainObject } from "lodash";

/**
 * FireworkClickEffectManager
 *
 * A React manager component that binds global click events to a FireworkManager canvas,
 * translating native window click events into synthetic pointer events to trigger fireworks.
 *
 * It listens for a dynamically generated unique class name from FireworkManager,
 * then attaches a global click handler that dispatches pointer events to the corresponding canvas.
 *
 * It also resolves firework configuration values using a fallback strategy:
 * 1. Primary source: CMS
 * 2. Secondary source: local default configuration (static fallback config)
 *
 * @component
 *
 * @returns {JSX.Element}
 *
 * @description
 * Flow:
 * 1. FireworkManager generates a unique class name via callback
 * 2. This component stores the class name in state
 * 3. A global click listener is registered on window
 * 4. Click events are translated into pointerdown/pointerup events
 *    and dispatched to the target canvas inside FireworkManager
 *
 * @sideEffects
 * - Attaches and removes global window click event listener
 * - Queries DOM using document.querySelector
 * - Dispatches synthetic PointerEvent to canvas
 *
 * @notes
 * !- Requires FireworkManager to render a canvas under:
 * !  #firework-manager.{uniqueClass} canvas
 * !- Will silently fail if canvas is not found
 * !- Designed for runtime DOM-based integration (no ref access available)
 */

export default function FireworkClickEffectManager({
  enable = false,
  config = null,
}) {
  /* ================================================================== */
  //? Trigger a pointer event on the firework canvas to simulate a user click.
  const [specificClass, setSpecificClass] = useState(null);

  const handlerRef = useRef(null);

  useEffect(() => {
    if (!specificClass) return;

    if (handlerRef.current) {
      window.removeEventListener("click", handlerRef.current);
    }

    const triggerClickCanvas = (canvas, eClick) => {
      canvas.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: eClick.clientX,
          clientY: eClick.clientY,
        }),
      );
      setTimeout(() => {
        canvas.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            clientX: eClick.clientX,
            clientY: eClick.clientY,
          }),
        );
      }, 50);
    };

    const handleClick = (eClick) => {
      const elBelow = document.querySelector(
        `#firework-manager.${specificClass} canvas`,
      );

      if (!elBelow) return;

      triggerClickCanvas(elBelow, eClick);
    };

    handlerRef.current = handleClick;

    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("click", handleClick);
      handlerRef.current = null;
    };
  }, [specificClass]);
  /* ================================================================== */
  //? Override default config
  function safeMerge(ori, override) {
    if (!isPlainObject(ori)) ori = {};
    if (!isPlainObject(override)) return { ...ori };

    const output = { ...ori };

    for (const [key, value] of Object.entries(override)) {
      if (value === undefined || value === null || value === "") continue;

      const oriValue = output[key];

      if (isPlainObject(oriValue) && isPlainObject(value)) {
        output[key] = safeMerge(oriValue, value);
      } else {
        output[key] = value;
      }
    }

    return output;
  }

  return enable ? (
    <FireworkManager
      name={"click"}
      config={safeMerge(FIREWORK_CLICK_EFFECT_CONFIG, config)}
      onUniqueClassNameGenerated={(className) => {
        setSpecificClass(className);
      }}
    />
  ) : null;
}
