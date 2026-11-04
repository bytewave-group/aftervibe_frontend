import { useTranslation as useI18nextTranslation } from 'react-i18next';

// Custom hook that ensures missing keys return the key itself
// The useTranslation hook from react-i18next automatically triggers re-renders
// when the language changes, so we don't need to manually track language state
export const useTranslation = () => {
  // This hook automatically subscribes to language changes and triggers re-renders
  const { t: originalT, i18n, ready, ...rest } = useI18nextTranslation();

  // Wrap the t function to return key when translation is missing
  // Note: This wrapper doesn't interfere with re-rendering because originalT
  // is already reactive to language changes
  const t = (key, options) => {
    if (!key) return '';
    
    const result = originalT(key, options);
    
    // If translation is missing, i18next returns something like "translation:key" or just returns the key
    // We want to ensure it returns just the key itself
    if (typeof result === 'string') {
      // i18next may prefix missing keys with "translation:" — strip only that prefix
      if (result.startsWith('translation:')) {
        const withoutNamespace = result.slice('translation:'.length);
        return withoutNamespace || key;
      }

      // If result is the same as key (with or without namespace), it's missing - return key
      if (result === key || result === `translation:${key}`) {
        return key;
      }
      
      // If result exists and is different from key, it's a valid translation
      if (result && result !== key) {
        return result;
      }
    }
    
    // If result is empty, null, undefined, or anything else, return the key
    if (!result || result === '') {
      return key;
    }
    
    return result;
  };

  return { t, i18n, ready, ...rest };
};

