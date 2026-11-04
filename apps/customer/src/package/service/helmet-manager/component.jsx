import { useState, useEffect, useRef, useMemo, cloneElement } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { f7, f7ready } from "framework7-react";
import { Helmet } from "react-helmet-async";
import get from "lodash/get";

import appConfig from "../../../../appconfig.json";
import GlobalState from "../../../atoms/GlobalState";

const USE_APP_CONFIG_DEFAULT_META = appConfig?.use_default_meta;

const helmetList = [
  {
    name: "title",
    keyNames: ["title"],
    optional_fallback: ["title"],
    render: (value) => <title>{value}</title>,
  },
  {
    name: "description",
    keyNames: ["description"],
    optional_fallback: ["description"],
    render: (value) => (
      <meta name="description" content={value || "No description provided"} />
    ),
  },
  ...["icon", "apple-touch-icon", "shortcut icon"].map((rel) => {
    return {
      name: rel,
      optional_fallback: ["meta", "thumbnail"],
      keyNames: ["icon", "favicon", "thumbnail"],
      render: (value) => (value ? <link rel={rel} href={value} /> : null),
    };
  }),
  ...["title", "description", "image", "url", "type"].map((detail) => ({
    name: `og:${detail}`,
    keyNames: [`og_${detail}`, `${detail}`],
    render: (value) =>
      value ? <meta property={`og:${detail}`} content={value} /> : null,
  })),
  ...["title", "description", "card", "image", "url"].map((detail) => ({
    name: `twitter:${detail}`,
    keyNames: [`twitter_${detail}`, `${detail}`],
    render: (value) =>
      value ? <meta name={`twitter:${detail}`} content={value} /> : null,
  })),
  {
    name: "keywords",
    keyNames: ["keywords"],
    render: (value) =>
      value ? <meta name="keywords" content={value} /> : null,
  },
  {
    name: "author",
    keyNames: ["author"],
    optional_fallback: ["author"],
    render: (value) => (value ? <meta name="author" content={value} /> : null),
  },
  {
    name: "canonical_url",
    keyNames: ["canonical_url", "url"],
    render: (value) => (value ? <link rel="canonical" href={value} /> : null),
  },
];

export default function HelmetManager() {
  const { t } = useTranslation();
  const [pathname, setPathname] = useState(null);
  const global = useRecoilValue(GlobalState);
  const [globalSettingMeta, setGlobalSettingMeta] = useState(null);

  useEffect(() => {
    if (global?.theme === "blank") return;

    if (global?.settings?.meta) {
      setGlobalSettingMeta(global?.settings?.meta);
    }
  }, [global]);

  const routerRef = useRef(null);

  useEffect(() => {
    const updatePath = () => {
      setPathname(routerRef.current.currentRoute?.path ?? "/");
    };

    f7ready(() => {
      routerRef.current = f7?.views?.main?.router;
      if (!routerRef.current) return;

      updatePath();
      routerRef.current.on("routeChange", updatePath);
    });

    return () => {
      if (routerRef.current) {
        routerRef.current.off("routeChange", updatePath);
      }
    };
  }, []);

  const headMetaObj = useMemo(() => {
    if (!globalSettingMeta) return {};

    const pageName = pathname === "/" ? "home" : pathname.split("/")[1] || "";

    const defaultMeta = globalSettingMeta;
    const homeMeta = globalSettingMeta?.home;
    const matchItem = globalSettingMeta?.[pageName] || {};

    const cleanMatchItemObject = Object.fromEntries(
      Object.entries(matchItem).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );

    return {
      ...defaultMeta,
      ...homeMeta,
      ...cleanMatchItemObject,
    };
  }, [globalSettingMeta, pathname]);

  useEffect(() => {
    if (Object.keys(headMetaObj)?.length === 0) return;
    setTimeout(() => {
      document.dispatchEvent(new Event("custom-render-event"));
    }, 5000);
  }, [headMetaObj, pathname]);

  const getValue = (keys, meta) => {
    for (const key of keys) {
      if (meta?.[key] !== undefined && meta?.[key] !== null) {
        return meta[key];
      }
    }
    return undefined;
  };

  const getFallbackValue = (pathArr) => {
    return get(appConfig, pathArr);
  };

  return (
    <Helmet>
      {helmetList.map((item) => {
        const value = getValue(item.keyNames, headMetaObj);

        const finalValue =
          value ??
          (USE_APP_CONFIG_DEFAULT_META
            ? getFallbackValue(item.optional_fallback)
            : undefined);
        const element = item.render(finalValue);

        return element ? cloneElement(element, { key: item.name }) : null;
      })}
    </Helmet>
  );
}
