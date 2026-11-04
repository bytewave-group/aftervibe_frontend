import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en/translation.json';
import cnTranslations from '../locales/cn/translation.json';
import thaiTranslations from '../locales/thai/translation.json';
import vietTranslations from '../locales/viet/translation.json';
import { Preferences } from '@capacitor/preferences';

const resources = {
  en: {
    translation: enTranslations,
  },
  cn: {
    translation: cnTranslations,
  },
  thai: {
    translation: thaiTranslations,
  },
  viet: {
    translation: vietTranslations,
  },
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Set default language
    fallbackLng: 'en', // Fallback to English if translation missing
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    saveMissing: false,
    defaultNS: 'translation',
    ns: 'translation',
    react: {
      useSuspense: false, // Disable suspense to ensure immediate updates
    },
  });

// Load saved language from Preferences
const loadSavedLanguage = async () => {
  try {
    // Try both preference keys for compatibility
    const { value: languageValue } = await Preferences.get({ key: 'language' });
    const { value: selectedLanguageValue } = await Preferences.get({ key: 'selected_language' });
    
    const savedLanguage = languageValue || selectedLanguageValue;
    
    if (savedLanguage && resources[savedLanguage]) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
};

loadSavedLanguage();

export default i18n;
