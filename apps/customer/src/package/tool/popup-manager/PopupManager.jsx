import { useEffect, useState } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import { f7, Popup, Navbar } from "framework7-react";

import {
  PopupKeyListState,
  popupStateFamily,
  popupSharedDataFamily,
} from "./newPopupState";
import { useTranslation } from "react-i18next";
import "./popup-manager.scss";

// PopupManager renders all active popups based on the key list in Recoil state.
export default function PopupManager() {
  const keyList = useRecoilValue(PopupKeyListState);

  return (
    <>
      {keyList.map((key) => (
        <SinglePopup key={key} popupKey={key} />
      ))}
    </>
  );
}

function SinglePopup({ popupKey }) {
  const { t } = useTranslation();
  const [popupState, setPopupState] = useRecoilState(
    popupStateFamily(popupKey),
  );
  const {
    show, // Whether the popup should be shown
    title, // Popup title (optional)
    component: Component, // The component to render inside the popup
    data, // Data to pass into the popup component
    onSubmit, // Function to call when user submits
    destroyPopup, // Cleanup function to remove this popup from state
    rightComponent, // Optional right side component in the Navbar
    bindAction, // Bind an action function so it can be called from outside

    full_screen,
    isMobileDialog,
    className,
    animate,
    backdrop,
    closeByBackdropClick,

    cssVars,
    customBackdrop,
  } = popupState;

  const [opened, setOpened] = useState(false); // Local state for actual F7 <Popup> opening

  useEffect(() => {
    if (show && Component && !opened) {
      // Delay slightly to prevent visual glitch on open
      const timer = setTimeout(() => setOpened(true), 30);
      return () => clearTimeout(timer);
    }

    if (!show && opened) {
      setOpened(false);
    }
  }, [show, opened, Component]);

  if (!Component) return null;

  const [isPopupOpened, setIsPopupOpened] = useState(false);

  return (
    <>
      {customBackdrop && opened && (
        <div
          style={{
            zIndex: 11000,
            background: "rgba(0, 0, 0, 0.4)",
          }}
          className="position-fixed top-0 start-0 w-100 h-100"
        />
      )}
      <Popup
        id={`popup-id-${popupKey}`}
        tabletFullscreen={isMobileDialog || full_screen || false}
        key={popupKey}
        opened={opened}
        onPopupClosed={(popupInstance) => {
          destroyPopup?.(); // Only destroy after popup is fully closed
        }}
        onPopupOpened={() => setIsPopupOpened(true)}
        className={`${
          isMobileDialog ? "custom-popup-mobile-dialog custom-dialog" : ""
        } ${className}`}
        animate={animate}
        backdrop={backdrop}
        closeByBackdropClick={closeByBackdropClick}
        style={{
          ...(cssVars || {}),
        }}
      >
        {/* Optional header bar */}
        {title && (
          <Navbar
            title={t(title)}
            sliding={false}
            backLink="Back"
            className="navbar-custom"
            onBackClick={() => {
              onSubmit(false);
              setOpened(false);
            }}
          >
            {rightComponent && (
              <div slot="right">
                {typeof rightComponent === "function"
                  ? // Pass popupState.action so rightComponent can trigger functions defined inside the popup
                    rightComponent(popupState?.action)
                  : rightComponent}
              </div>
            )}
          </Navbar>
        )}
        <Component
          {...(isMobileDialog
            ? { ...data, data }
            : {
                data: data,
              })}
          {...(isMobileDialog
            ? {
                onf7DialogConfirm: (status, data) => {
                  onSubmit(status, data);
                },
              }
            : {})}
          onSubmit={onSubmit}
          onClose={() => {
            onSubmit(false);
            setOpened(false);
          }}
          isPopupOpened={isPopupOpened}
          bindAction={bindAction}
        />
      </Popup>
    </>
  );
}
