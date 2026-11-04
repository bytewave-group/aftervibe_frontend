import { f7, f7ready } from "framework7-react";

export function show_toast(text, position = "center", closeTimeout = 2000) {
  if (window?.["__PRERENDER_INJECTED"]?.["__IS_PRERENDER"]) {
    return null;
  }

  try {
    f7.toast.show({
      text: text,
      position: position,
      closeTimeout: closeTimeout,
      cssClass: "wider-toast white-bg-toast",
    });
  } catch (error) {
    console.error("ERROR , Can't open toast");
  }
  // }
}
