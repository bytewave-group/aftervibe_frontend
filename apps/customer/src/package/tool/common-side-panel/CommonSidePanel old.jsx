import React, { useState} from "react";

export default function CommonSidePanel({
  mode = "push" || "overlay",

  triggerContainer = null,
  triggerContainerClassName = "",
  triggerContainerStyle = null,

  children = null,
  childrenClassName = "",
  childrenStyle = null,

  side = "right" || "left",
  vertical = "top" || "bottom",
  verticalTranslateMiddle = true,

  backdrop = true,

  fixedToViewport = true,
}) {
  const [sideOpen, setSideOpen] = useState(false);

  return (
    <>
      {/* backdrops */}
      {backdrop && (
        <div
          style={{ zIndex: "3001" }}
          onClick={() => setSideOpen(false)}
          className={`position-absolute sidemenu-backdrop w-100 h-100 ${
            sideOpen ? "open" : ""
          }`}
        />
      )}

      <div
        style={{
          zIndex: "3001",
          ...(side === "right" ? { right: 0 } : { left: 0 }),
          ...(vertical === "top" ? { top: 0 } : { bottom: 0 }),
        }}
        className={`${
          fixedToViewport ? "position-fixed" : "position-absolute"
        } top-50 ${verticalTranslateMiddle ? "translate-middle-y" : ""}`}
      >
        <div className="d-flex text16 text-md20 text-color-white text-nowrap rounded-start-3">
          {mode === "push" && (
            <div
              style={{ ...triggerContainerStyle }}
              className={`${triggerContainerClassName} triggerContainer`}
              onClick={() => setSideOpen(!sideOpen)}
            >
              {triggerContainer}
            </div>
          )}
          <div
            className={`d-grid ${childrenClassName}`}
            style={{
              ...childrenStyle,
              display: "grid",
              gridTemplateColumns: sideOpen ? "1fr" : "0fr",
              transition: "grid-template-columns 0.3s ease",
            }}
          >
            <div className="overflow-hidden">{children}</div>
          </div>
          {mode === "overlay" && (
            <div
              style={{ ...triggerContainerStyle }}
              className={`${triggerContainerClassName} triggerContainer`}
              onClick={() => setSideOpen(!sideOpen)}
            >
              {triggerContainer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
