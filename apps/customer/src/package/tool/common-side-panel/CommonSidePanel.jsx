import React, { Fragment, useState } from "react";
/**
 * @typedef {Object} SideWidgetItem
 * @property {'push'|'overlay'} [mode='push'] - Panel mode, either 'push' or 'overlay'
 * @property {React.ReactNode} [trigger=null] - JSX element that triggers the panel
 * @property {string} [triggerClassName=''] - CSS class for the trigger element
 * @property {React.CSSProperties} [triggerStyle={}] - Inline style for the trigger element
 * @property {React.ReactNode} [children=null] - JSX content of the panel
 * @property {string} [childrenClassName=''] - CSS class for the panel content
 * @property {React.CSSProperties} [childrenStyle={}] - Inline style for the panel content
 * @property {Function} [openSidePanel] - Function to open this panel
 * @property {Function} [closeSidePanel] - Function to close this panel
 * @property {boolean} [sideOpen=false] - Whether the panel is currently open
 * @property {'default'|'reverse'} [stackDirection='default'] - Panel stacking order: 'default' or 'reverse'
 * @property {boolean} [backdrop=false] - Show a backdrop behind the panel
 * @property {string|number} [id] - Unique identifier for this panel
 */

/**
 * SideWidgetAsList - Stackable side floating panel component
 *
 * @param {Object} props
 * @param {number} [props.zIndex=3001] - The z-index of the panel
 * @param {'left'|'right'} [props.side='right'] - Which side the panel appears on
 * @param {string} [props.verticalOffset='50%'] - Vertical offset from top or bottom
 * @param {'top'|'bottom'} [props.vertical='top'] - Vertical starting point
 * @param {boolean} [props.verticalTranslateMiddle=true] - Center panel vertically
 * @param {boolean} [props.fixedToViewport=true] - Fix panel position to viewport
 * @param {number} [props.animationDuration=0.6] - Animation duration in seconds
 * @param {SideWidgetItem[]} [props.list=[]] - List of multiple panel configurations
 * @param {number} [props.gap=8] - Gap between stacked panels
 *
 * Single panel fallback props (used only when `list` is empty):
 * @param {'push'|'overlay'} [props.mode='push'] - Only used when `list` is empty, panel mode
 * @param {React.ReactNode} [props.trigger=null] - Only used when `list` is empty, trigger JSX
 * @param {string} [props.triggerClassName=''] - Only used when `list` is empty, trigger CSS class
 * @param {React.CSSProperties} [props.triggerStyle={}] - Only used when `list` is empty, trigger style
 * @param {React.ReactNode} [props.children=null] - Only used when `list` is empty, panel content JSX
 * @param {string} [props.childrenClassName=''] - Only used when `list` is empty, panel CSS class
 * @param {React.CSSProperties} [props.childrenStyle={}] - Only used when `list` is empty, panel style
 * @param {Function} [props.openSidePanel] - Only used when `list` is empty, function to open panel
 * @param {Function} [props.closeSidePanel] - Only used when `list` is empty, function to close panel
 * @param {boolean} [props.sideOpen=false] - Only used when `list` is empty, whether panel is open
 * @param {'default'|'reverse'} [props.stackDirection='default'] - Only used when `list` is empty, stacking direction
 * @param {boolean} [props.backdrop=false] - Only used when `list` is empty, show backdrop or not
 * @param {string|number} [props.id] - Only used when `list` is empty, unique panel ID
 */

const SideWidgetAsList = ({
  zIndex = 3001,
  side = "right",

  verticalOffset = "50%",
  vertical = "top",
  verticalTranslateMiddle = true,

  fixedToViewport = true,

  animationDuration = 0.6,

  list = [],
  gap = 8,
  ...restParam
}) => {
  const defaultSidePanelParam = {
    mode: "push",
    trigger: null,
    triggerClassName: "",
    triggerStyle: {},

    children: null,
    childrenClassName: "",
    childrenStyle: {},

    openSidePanel: () => {},
    closeSidePanel: () => {},

    sideOpen: false,
    stackDirection: "default",
  };

  const defaultParamList = Object.keys(defaultSidePanelParam);

  const generateFallbackListForSingleItem = () => {
    let obj = {};
    defaultParamList.forEach((key) => {
      obj[key] = restParam.hasOwnProperty(key)
        ? restParam[key]
        : defaultSidePanelParam[key];
    });

    return [obj];
  };

  const finalList =
    Array.isArray(list) && list.length > 0
      ? list
      : generateFallbackListForSingleItem();

  return (
    <>
      {finalList.map(
        (item, listIndex) =>
          item?.backdrop && (
            <div
              key={item?.id || listIndex}
              style={{ zIndex: zIndex }}
              onClick={() => item?.closeSidePanel()}
              className={`position-absolute sidemenu-backdrop w-100 h-100 ${
                item?.sideOpen ? "open" : ""
              }`}
            />
          ),
      )}

      <div
        id="side-panel-outer-container"
        style={{
          ...(side === "right" ? { right: 0 } : { left: 0 }),
          ...(vertical === "top"
            ? { top: verticalOffset }
            : { bottom: verticalOffset }),

          zIndex: zIndex + 1,
        }}
        className={`${
          fixedToViewport ? "position-fixed" : "position-absolute"
        } ${verticalTranslateMiddle ? "translate-middle-y" : ""}`}
      >
        <div
          style={{ gap: gap, alignItems: side === "right" ? "end" : "start" }}
          className="position-relative d-flex-column"
        >
          {finalList.map(
            (
              {
                mode = "push",
                trigger = null, //JSX
                triggerClassName = "",
                triggerStyle = {},

                children = null, //JSX
                childrenClassName = "",
                childrenStyle = {},

                openSidePanel = () => {},
                closeSidePanel = () => {},

                sideOpen = false,
              },
              listIndex,
            ) => {
              const isTriggerBefore =
                (side === "right" && mode === "push") ||
                (side === "left" && mode === "overlay");

              const isTriggerAfter =
                (side === "right" && mode === "overlay") ||
                (side === "left" && mode === "push");

              return (
                <div className="d-flex w-fit" key={listIndex}>
                  {isTriggerBefore && (
                    <div
                      id="trigger-container"
                      className={`${triggerClassName}`}
                      style={{ ...triggerStyle }}
                      onClick={() =>
                        sideOpen ? closeSidePanel() : openSidePanel()
                      }
                    >
                      {trigger}
                    </div>
                  )}

                  <div
                    id="panel-container"
                    className={`d-grid ${childrenClassName}`}
                    style={{
                      ...childrenStyle,
                      display: "grid",
                      gridTemplateColumns: sideOpen ? "1fr" : "0fr",
                      transition: `grid-template-columns ${animationDuration}s ease`,
                    }}
                  >
                    <div className="overflow-hidden">{children}</div>
                  </div>

                  {isTriggerAfter && (
                    <div
                      id="trigger-container"
                      className={`${triggerClassName}`}
                      style={{ ...triggerStyle }}
                      onClick={() =>
                        sideOpen ? closeSidePanel() : openSidePanel()
                      }
                    >
                      {trigger}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>
    </>
  );
};

export default SideWidgetAsList;
