import { f7 } from "framework7-react";
import React, { useEffect } from "react";
import { getI18n } from "react-i18next";
import { useRecoilState } from "recoil";
import { createPortal } from "react-dom";
import { setRecoil, getRecoil } from "recoil-nexus";
import DialogState from "./DialogState";
import appConfig from "./../../../../appconfig.json";

const setDialogContent = (portalContent) => {
  setRecoil(DialogState, (prev) => ({ ...prev, content: portalContent }));
};

export function open_message(content, navigate = null, title = "") {
  if (navigate) {
    f7.dialog.confirm(content, title, () => {
      navigate(navigate);
    });
  } else {
    f7.dialog.alert(content, title);
  }
}

export function open_confirm_message(
  title,
  content,
  {
    closeWhenConfirm = true,
    closeWhenCancel = true,
    closeByBackdropClick = false,
    hideCancelButton = false,
    hideConfirmButton = false,
    cssClass = "",
    cssVars = null,
    confirmName = "Confirm",
    cancelName = "Cancel",
    onClose = () => {},
    onOpen = () => {},
  } = {},
) {
  const t = getI18n()?.t || ((v) => v);

  return new Promise((resolve, reject) => {
    const dialog = f7.dialog.create({
      title: title,
      content: content,
      cssClass: `${cssClass} ${
        appConfig?.default_dialog_class?.container || ""
      }`,
      closeByBackdropClick: closeByBackdropClick,
      buttons: [
        !hideCancelButton && {
          cssClass: "custom-dialog-cancel",
          text: t(cancelName),
          onClick: () => {
            resolve(false); // Return false
          },
          close: closeWhenCancel,
        },
        !hideConfirmButton && {
          cssClass: "custom-dialog-confirm",
          text: t(confirmName),
          onClick: () => {
            resolve(true); // Return true
          },
          close: closeWhenConfirm,
        },
      ].filter(Boolean), // Filter out hidden buttons
      /* cssClass: "custom-confirm-dialog",  */
    });

    dialog.on("open", () => {
      const el = dialog.el;
      if (el && cssVars) {
        Object.entries(cssVars).forEach(([key, val]) => {
          el.style.setProperty(key, val);
        });
      }
      onOpen();
    });

    dialog.open();
  });
}

export function open_dialog_component(
  title,
  ContentComponent,
  modalProps,
  {
    closeWhenConfirm = true,
    closeWhenCancel = true,
    closeByBackdropClick = false,
    hideBackdrop = true,
    hideCancelButton = false,
    hideConfirmButton = false,
    cssClass = "",
    cssVars = null,
    confirmName = "Confirm",
    cancelName = "Cancel",
    onClose = () => {},
    onOpen = () => {},
  } = {},
) {
  const t = getI18n()?.t || ((v) => v);

  return new Promise((resolve) => {
    let isResolved = false;
    const existingContent = document.getElementById("dialog-custom-content");
    if (existingContent) {
      existingContent.remove();
    }

    const tempDiv = document.createElement("div");
    tempDiv.id = "dialog-custom-content";
    tempDiv.dataset.createTime = String(Date.now());

    const dialog = f7.dialog
      .create({
        title: title,
        content: tempDiv.outerHTML,
        cssClass: `${cssClass} ${
          appConfig?.default_dialog_class?.container || ""
        }`,
        backdrop: !hideBackdrop,
        closeByBackdropClick: closeByBackdropClick,
        buttons: [
          !hideCancelButton && {
            text: t(cancelName),
            onClick: () => {
              isResolved = true;
              resolve(false);
            },
            close: closeWhenCancel,
            cssClass: "custom-dialog-cancel",
          },
          !hideConfirmButton && {
            text: t(confirmName),
            onClick: () => {
              isResolved = true;
              resolve(true);
            },
            close: closeWhenConfirm,
            cssClass: "custom-dialog-confirm",
          },
        ].filter(Boolean),
      })
      .on("open", () => {
        const el = dialog.el;
        if (el && cssVars) {
          Object.entries(cssVars).forEach(([key, val]) => {
            el.style.setProperty(key, val);
          });
        }

        const container = document.getElementById("dialog-custom-content");
        const portalContent = createPortal(
          <ContentComponent
            onf7DialogConfirm={(status, data) => {
              if (typeof data === "undefined") {
                resolve(status);
              } else {
                resolve({ status, data });
              }
              dialog.close();
            }}
            {...modalProps}
            onClose={() => dialog.close()}
          />,
          container,
        );

        setDialogContent(portalContent);

        onOpen();
      })
      .on("close", () => {
        if (!isResolved) {
          resolve(false);
        }
        onClose();
      });

    dialog.open();
  });
}

export const DialogManager = () => {
  const [dialogState, setDialogState] = useRecoilState(DialogState);
  const { content } = dialogState;
  return content;
};
