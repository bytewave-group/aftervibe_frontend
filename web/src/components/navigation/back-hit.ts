import type { CSSProperties } from "react";

/**
 * 48×48 back-button hit area. Applied as inline styles because the
 * `.back-hit` rule in globals.css can lag behind a stale Turbopack CSS
 * chunk (measured: class present, computed size still 14×24).
 *
 * Negative margin (BackLink) / shifted top-left (covering button) keeps
 * the 14×24 chevron where it sat in the 32px header row with px-6.
 */
export const BACK_HIT_BOX: CSSProperties = {
  display: "flex",
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  pointerEvents: "auto",
};

export const BACK_HIT_LINK_STYLE: CSSProperties = {
  ...BACK_HIT_BOX,
  position: "relative",
  zIndex: 30,
  margin: "-8px -17px",
};

/** Overlay chevron shown while a transition is in flight. */
export const BACK_HIT_COVER_STYLE: CSSProperties = {
  ...BACK_HIT_BOX,
  position: "absolute",
  zIndex: 40,
  top: "calc(max(16px, env(safe-area-inset-top)) - 8px)",
  left: 7,
};
