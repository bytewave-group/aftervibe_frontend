import { nanoid } from "nanoid";
import { setRecoil, getRecoil } from "recoil-nexus";
import {
  popupStateFamily,
  PopupKeyListState,
  popupSharedDataFamily,
} from "./newPopupState";
import DefaultConfirmDialog from "./DefaultConfirmDialog";

/**
 * Opens a dynamic popup and returns a promise that resolves when the popup calls `onSubmit`.
 *
 * - A unique popup key is generated using nanoid.
 * - The popup state is stored in Recoil (`popupStateFamily`).
 * - The key is also added to `PopupKeyListState` so that the PopupManager renders it.
 *
 * @param {string} options.title - Title shown in the popup header.
 * @param {React.Component} options.component - The component to render inside the popup.
 * @param {any} [options.data] - Optional data passed to the popup component.
 * @param {boolean} [options.autoClose=true] - Whether to automatically close the popup after submit.
 * @param {React.Component|null} [options.rightComponent=null] - Optional component to render on the right side of the popup header.
 * @param {Object} [options.initialSharedData] - Initial shared data for the popup, used to prefill or synchronize state across multiple popups with the same `syncId`.
 * @param {string} [options.syncId=null] - Optional key to link this popup to a shared data object, allowing multiple popups to read/write the same shared state.
 
 * @returns {Promise<{ status: boolean, data: any, close: Function }>}
 * - Resolves when the popup component calls `onSubmit`.
 * - Returns `status`, `data`, and a `close` function that can be used to manually close the popup.
 * 
 * @property {Object} action - Stores functions bound via `bindAction` that can be called from inside the popup.
 * @property {Function} bindAction - Allows binding functions to the popup from outside, accessible inside the popup via `action`.
 * @property {Function} destroyPopup - Completely removes the popup from the DOM and clears any associated shared data.
 
 */
export const openPopup = ({
  title,
  component,
  autoClose = true,
  rightComponent = null,
  data,
  initialSharedData, // Default values for shared data, only used at popup opening
  syncId = null,

  isMobileDialog = false,
  full_screen = false,
  className,
  animate = true,
  backdrop = true,
  closeByBackdropClick = true,
  customBackdrop = false,

  cssVars = null,
}) => {
  const key = nanoid();

  // use the provided syncId if available; otherwise, fallback to the popup's unique key
  // ensures every popup has a unique identifier for shared data synchronizatio
  const activeSyncId = syncId || key;

  // initialize shared data if provided
  if (initialSharedData && Object.keys(initialSharedData).length > 0) {
    setRecoil(popupSharedDataFamily(activeSyncId), (prev = {}) => ({
      ...prev,
      ...initialSharedData,
    }));
  }

  //* **************************************************************************** */
  // Close the popup by setting `show` to false (but not removing it from key list)
  const close = () => {
    setRecoil(popupStateFamily(key), (prev) => ({ ...prev, show: false }));
  };

  // Remove the popup entirely by removing its key from the key list
  // and clears any associated shared data.
  const destroyPopup = () => {
    setRecoil(PopupKeyListState, (prev) => prev.filter((k) => k !== key));
    setRecoil(popupSharedDataFamily(activeSyncId), {});
  };

  // Bind an action function so it can be called from outside
  const bindAction = (name, fn) => {
    setRecoil(popupStateFamily(key), (prev) => ({
      ...prev,
      action: {
        ...prev.action,
        [name]: fn,
      },
    }));
  };

  // add popupkey to keylist
  setRecoil(PopupKeyListState, (prev) => [...prev, key]);

  return new Promise((resolve) => {
    // initialize popup state in Recoil
    setRecoil(popupStateFamily(key), {
      key, // unique popup identifier
      show: true, // controls visibility
      title, // popup title
      component, // React component to render
      data, // extra data passed to the component
      syncId: activeSyncId, // key for shared data synchronization
      autoClose, // whether to auto-close after submit
      rightComponent, // optional component on header right
      action: {}, // stores externally bound functions
      bindAction, // method to bind functions from outside
      destroyPopup, // fully destroy popup and clear shared data
      onSubmit: (status, returnData) => {
        // callback when popup submits
        resolve({
          status, // submission status
          data: returnData, // submission data
          close, // method to manually close popup
        });

        if (autoClose) close(); // auto-close if enabled
      },

      isMobileDialog, //
      full_screen, // whether popup takes full screen
      className, // popup CSS class
      animate, // animation configuration for popup transitions
      backdrop, // backdrop configuration (opacity, color, etc.)
      closeByBackdropClick, // whether clicking backdrop closes popup

      customBackdrop,

      cssVars, //
    });
  });
};

const normalizeProps = (args) => {
  let finalProps = {};

  const isReactComponent = (val) =>
    typeof val === "function" || !!val?.$$typeof;

  const patternPopup =
    args?.length === 1 &&
    typeof args[0] === "object" &&
    !isReactComponent(args[0]);

  const patternDialogComponent =
    args?.length > 1 && typeof args[0] === "string";

  const patternComponentOnly = isReactComponent(args[0]);

  if (patternPopup) {
    const props = args[0] || {};
    finalProps = {
      ...props,
    };
  } else if (patternDialogComponent) {
    finalProps = {
      title: args[0] || "",
      component: args[1],
      data: args[2] || {},
      ...(args?.[3] ? { ...args?.[3] } : {}),
    };
  } else if (patternComponentOnly) {
    finalProps = {
      component: args[0],
    };
  } else {
    finalProps = {};
    console.error("Unknown type ");
  }

  return finalProps;
};

const defaultProps = {
  title: "",
  component: null,
  closeByBackdropClick: true,
  autoClose: true,
  className: "",
  rightComponent: null,
  data: null,
};

/**
 * openPopupAsDialog
 * Opens a modal like dialog with flexible API.
 *
 * Supports three usage patterns:
 * 1. Object pattern:
 *    openPopupAsDialog({ title, component, data, ... })
 * 2. Dialog pattern:
 *    openPopupAsDialog(title, Component, modalProps, dialogProps)
 * 3. Component-only pattern:
 *    openPopupAsDialog(Component, props)
 *
 * @param {Object|string} propsOrString - Can be an options object, title string, or React component
 * @param {...any} otherProps
 *   - //!!⚠️ open_dialog_component pattern is supported but DO NOT USE in new projects.
 *   - Additional arguments depending on the pattern:
 *       - Dialog pattern: [Component, modalProps, dialogProps]
 *       - Component-only pattern: [props]
 *
 * Returns a promise that resolves when the popup is opened.
 */

export const openPopupAsDialog = async (
  propsOrString = {
    title: "",
    component: null,
    closeByBackdropClick: true,
    autoClose: true,
    className: "",
    rightComponent: null,
    data: null,

    cssVars: null, // Optional CSS variables to inject dynamically
  },
  ...otherProps
) => {
  //? pattern Dialog , otherProps = [ Component , modalProps , dialogProp]
  //? pattern Popup , otherProps = []
  const newProps = normalizeProps([propsOrString, ...otherProps]);

  const resDialog = await openPopup({
    ...defaultProps,
    ...newProps,
    className: `${newProps?.className} ${newProps?.cssClass}`, // Support old `cssClass` key
    animate: false,
    isMobileDialog: true,
    backdrop: true,
  });

  return resDialog?.data ? resDialog : resDialog?.status;
};

// ** EXAMPLE ** //
// const FormDialog = ({ onSubmit }) => {
//   const [form, setForm] = useState({
//     name: "",
//   });
//   const handleClick = async () => {
//     if (!form?.name) {
//       show_toast("Please enter your name");
//       return;
//     }
//     const res = await new Promise((resolve) => {
//       //? fake api call
//       setTimeout(() => {
//         resolve({ status: true, message: "Form success submit" });
//       }, 800);
//     });
//     if (res?.status) {
//       onSubmit(true, res);
//     }
//   };

//   return (
//     <div>
//       {" "}
//       <div>Form</div>
//       <FormInput
//         inputValue={form?.name}
//         className="border-1 border-black p-2"
//         onChange={(e) => {
//           const value = e.target.value;
//           setForm((prev) => ({ ...prev, name: value }));
//         }}
//       />
//       <Button className="btn-primary" onClick={handleClick}>
//         Submit
//       </Button>
//     </div>
//   );
// };

// openPopupAsDialog({
//     component: ({ onSubmit }) => {
//       const handleClick = async () => {
//         const resPopup = await openPopupAsDialog({
//           component: FormDialog,
//           closeByBackdropClick: false,
//         });

//         if (resPopup?.status) {
//           const res = resPopup?.data;
//           if (res?.status) {
//             show_toast("Success");
//             onSubmit(true);
//           }
//         }
//       };

//       return (
//         <div>
//           {" "}
//           <div>TESTING Open New Popup as Dialog</div>
//           <Button className="btn-primary" onClick={handleClick}>
//             Open Form
//           </Button>
//         </div>
//       );
//     },
//     closeByBackdropClick: false,
//   });

//? For open custom popup
// const TestingComponent = ({
//   data,
//   onSubmit = (status, returnData) => {},
//   onClose = () => {},
//   bindAction = (actionName, actionFunc) => {},
// }) => {
//   useEffect(() => {
//     bindAction("deleteBetSlip", handleDelete);
//   }, []);
//   return <>TESTING {data?.test}</>;
// };

// useEffect(() => {
//   const fetch = async () => {
//     try {
//       const res = await openPopup({
//         data: { test: "123" },
//         title: "TESTING TITLE",
//         component: TestingComponent,
//         autoClose: false,
//         rightComponent: (action) => (
//           <Button
//             className="text10 text-primary-main text-transform-uppercase fw-bold"
//             onClick={() =>  action?.deleteBetSlip(betIdList);}
//           >
//             {t("Clear All")}
//           </Button>
//         ),
//       });

//       res?.close();

//       if (res) {
//         console.log("promis resolved");
//       }
//     } catch (error) {
//       console.log("ERROR", error);
//     }
//   };
//   fetch();
// }, []);

export async function openConfirmDialogInDialog(
  message,
  {
    bg,
    width,
    padding,
    cssVars,
    className = "",
    confirmText = "",
    cancelText = "",

    titleText = "",
  } = {},
) {
  return await openPopupAsDialog({
    customBackdrop: true,
    closeByBackdropClick: false,
    className: className,
    component: DefaultConfirmDialog,
    data: {
      message,
      titleText,
      confirmText,
      cancelText,
    },
    cssVars: {
      ...(bg ? { "--f7-dialog-bg-color": bg } : {}),
      ...(padding ? { "--f7-dialog-inner-padding": padding } : {}),
      ...(width ? { "--f7-dialog-width": `min(${width},90vw)` } : {}),
    },
  });
}
