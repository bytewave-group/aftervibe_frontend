import langConfig from "../../../../langConfig.json";
import { initReactI18next, useTranslation } from "react-i18next";
import { f7 } from "framework7-react";
import { useEffect, useMemo, useState } from "react";
import { setRecoil } from "recoil-nexus";

import { show_toast } from "../toast";
import LanguageState from "./LanguageState";
import { validateLanguage } from "./function";
import { getLanguage, setLanguage } from "../preferences";

export default function useI18nInit() {
  const { i18n, t } = useTranslation();
  const [isReady, setIsReady] = useState(false);

  const langModules = import.meta.glob("./../../lng/*.json", { eager: true });

  const supportedLngs = Object.keys(langConfig.supported);

  const resources = useMemo(() => {
    let resource = {};
    for (const lng of supportedLngs) {
      const matchedPath = Object.keys(langModules).find((path) =>
        path.endsWith(`/${lng}.json`),
      );

      if (!matchedPath) {
        show_toast(
          `[i18n] Missing translation file: ./lng/${lng}.json (defined in langConfig.json)`,
        );
      }

      resource[lng] = {
        translation: langModules?.[matchedPath]?.default,
      };
    }

    return resource;
  }, []);

  //init i18n and translate f7 button
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        const store_language = await getLanguage();
        const validated = validateLanguage(
          store_language ?? langConfig.default,
        );

        if (store_language !== validated && !!validated) {
          await setLanguage(validated);
        }

        setRecoil(LanguageState, validated);

        if (!i18n.isInitialized) {
          await i18n.use(initReactI18next).init({
            resources,
            lng: validated,
            fallbackLng: "en",
            supportedLngs,
            interpolation: {
              escapeValue: false,
            },
            debug: import.meta.env.DEV,
          });
        } else {
          // 已初始化，只切换语言
          await i18n.changeLanguage(validated);
        }

        setIsReady(true);

        if (f7?.params?.dialog) {
          f7.params.dialog.buttonOk = t("Confirm");
          f7.params.dialog.buttonCancel = t("Cancel");
        }
      } catch (error) {}
    };

    initializeI18n();
  }, []);

  return { isReady };
}
