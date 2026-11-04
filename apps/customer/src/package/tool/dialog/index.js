import appConfig from "../../../../appconfig.json";
import { retryError, retryUntilReady } from "../retry";
import * as DialogFunction from "./DialogFunction";

let dialogModule = null;
let dialogModulePromise = null;

async function getDialogModuleAsync() {
  if (dialogModule) return dialogModule;

  if (!dialogModulePromise) {
    dialogModulePromise = (async () => {
      let swalModule = null;
      let defaultModules = null;
      swalModule = await import("./SwalFunction");
      defaultModules = DialogFunction;

      dialogModule = appConfig?.useSwal ? swalModule : defaultModules;

      return dialogModule;
    })();
  }

  return dialogModulePromise;
}

const invokeDialog = (funcName = "") => {
  return async (...args) => {
    const dialogModule = await getDialogModuleAsync();

    const fn = dialogModule?.[funcName];

    if (!fn) {
      throw Object.assign(new Error("NOT_READY"), {
        retryable: true,
        code: "NOT_READY",
      });
    }

    return await fn(...args);
  };
};

async function open_message(...args) {
  const tryOpen = invokeDialog("open_message");

  try {
    return await retryUntilReady(() => tryOpen(...args), 20, 200);
  } catch (err) {
    console.error("[open_message] failed:");
    throw err;
  }
}

/**
 * Opens a confirmation dialog with Yes/No buttons
 * Expected args structure:
 * [
 *   title: string,
 *   content: string | React.ReactElement,
 *   option: Object
 * ]
 */
async function open_confirm_message(...args) {
  const tryOpen = invokeDialog("open_confirm_message");

  try {
    return await retryUntilReady(() => tryOpen(...args), 20, 200);
  } catch (err) {
    console.error("[open_confirm_message] failed:");
    throw err;
  }
}

export { open_dialog_component, DialogManager } from "./DialogFunction";

export { SwalDialogLoader as SwalDialogContent } from "./SwalDialogLoader";

export { open_message, open_confirm_message };

export { default as DialogState } from "./DialogState";
