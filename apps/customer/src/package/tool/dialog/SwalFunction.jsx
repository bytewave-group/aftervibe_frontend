import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import "sweetalert2/dist/sweetalert2.min.css";
import { useRecoilState } from "recoil";
import { getI18n, useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { DialogState } from "@my-common-tool/tool/dialog";
import { setRecoil } from "recoil-nexus";

/**
 * Custom hook for managing SweetAlert2 dialogs with React integration
 * Provides methods to open various types of alert dialogs with customizable options
 * @returns {Object} Object containing open_swal and open_confirm_message functions
 */

const SwalReact = withReactContent(Swal);

/**
 * Default configuration options for SweetAlert2 dialogs
 * Contains common settings for button visibility, styling, and behavior
 */
const commonOption = {
  icon: "info",

  showConfirmButton: true,
  showCancelButton: false,
  showDenyButton: false,
  showCloseButton: false,

  focusConfirm: false,
  focusCancel: false,

  titleClass: "",
  confirmButtonClass: "",
  denyButtonClass: "btn-danger",
  cancelButtonClass: "",
  closeButtonClass: "",

  containerClass: "",
  headerClass: "",
  iconClass: "",
  contentClass: "",

  confirmButtonText: "Cancel",
  cancelButtonText: "Confirm",

  closeByBackdropClick: true,
};

const setDialogContent = (
  value,
  key = "swalContent",
  keepPrevValue = "no", //? "no" || "array" || "object"
) => {
  setRecoil(DialogState, (prev) => {
    const newValue =
      keepPrevValue === "no"
        ? value
        : keepPrevValue === "array"
        ? [...prev?.[key], value]
        : keepPrevValue === "object"
        ? { ...prev?.[key], ...value }
        : null;
    return { ...prev, [key]: newValue };
  });
};

const open_swal = (title = "", content = "", options = {}) => {
  const t = getI18n()?.t || ((v) => v);
  const finalOptions = { ...commonOption, ...options };

  const {
    icon,

    showConfirmButton,
    showCancelButton,
    showDenyButton,
    showCloseButton,

    focusConfirm,
    focusCancel,

    headerClass,
    titleClass,

    containerClass,
    iconClass,
    contentClass,

    confirmButtonClass,
    cancelButtonClass,
    closeButtonClass,
    denyButtonClass,

    confirmButtonText,
    cancelButtonText,

    closeByBackdropClick,
    ...rest
  } = finalOptions;

  const buttonCount = [
    showConfirmButton,
    showCancelButton,
    showDenyButton,
  ].filter(Boolean).length;

  const customClass = {
    header: headerClass,
    title: `swal-title-custom ${titleClass}`,
    actions: `d-grid grid-${buttonCount} column-gap-12`,
    container: containerClass,
    icon: iconClass,
    htmlContainer: `swal-content-custom ${contentClass}`,

    confirmButton: `${showConfirmButton ? "d-block" : "d-none"} m-0 ${
      confirmButtonClass || ""
    }`,
    cancelButton: `${showCancelButton ? "d-block" : "d-none"} m-0 ${
      cancelButtonClass || ""
    }`,
    denyButton: `${showDenyButton ? "d-block" : "d-none"} m-0 ${
      denyButtonClass || ""
    }`,
    closeButton: `${showCloseButton ? "d-block" : "d-none"} m-0 ${
      closeButtonClass || ""
    }`,
  };

  const fireOptions = {
    target: document.querySelector("#framework7-root") || document.body,
    title,
    icon,

    confirmButtonText: t(confirmButtonText),
    cancelButtonText: t(cancelButtonText),

    showConfirmButton,
    showCancelButton,
    showDenyButton,
    showCloseButton,
    focusConfirm,
    focusCancel,
    allowOutsideClick: closeByBackdropClick,
    customClass,
    ...rest,
  };
  return new Promise((resolve) => {
    if (React.isValidElement(content)) {
      const clonedContent = React.cloneElement(content, {
        onConfirm: (status, data) => {
          resolve({ status, data });
          SwalReact.close();
        },
      });

      fireOptions.html = '<div id="react-swal-container"></div>';

      fireOptions.didRender = (dom) => {
        const mountPoint = dom.querySelector("#react-swal-container");
        if (!mountPoint) return;

        const portalContent = createPortal(clonedContent, mountPoint);

        setDialogContent(portalContent, "swalContent");
      };

      fireOptions.willClose = () => {
        setDialogContent(null, "swalContent");
      };
    } else if (typeof content === "string") {
      fireOptions.html = content;
    } else {
      fireOptions.html = "";
    }

    SwalReact.fire(fireOptions).then((result) => {
      if (!result.isDismissed && !result.isConfirmed) return;
      resolve({
        status: result.isConfirmed,
      });
    });
  });
};

export const open_message = (title, content, option_or_icon) => {
  const t = getI18n()?.t || ((v) => v);

  let finalOption = {
    confirmButtonText: t("Cancel"),
    icon: "info",
  };

  if (typeof option_or_icon === "object" && option_or_icon !== null) {
    finalOption = {
      ...finalOption,
      confirmButtonText:
        option_or_icon.confirmButtonText || finalOption.confirmButtonText,
      titleClass: option_or_icon.titleClass || "",
      confirmButtonClass: `text15 fw-bold ${
        option_or_icon.confirmButtonClass || ""
      }`,
      ...option_or_icon,
    };
  } else if (typeof option_or_icon === "string") {
    finalOption.icon = option_or_icon;
  }

  return open_swal(title, content, finalOption);
};

/**
 * Opens a confirmation dialog with Yes/No buttons
 * @param {string} title - The title text for the confirmation dialog
 * @param {string|React.Element} content - The content to display
 * @param {Object} option - Additional styling and behavior options
 * @returns {Promise<Object>} Promise that resolves with user's choice {status: boolean, value: any}
 */
export const open_confirm_message = (title, content, option) => {
  const t = getI18n()?.t || ((v) => v);

  return open_swal(title, content, {
    icon: "question",
    showCancelButton: true,
    confirmButtonText: t(option?.confirmButtonText || "Confirm"),
    cancelButtonText: t(option?.cancelButtonText || "Cancel"),

    titleClass: `${option?.titleClass}`,
    confirmButtonClass: `text15 fw-bold ${option?.confirmButtonClass || ""}`,
    cancelButtonClass: `text15 fw-bold ${option?.cancelButtonClass || ""}`,
    ...option,
  });
};

const addToPendingList = (task) => {
  return new Promise((resolve, reject) => {
    const wrappedTask = async () => {
      try {
        const result = await task();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    setDialogContent(wrappedTask, "pendingList", "array");
  });
};

export function useSwal() {
  //! ================================================================================= */
  //! ================================================================================= */

  // useEffect(() => {
  //   if (!dialogState.pendingList.length || dialogState.isRunning) return;

  //   const runQueue = async () => {
  //     setDialogState((prev) => ({ ...prev, isRunning: true }));

  //     while (dialogState.pendingList.length > 0) {
  //       const nextTask = dialogState.pendingList[0];
  //       try {
  //         await nextTask();
  //       } catch (err) {
  //         console.error(err);
  //       }
  //       setDialogState((prev) => ({
  //         ...prev,
  //         pendingList: prev.pendingList.slice(1),
  //       }));
  //     }

  //     setDialogState((prev) => ({ ...prev, isRunning: false }));
  //   };

  //   runQueue();
  // }, [dialogState.pendingList]);
  //! ================================================================================= */
  //! ================================================================================= */

  return {
    open_swal,
    open_message,
    open_confirm_message,
  };
}

export const SwalDialogContent = () => {
  const [dialogState, setDialogState] = useRecoilState(DialogState);
  const { swalContent } = dialogState;
  return swalContent;
};
