import { f7 } from "framework7-react";



export default useCommon;

function useCommon() {
  return {
    navigate,
  };


  function navigate(path, options = {}) {
    const mainRouter = f7.views?.main?.router;

    /* if path is -1,direct back to previous page */
    if (path.toString() === "-1") {
      mainRouter?.back?.();
      return;
    }

    const defaultOptions = {
      reloadCurrent: false,
      pushState: true,
      // openIn: "popup",
    };
    let mergedOptions;
    /* check use default options or just use options passed */
    if (options.noOption) {
      const { noOption, ...restOptions } = options;
      mergedOptions = { ...restOptions };
    } else {
      mergedOptions = { ...defaultOptions, ...options };
    }
    /* tab route list  */
    const tabRoutes = [
      "/",
      "/promotion/",
      "/deposit/",
      "/notification/",
      "/settings/",
    ];
    /* if path is not start with / or end with /, show error */
    if (!path.startsWith("/")) {
      console.error(
        "Invalid path format. Path should start and end with '/'. Example: /path/"
      );
      return;
    }

    /* if path is tab route, show tab */
    if (tabRoutes.includes(path)) {
      const tabId =
        path === "/" ? `#view-home` : `#view-${path.replace(/\//g, "")}`;
      f7.tab.show(tabId);
    } else {
      /* if path is not tab route, navigate to page */
      if (!mainRouter) {
        console.warn("[navigate] main view router not ready yet", path);
        return;
      }
      if (options.query) {
        const queryString = Object.entries(options.query)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        const pathWithQuery = `${path}?${queryString}`;
        mainRouter.navigate(pathWithQuery, mergedOptions);
      } else {
        mainRouter.navigate(path, mergedOptions);
      }
    }
  }
}
