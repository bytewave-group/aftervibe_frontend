import React, { useState, useEffect, useRef } from "react";

import appConfig from "../../../../appconfig.json";

let cachedComponent = null;

export function SwalDialogLoader(props) {
  const [Component, setComponent] = useState(cachedComponent);

  useEffect(() => {
    if (!appConfig?.useSwal) return;
    if (cachedComponent) return;

    let mounted = true;

    import("./SwalFunction").then((module) => {
      if (!mounted) return;

      cachedComponent = module.SwalDialogContent;

      setComponent(() => cachedComponent);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!Component) return null;

  return <Component {...props} />;
}
