import enTranslations from '../locales/en/translation.json';
import cnTranslations from '../locales/cn/translation.json';
import thaiTranslations from '../locales/thai/translation.json';
import vietTranslations from '../locales/viet/translation.json';

const translations = {
  en: enTranslations,
  cn: cnTranslations,
  thai: thaiTranslations,
  viet: vietTranslations,
};

export const getTranslations = (language = 'en') => {
  return translations[language] || translations.en;
};

