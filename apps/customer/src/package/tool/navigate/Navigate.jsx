import { f7, f7ready } from "framework7-react";
import { useEffect, useState } from "react";
import { tabRoutes } from "../../../library/routes.js";
import { Capacitor } from "@capacitor/core";
import { openNewTabCrossPlatform } from "../cross-platform-navigate/windowOpen.jsx";

/**
 * Global navigation function
 * @param {string | number} path - Target path or -1 (go back to the previous page)
 */
export default function navigate(
  path,
  options = {
    browserHistory: true,
    reloadAll: false,
    reloadCurrent: false,
    reloadPrevious: false,
    force: false,
    clearPreviousHistory: false,
    ignoreCache: false,
    pushState: true,
    props: {},

    openInNewTab: false,

    animate: false,

    noOption: false,
  },
) {
  if (!path) return;

  //* ------------------ f7 option ------------------ */
  const defaultF7Options = {
    browserHistory: true,
    reloadAll: false,
    reloadCurrent: false,
    reloadPrevious: false,
    force: false,
    clearPreviousHistory: false,
    ignoreCache: false,
    pushState: true,
    props: {},

    openInNewTab: false,

    animate: false,
  };

  const { noOption, ...restOptions } = options;

  const mergedOptions = {
    ...(!noOption ? defaultF7Options : {}),
    ...restOptions,
  };

  //* ---------------------------------------------- */

  // back 的处理
  if (String(path) === "-1") {
    try {
      f7?.views?.main?.router.back();
      return;
    } catch (e) {
      console.error(e);
    }

    return;
  }

  const currentSearch = window.location.search;

  const hasQuery = String(path).includes("?");

  const finalPath = path + (!hasQuery && currentSearch ? currentSearch : "");

  if (options.openInNewTab) {
    openNewTabCrossPlatform(finalPath, "_blank", "noopener,noreferrer");
    return;
  }

  const isTabRoute = tabRoutes.some((r) => r.path === path);

  const router = f7?.views?.main?.router;

  if (!router) {
    console.error("F7 Router 不存在");
    return;
  }
  const currentPath = router.currentRoute?.path;

  console.log("目前路由:", router.currentRoute?.path);
  console.log("預計跳轉到:", path);

  const shouldForceReload =
    (currentPath === "/login" && path === "/register") ||
    (currentPath === "/register" && path === "/login") ||
    !!options.clearPreviousHistory;

  if (shouldForceReload) {
    console.log("🔁 Force reloading");
    router.clearPreviousHistory();
    router.navigate(path, {
      reloadAll: true,
      ignoreCache: true,
      clearPreviousHistory: true,
      animate: false,
    });
    return;
  }

  const isIOS = Capacitor.getPlatform() === "ios";
  if (isIOS) {
    mergedOptions.browserHistory = false;
  }

  if (isTabRoute) {
    router.navigate(path, {
      ...mergedOptions,
      animate: false,
      reloadCurrent: false,
      clearPreviousHistory: false,
    });
  } else {
    router.navigate(path, {
      ...mergedOptions,
      animate: false,
      reloadCurrent: false,
    });
  }
  if (isIOS) {
    window.history.replaceState(window.history.state, "", path);
  }
}

export function usePathname() {
  const [pathname, setPathname] = useState(
    () => f7?.views?.main?.router?.currentRoute?.path ?? "/",
  );

  useEffect(() => {
    f7ready(() => {
      const router = f7?.views?.main?.router;
      if (!router) return;

      const updatePath = () => {
        setPathname(router.currentRoute?.path ?? "/");
      };

      updatePath();

      router.on("routeChange", updatePath);

      return () => {
        router.off("routeChange", updatePath);
      };
    });
  }, []);

  return pathname;
}
