/**
 * Locale Configuration
 * 
 * Defines all supported locales, countries, and their language variants.
 * Used for the locale switcher and routing.
 */

export const LOCALES = {
  // Italy
  IT_IT: 'it-IT',
  
  // France
  FR_FR: 'fr-FR',
  
  // Spain
  ES_ES: 'es-ES',
  
  // Switzerland (multiple languages)
  CH_FR: 'ch-FR', // Swiss French
  CH_DE: 'ch-DE', // Swiss German
  CH_IT: 'ch-IT', // Swiss Italian
  
  // Portugal
  PT_PT: 'pt-PT',
  
  // United Kingdom
  EN_GB: 'en-GB',
  
  // Germany
  DE_DE: 'de-DE',
  
  // Austria
  AT_DE: 'at-DE', // Austrian German
};

/**
 * Country Configuration
 * Maps countries to their available language options
 */
export const COUNTRIES = {
  IT: {
    code: 'IT',
    name: 'Italy',
    nameTranslationKey: 'LocaleSelector.countryItaly',
    flag: '🇮🇹',
    languages: [LOCALES.IT_IT],
    defaultLocale: LOCALES.IT_IT,
  },
  FR: {
    code: 'FR',
    name: 'France',
    nameTranslationKey: 'LocaleSelector.countryFrance',
    flag: '🇫🇷',
    languages: [LOCALES.FR_FR],
    defaultLocale: LOCALES.FR_FR,
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    nameTranslationKey: 'LocaleSelector.countrySpain',
    flag: '🇪🇸',
    languages: [LOCALES.ES_ES],
    defaultLocale: LOCALES.ES_ES,
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    nameTranslationKey: 'LocaleSelector.countrySwitzerland',
    flag: '🇨🇭',
    languages: [LOCALES.CH_FR, LOCALES.CH_DE, LOCALES.CH_IT],
    defaultLocale: LOCALES.CH_DE, // German is most common
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    nameTranslationKey: 'LocaleSelector.countryPortugal',
    flag: '🇵🇹',
    languages: [LOCALES.PT_PT],
    defaultLocale: LOCALES.PT_PT,
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    nameTranslationKey: 'LocaleSelector.countryUK',
    flag: '🇬🇧',
    languages: [LOCALES.EN_GB],
    defaultLocale: LOCALES.EN_GB,
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    nameTranslationKey: 'LocaleSelector.countryGermany',
    flag: '🇩🇪',
    languages: [LOCALES.DE_DE],
    defaultLocale: LOCALES.DE_DE,
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    nameTranslationKey: 'LocaleSelector.countryAustria',
    flag: '🇦🇹',
    languages: [LOCALES.AT_DE],
    defaultLocale: LOCALES.AT_DE,
  },
};

/**
 * Language Labels
 * Human-readable labels for each locale
 */
export const LANGUAGE_LABELS = {
  [LOCALES.IT_IT]: { native: 'Italiano', english: 'Italian' },
  [LOCALES.FR_FR]: { native: 'Français', english: 'French' },
  [LOCALES.ES_ES]: { native: 'Español', english: 'Spanish' },
  [LOCALES.CH_FR]: { native: 'Français (Suisse)', english: 'French (Swiss)' },
  [LOCALES.CH_DE]: { native: 'Deutsch (Schweiz)', english: 'German (Swiss)' },
  [LOCALES.CH_IT]: { native: 'Italiano (Svizzera)', english: 'Italian (Swiss)' },
  [LOCALES.PT_PT]: { native: 'Português', english: 'Portuguese' },
  [LOCALES.EN_GB]: { native: 'English (UK)', english: 'English (UK)' },
  [LOCALES.DE_DE]: { native: 'Deutsch', english: 'German' },
  [LOCALES.AT_DE]: { native: 'Deutsch (Österreich)', english: 'German (Austrian)' },
};

/**
 * Default Locale
 */
export const DEFAULT_LOCALE = LOCALES.IT_IT;

/**
 * Map moment.js locale codes to our locale format
 */
export const MOMENT_LOCALE_MAP = {
  [LOCALES.IT_IT]: 'it',
  [LOCALES.FR_FR]: 'fr',
  [LOCALES.ES_ES]: 'es',
  [LOCALES.CH_FR]: 'fr-ch',
  [LOCALES.CH_DE]: 'de-ch',
  [LOCALES.CH_IT]: 'it-ch',
  [LOCALES.PT_PT]: 'pt',
  [LOCALES.EN_GB]: 'en-gb',
  [LOCALES.DE_DE]: 'de',
  [LOCALES.AT_DE]: 'de-at',
};

/**
 * Map our locale format to translation file names
 */
export const TRANSLATION_FILE_MAP = {
  [LOCALES.IT_IT]: 'it',
  [LOCALES.FR_FR]: 'fr',
  [LOCALES.ES_ES]: 'es',
  [LOCALES.CH_FR]: 'fr', // Use French translations
  [LOCALES.CH_DE]: 'de', // Use German translations
  [LOCALES.CH_IT]: 'it', // Use Italian translations
  [LOCALES.PT_PT]: 'pt',
  [LOCALES.EN_GB]: 'en',
  [LOCALES.DE_DE]: 'de',
  [LOCALES.AT_DE]: 'de', // Use German translations
};

/**
 * Get country from locale
 * @param {string} locale - Locale code (e.g., 'it-IT', 'ch-FR')
 * @returns {Object|null} Country object
 */
export const getCountryFromLocale = locale => {
  for (const country of Object.values(COUNTRIES)) {
    if (country.languages.includes(locale)) {
      return country;
    }
  }
  return null;
};

/**
 * Convert locale to CMS page suffix
 * Example: 'it-IT' → 'it_it', 'ch-FR' → 'ch_fr'
 * @param {string} locale
 * @returns {string}
 */
export const localeToPageSuffix = locale => {
  return locale.toLowerCase().replace('-', '_');
};

/**
 * Get CMS page ID with locale suffix
 * Example: ('about', 'it-IT') → 'about_it_it'
 * @param {string} pageId - Base page ID
 * @param {string} locale - Locale code
 * @returns {string}
 */
export const getLocalizedPageId = (pageId, locale) => {
  const suffix = localeToPageSuffix(locale);
  return `${pageId}_${suffix}`;
};

/**
 * Parse localized page ID to get base page ID
 * Example: 'about_it_it' → 'about'
 * @param {string} localizedPageId
 * @returns {string}
 */
export const getBasePageId = localizedPageId => {
  // Remove locale suffix (last underscore and everything after)
  const match = localizedPageId.match(/^(.+?)_[a-z]{2}_[a-z]{2}$/i);
  return match ? match[1] : localizedPageId;
};

export default {
  LOCALES,
  COUNTRIES,
  LANGUAGE_LABELS,
  DEFAULT_LOCALE,
  MOMENT_LOCALE_MAP,
  TRANSLATION_FILE_MAP,
  getCountryFromLocale,
  localeToPageSuffix,
  getLocalizedPageId,
  getBasePageId,
};
