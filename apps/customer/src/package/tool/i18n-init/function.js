import { getI18n } from "react-i18next";
import { setLanguage } from "../preferences";
import { setRecoil } from "recoil-nexus";
import LanguageState from "./LanguageState";
import { show_toast } from "../toast";

import langConfig from "../../../../langConfig.json";

export const validateLanguage = (newLanguage) => {
  const LANGUAGES = langConfig.supported; //all supported language
  const supportedList = Object.keys(LANGUAGES); //lng code list
  const defaultLang = langConfig.default || "en";

  return !supportedList.includes(newLanguage) ? defaultLang : newLanguage;
};

/**
 * Change app language (canonical codes from langConfig: en, cn, zh, ms).
 * @param {string} newLanguage - Requested code; normalized via langConfig
 * @param {function} setDisplayLanguage - Optional function to update displayed language (receives canonical code)
 * @param {function|string|null} recoilUpdater - Optional Recoil updater or value
 * @returns {Promise<boolean>} true if success
 */
export const changeLanguage = async (
  newLanguage,
  setDisplayLanguage = () => {},
  recoilUpdater = null,
  shouldRefresh = true,
) => {
  try {
    const i18n = getI18n();

    if (!i18n) {
      show_toast("Not Ready");
      return;
    }

    const newLang = validateLanguage(newLanguage);
    const currentLang = validateLanguage(i18n.language);

    await setLanguage(newLang);
    setDisplayLanguage(newLang);

    setRecoil(
      LanguageState,
      typeof recoilUpdater === "function" ? recoilUpdater : newLang,
    );

    await i18n.changeLanguage(newLang);

    // Force refresh so all views re-render with the new locale immediately.
    if (
      shouldRefresh &&
      currentLang !== newLang &&
      typeof window !== "undefined"
    ) {
      window.location.reload();
    }

    return true;
  } catch (err) {
    console.error("Failed to change language:", err);
    return false;
  }
};

//? default is language list ,
export const getLanguageMap = (key = "supported") => {
  const map = Object.hasOwn(langConfig, key) ? langConfig?.[key] : {};

  return map;
};

export const getLanguageList = (
  key = "supported",
  { langCodeName = "value", detailName = "label" } = {},
) => {
  const map = Object.hasOwn(langConfig, key) ? langConfig?.[key] : {};

  if (key === "langCode") {
    return Object.keys(langConfig?.supported);
  }

  return Object.entries(map).map(([langCode, value]) => ({
    [detailName]: value,
    [langCodeName]: langCode,
  }));
};

export const getSupportedLanguageCodes = () => {
  return getLanguageList("langCode");
};

export const getLanguageDetail = (langCode = "en", key = "supported") => {
  const validateLangCode = validateLanguage(langCode);
  const map = getLanguageMap(key);

  return map?.[validateLangCode] || "";
};

export const getDefaultLanguage = () => {
  return langConfig.default || "en";
};
