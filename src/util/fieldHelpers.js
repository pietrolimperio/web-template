// This util file is about user and listing fields.
// I.e. These are custom fields to data entities. They are added through the Marketplace Console.
// In the codebase, we also have React Final Form fields, which are wrapper around user inputs.

import {
  isPurchaseProcessAlias,
  isBookingProcessAlias,
  isNegotiationProcessAlias,
} from '../transactions/transaction';
import { SCHEMA_TYPE_MULTI_ENUM, SCHEMA_TYPE_TEXT, SCHEMA_TYPE_YOUTUBE } from './types';
import appSettings from '../config/settings';

const { stripeSupportedCurrencies, subUnitDivisors } = appSettings;

const keyMapping = {
  userType: {
    wrapper: 'userTypeConfig',
    limitTo: 'limitToUserTypeIds',
    ids: 'userTypeIds',
  },
  listingType: {
    wrapper: 'listingTypeConfig',
    limitTo: 'limitToListingTypeIds',
    ids: 'listingTypeIds',
  },
  category: {
    wrapper: 'categoryConfig',
    limitTo: 'limitToCategoryIds',
    ids: 'categoryIds',
  },
};

const getEntityTypeRestrictions = (entityTypeKey, config) => {
  const { wrapper, limitTo, ids } = keyMapping[entityTypeKey];
  const isLimited = config && config[wrapper] && config[wrapper][limitTo];
  const limitToIds = config && config[wrapper] && config[wrapper][ids];

  return { isLimited, limitToIds };
};

/**
 * Check if the given listing type is allowed according to the given listing field config.
 *
 * @param {String} entityTypeKey entity type key (e.g. 'listingType', 'userType')
 * @param {String|Array<String>} entityType entity type to be checked (e.g. 'amenities'). Accepts an array too.
 * @param {*} fieldConfig the config of a custom listing field
 * @returns true if listingTypeConfig allows the listingType
 */
export const isFieldFor = (entityTypeKey, entityType, fieldConfig) => {
  const { isLimited, limitToIds } = getEntityTypeRestrictions(entityTypeKey, fieldConfig);

  if (Array.isArray(entityType)) {
    return !isLimited || limitToIds.some(cid => entityType.includes(cid));
  }
  return !isLimited || limitToIds.includes(entityType);
};

export const isFieldForUserType = (userType, fieldConfig) =>
  isFieldFor('userType', userType, fieldConfig);
export const isFieldForListingType = (listingType, fieldConfig) =>
  isFieldFor('listingType', listingType, fieldConfig);
export const isFieldForCategory = (categories, fieldConfig) =>
  isFieldFor('category', categories, fieldConfig);

/**
 * Returns the value of the attribute in extended data.
 * @param {*} data extended data containing the value
 * @param {*} key attribute key in extended data
 * @returns
 */
export const getFieldValue = (data, key) => {
  const value = data?.[key];
  return value != null ? value : null;
};

/**
 * Picks current values for listing categories based on provided public data and configuration.
 * This function validates if the initial values match with the configuration received via assets.
 * If a categoryLevel value doesn't match with the category configuration, it is not passed on to the form.
 *
 * @param {*} data publicData or some other set where category-related nested data is available
 * @param {String} prefix prefix used for storing nested values.
 * @param {Number} level refers to nesting level (starts from 1)
 * @param {Array} categoryLevelOptions array of nested category structure
 * @returns pick valid prefixed properties
 */
export const pickCategoryFields = (data, prefix, level, categoryLevelOptions = []) => {
  const currentCategoryKey = `${prefix}${level}`;
  const currentCategoryValue = data[currentCategoryKey];
  const isCategoryLevelSet = typeof currentCategoryValue !== 'undefined';

  // Validate the value against category options
  const categoryOptionConfig = categoryLevelOptions.find(
    category => category.id === currentCategoryValue
  );
  const isValidCategoryValue = !!categoryOptionConfig;
  const nextLevelOptions = categoryOptionConfig?.subcategories || [];

  // Return category level property if it's found from the data and the value is one of the valid options.
  // Go through all the nested levels.
  return isCategoryLevelSet && isValidCategoryValue
    ? {
        [currentCategoryKey]: currentCategoryValue,
        ...pickCategoryFields(data, prefix, ++level, nextLevelOptions),
      }
    : {};
};

/**
 * Short locale (e.g. 'it', 'en') for category display. Prefers user-selected language (localStorage),
 * then config, then intl, then default 'en'.
 * @param {Object} [config] - from useConfiguration()
 * @param {string} [intlLocale] - from useIntl().locale
 * @returns {string}
 */
export const getShortLocaleForCategoryDisplay = (config, intlLocale) => {
  const currentLocale =
    (typeof localStorage !== 'undefined' && localStorage.getItem('marketplace_locale')) ||
    config?.localization?.locale ||
    intlLocale ||
    'it';
  return currentLocale.split('-')[0] || 'en';
};

/**
 * Display name for a category entry: use translations[locale] if available, else name (base name for storage).
 * @param {Object} entry - { name, translations?: { en?, it?, fr?, ... } }
 * @param {string} shortLocale - e.g. 'it', 'en', 'fr'
 * @returns {string}
 */
export const getCategoryDisplayName = (entry, shortLocale) => {
  if (!entry) return '';
  const t = entry.translations;
  const translated = t && shortLocale && t[shortLocale];
  if (typeof translated === 'string' && translated.trim() !== '') return translated.trim();
  return entry.name ?? '';
};

/**
 * Resolve category IDs to localized names using the given categories tree (from config).
 * Uses translations[shortLocale] for display when API returns includeTranslations=1; otherwise name.
 *
 * @param {Array} categories - categoryConfiguration.categories (id, name, translations?, subcategories)
 * @param {number|string} id1 - categoryLevel1 or categoryId
 * @param {number|string} [id2] - categoryLevel2 or subcategoryId
 * @param {number|string} [id3] - categoryLevel3 or thirdCategoryId
 * @param {string} [shortLocale] - e.g. 'it', 'en' for display language
 * @returns {{ category: string|null, subcategory: string|null, thirdCategory: string|null }}
 */
export const getCategoryNamesFromIds = (categories, id1, id2, id3, shortLocale) => {
  const out = { category: null, subcategory: null, thirdCategory: null };
  if (!categories?.length || id1 == null) return out;
  const matchId = (a, b) => a == null || b == null || Number(a) === Number(b) || a === b;
  const cat1 = categories.find(c => matchId(c.id, id1));
  if (!cat1) return out;
  out.category = getCategoryDisplayName(cat1, shortLocale) || null;
  if (id2 == null) return out;
  const cat2 = cat1.subcategories?.find(s => matchId(s.id, id2));
  if (!cat2) return out;
  out.subcategory = getCategoryDisplayName(cat2, shortLocale) || null;
  if (id3 == null) return out;
  const cat3 = cat2.subcategories?.find(s => matchId(s.id, id3));
  if (!cat3) return out;
  out.thirdCategory = getCategoryDisplayName(cat3, shortLocale) || null;
  return out;
};

/**
 * Pick props for SectionMultiEnumMaybe and SectionTextMaybe display components.
 *
 * @param {*} publicData entity public data containing the value(s) to be displayed
 * @param {*} metadata entity metadata containing the value(s) to be displayed
 * @param {Array<Object>} fieldConfigs array of custom field configuration objects
 * @param {String} entityTypeKey the name of the key denoting the entity type in publicData.
 * E.g. 'listingType', 'userType', or 'category'
 * @param {function} shouldPickFn an optional function to add extra check before including the field props
 * @returns an object with attributes 'schemaType', 'key', and 'heading', as well as either
 * - 'options' and 'selectedOptions' for SCHEMA_TYPE_MULTI_ENUM
 * - or 'text' for SCHEMA_TYPE_TEXT
 */
export const pickCustomFieldProps = (
  publicData,
  metadata,
  fieldConfigs,
  entityTypeKey,
  shouldPickFn
) => {
  return fieldConfigs?.reduce((pickedElements, config) => {
    const { key, enumOptions, schemaType, scope = 'public', showConfig } = config;
    const { label, unselectedOptions: showUnselectedOptions } = showConfig || {};
    const entityType = publicData && publicData[entityTypeKey];
    const isTargetEntityType = isFieldFor(entityTypeKey, entityType, config);

    const createFilterOptions = options =>
      options.map(o => ({ key: `${o.option}`, label: o.label }));

    const shouldPick = shouldPickFn ? shouldPickFn(config) : true;

    const value =
      scope === 'public'
        ? getFieldValue(publicData, key)
        : scope === 'metadata'
        ? getFieldValue(metadata, key)
        : null;

    return isTargetEntityType && schemaType === SCHEMA_TYPE_MULTI_ENUM && shouldPick
      ? [
          ...pickedElements,
          {
            schemaType,
            key,
            heading: label,
            options: createFilterOptions(enumOptions),
            selectedOptions: value || [],
            showUnselectedOptions: showUnselectedOptions !== false,
          },
        ]
      : isTargetEntityType && !!value && config.schemaType === SCHEMA_TYPE_TEXT && shouldPick
      ? [
          ...pickedElements,
          {
            schemaType,
            key,
            heading: label,
            text: value,
          },
        ]
      : isTargetEntityType && schemaType === SCHEMA_TYPE_YOUTUBE && shouldPick
      ? [
          ...pickedElements,
          {
            schemaType,
            key,
            videoUrl: value,
            heading: label,
          },
        ]
      : pickedElements;
  }, []);
};

/**
 * Validates if the specified currency is compatible with the transaction process
 * and the payment processor being used.
 *
 * @param {string} transactionProcessAlias - The alias of the transaction process. Expected to be in the format
 *                               of "PROCESS_NAME/version" (e.g., "booking-default/release-1").
 * @param {string} listingCurrency - A currency code (e.g., "USD", "EUR").
 * @param {string|null} paymentProcessor - (Optional) The name of the payment processor, such as "stripe".
 *                                         Defaults to null if no payment processor is specified.
 *
 * @returns {boolean} - Returns true if the currency is valid for the specified transaction process
 *                      and payment processor, otherwise false.
 *
 * Notes:
 * - The function checks if the specified currency is compatible with Stripe (for booking or purchase processes).
 * - Stripe only supports certain currencies. You can use other currencies on your marketplace for transactions that
 * - don't utilise Stripe. This function performs a check that the currency and transaction process provided are compatible
 * - with each other.
 * - When the paymentProcessor flag is passed as null, this function ensures either:
 *    a) the currency is listed in the subUnitDivisors list (in settingsCurrency.js)
 *    b) The process is Stripe-compatible with a Stripe-supported currency.
 */
export const isValidCurrencyForTransactionProcess = (
  transactionProcessAlias,
  listingCurrency,
  paymentProcessor = null
) => {
  // booking and purchase processes use Stripe actions.
  const isStripeRelatedProcess =
    isPurchaseProcessAlias(transactionProcessAlias) ||
    isBookingProcessAlias(transactionProcessAlias) ||
    isNegotiationProcessAlias(transactionProcessAlias);

  // Determine if the listing currency is supported by Stripe
  const isStripeSupportedCurrency = stripeSupportedCurrencies.includes(listingCurrency);

  if (paymentProcessor === 'stripe') {
    // If using Stripe, only return true if both process and currency are compatible with Stripe
    return isStripeRelatedProcess && isStripeSupportedCurrency;
  } else if (paymentProcessor === null) {
    // If payment processor is not specified, allow any non-stripe related process with valid subunits or Stripe-related processes with supported currency
    return (
      (isStripeRelatedProcess && isStripeSupportedCurrency) ||
      (!isStripeRelatedProcess && Object.keys(subUnitDivisors).includes(listingCurrency))
    );
  }
};
