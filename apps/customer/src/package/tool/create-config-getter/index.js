import { get as lodashGet } from "lodash";
import { useEffect, useMemo } from "react";
import { compileCMSMapping } from "./utils";

//? ========================================================
//? example OF mapping
const XX_DISPLAY_CONFIG = {
  name: "XX_page",
  mappingList: [
    {
      defaultSource: ["display", "XX_page"],
      detail: {
        //?  (alias) : (final name in source)
        background_pc: "XX_page_background_image",
        background_mobile: "XX_page_mobile_background_image",
      },
    },
    {
      defaultSource: ["display", "XX_page", "hero_section"],
      detail: {
        //?  (alias) : (final name in source)
        image: "XX_page_hero_section_image",
      },
    },
  ],
  raw: {
    xx_page_banner: "display.banner.xx_page_banner",
  },
};
//? ========================================================
const createConfigGetter = (mappingConfig, source) => {
  const compiledMap = compileCMSMapping(mappingConfig);

  return (key) => {
    const path = compiledMap[key];

    if (!path) return undefined;

    return lodashGet(source, path);
  };
};

//? Hook version, avoids closure issues
const useConfigGetter = (mappingConfig, source) => {
  const compiledMap = useMemo(() => {
    return compileCMSMapping(mappingConfig);
  }, [mappingConfig]);

  const get = useMemo(() => {
    return (key) => {
      const path = compiledMap[key];
      if (!path) return undefined;

      const result = lodashGet(source, path);

      if (!result) return undefined;

      return result;
    };
  }, [compiledMap, source]);

  return get;
};

export { createConfigGetter, useConfigGetter };
