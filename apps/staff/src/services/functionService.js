import { f7 } from 'framework7-react';

export const useNavigation = () => {
  const navigate = (path, options = {}) => {
    const mainRouter = f7.views?.main?.router;
    if (path.toString() === "-1") {
      mainRouter?.back?.();
      return;
    }

    const defaultOptions = {
      reloadCurrent: false,
      pushState: true,
    };
    
    let mergedOptions;
    if (options.noOption) {
      const { noOption, ...restOptions } = options;
      mergedOptions = { ...restOptions };
    } else {
      mergedOptions = { ...defaultOptions, ...options };
    }

    if (!path.startsWith("/")) {
      console.error("Invalid path format. Path should start with '/'. Example: /path");
      return;
    }

    if (!mainRouter) {
      console.warn("[navigate] main view router not ready yet", path);
      return;
    }
    mainRouter.navigate(path, mergedOptions);
  };

  return { navigate };
};

