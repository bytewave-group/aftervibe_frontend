import { setLanguage } from "@my-common-tool/tool/preferences";
import { validateLanguage } from "@my-common-tool/tool/i18n-init";

export const createUrlWithLanguageParam = (targetWebsite, languageCode) => {
  if (!targetWebsite) return "";

  const targetUrl = new URL(targetWebsite);
  targetUrl.searchParams.set("lng", validateLanguage(languageCode || "en"));

  return targetUrl.toString();
};
