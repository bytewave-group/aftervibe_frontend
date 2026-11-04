import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import FireworkState from "./FireworkState";
import { FIREWORK_NORMAL_BG_CONFIG } from "./constant";
import FireworkManager from "./FireworkManager";

export default function FireworkBackgroundManager({
  show,
  displayMode = "fixed",
  hasBackground = true,
}) {
  const fireworkState = useRecoilValue(FireworkState);
  const { show: showState } = fireworkState;

  const isControlled = show !== undefined;

  const display = isControlled ? Boolean(show) : Boolean(showState);

  return !!display ? (
    <FireworkManager
      config={FIREWORK_NORMAL_BG_CONFIG}
      style={{
        background: hasBackground ? "#00000066" : "transparent",
      }}
      displayMode={displayMode}
    />
  ) : null;
}
