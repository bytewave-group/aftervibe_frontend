// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// import { createRequire } from "module";

import langConfig from "../../../../langConfig.json";

const langModules = import.meta.glob("../../../lng/*.json", { eager: true });

const supportedLngs = Object.keys(langConfig?.supported);
const resources = {};

// 校验：必须每个 supported 的语言都要有对应 JSON 文件
for (const lng of supportedLngs) {
  const matchedPath = Object.keys(langModules).find((path) =>
    path.endsWith(`/${lng}.json`),
  );

  if (!matchedPath) {
    throw new Error(
      `[i18n] Missing translation file: ./lng/${lng}.json (defined in langConfig.json)`,
    );
  }

  resources[lng] = {
    translation: langModules?.[matchedPath]?.default || {},
  };
}

i18n.use(initReactI18next).init({
  resources,
  lng: langConfig?.default,
  fallbackLng: "en",
  supportedLngs,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
