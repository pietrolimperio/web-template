import { getCategoryDisplayName } from './fieldHelpers';

/**
 * SelectMultipleFilter needs to parse values from format
 * "has_all:a,b,c,d" or "a,b,c,d"
 */
export const parseSelectFilterOptions = uriComponentValue => {
  const startsWithHasAll = uriComponentValue && uriComponentValue.indexOf('has_all:') === 0;
  const startsWithHasAny = uriComponentValue && uriComponentValue.indexOf('has_any:') === 0;

  if (startsWithHasAll) {
    return uriComponentValue.substring(8).split(',');
  } else if (startsWithHasAny) {
    return uriComponentValue.substring(8).split(',');
  } else {
    return uriComponentValue.split(',');
  }
};

/**
 * Create the name of the query parameter.
 *
 * @param {String} key Key extracted from listingExtendData config.
 * @param {String} scope Scope extracted from listingExtendData config.
 */
export const constructQueryParamName = (key, scope) => {
  const prefixedKey = scope === 'meta' ? `meta_${key}` : `pub_${key}`;
  return prefixedKey.replace(/\s/g, '_');
};

export const CATEGORY_MULTI_FILTER_PARAM = constructQueryParamName('category', 'public');

export const buildCategorySelectionToken = (levelKey, option) =>
  levelKey && option != null ? `${levelKey}:${option}` : null;

export const parseCategorySelectionToken = token => {
  if (typeof token !== 'string') {
    return null;
  }
  const separatorIndex = token.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return null;
  }
  return {
    levelKey: token.slice(0, separatorIndex),
    option: token.slice(separatorIndex + 1),
  };
};

export const parseCategoryMultiFilter = rawValue => {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return [];
  }

  const seen = new Set();
  return rawValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .filter(value => {
      const parsed = parseCategorySelectionToken(value);
      const isValid = !!parsed;
      if (!isValid || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
};

export const formatCategoryMultiFilter = values => {
  const selectedValues = Array.isArray(values) ? values.filter(Boolean) : [];
  return selectedValues.length > 0 ? selectedValues.join(',') : null;
};

export const getCategorySelectionsFromLegacyParams = (initialValues, queryParamNames = []) => {
  const params = Array.isArray(queryParamNames) ? queryParamNames : [];
  return params.reduce((picked, paramName) => {
    const selectedValue = initialValues?.[paramName];
    const levelKey = `${paramName}`.replace(/^pub_/, '');
    const token = buildCategorySelectionToken(levelKey, selectedValue);
    return token ? [...picked, token] : picked;
  }, []);
};

const traverseCategoryOptions = (options = []) =>
  options.reduce((picked, option) => {
    const nestedOptions = traverseCategoryOptions(option.suboptions);
    return [...picked, option, ...nestedOptions];
  }, []);

export const getAvailableCategorySelectionTokens = (listings = [], options = []) => {
  const optionIndex = traverseCategoryOptions(options).reduce((picked, option) => {
    if (!option?.levelKey || option?.option == null) {
      return picked;
    }

    const valuesForLevel = picked[option.levelKey] || new Set();
    valuesForLevel.add(`${option.option}`);
    return { ...picked, [option.levelKey]: valuesForLevel };
  }, {});

  const availableTokens = listings.reduce((picked, listing) => {
    const publicData = listing?.attributes?.publicData || {};

    Object.entries(optionIndex).forEach(([levelKey, values]) => {
      const currentValue = publicData?.[levelKey];
      const normalizedValue = currentValue != null ? `${currentValue}` : null;

      if (normalizedValue && values.has(normalizedValue)) {
        picked.add(buildCategorySelectionToken(levelKey, normalizedValue));
      }
    });

    return picked;
  }, new Set());

  return Array.from(availableTokens);
};

export const getValidCategorySelectionTokens = (rawValue, options = []) => {
  const validTokens = new Set(
    traverseCategoryOptions(options)
      .map(option => buildCategorySelectionToken(option.levelKey, option.option))
      .filter(Boolean)
  );

  return parseCategoryMultiFilter(rawValue).filter(token => validTokens.has(token));
};

export const filterListingsByCategorySelections = (listings = [], selectionTokens = []) => {
  const parsedTokens = selectionTokens
    .map(token => parseCategorySelectionToken(token))
    .filter(Boolean);

  if (parsedTokens.length === 0) {
    return listings;
  }

  return listings.filter(listing => {
    const publicData = listing?.attributes?.publicData || {};
    return parsedTokens.some(({ levelKey, option }) => `${publicData?.[levelKey]}` === `${option}`);
  });
};

/**
 * Get parameter names for search query. Extract those from config.
 * The configuration of default filters has key, which is 1-on-1 mapping
 * with the name of the query parameter. E.g. 'price'.
 *
 * @param {Object} listingFieldsConfig Custom filters are checked agains extended data config of a listing entity.
 * @param {Object} defaultFiltersConfig Configuration of default filters.
 */
export const getQueryParamNames = (listingFieldsConfig, defaultFiltersConfig) => {
  const queryParamKeysOfDefaultFilters = defaultFiltersConfig.reduce((pickedKeys, config) => {
    const { key, schemaType, scope, nestedParams } = config;
    const newKeys =
      schemaType === 'category' && nestedParams
        ? [CATEGORY_MULTI_FILTER_PARAM, ...nestedParams?.map(p => constructQueryParamName(p, scope))]
        : schemaType === 'listingType'
        ? [constructQueryParamName(key, scope)]
        : [key];
    return [...pickedKeys, ...newKeys];
  }, []);
  const queryParamKeysOfListingFields = listingFieldsConfig.reduce((params, config) => {
    const param = constructQueryParamName(config.key, config.scope);
    return config.filterConfig?.indexForSearch ? [...params, param] : params;
  }, []);
  return [...queryParamKeysOfDefaultFilters, ...queryParamKeysOfListingFields];
};
/**
 * Check if any of the filters (defined by filterKeys) have currently active query parameter in URL.
 */
export const isAnyFilterActive = (filterKeys, urlQueryParams, filterConfigs) => {
  const { listingFieldsConfig, defaultFiltersConfig } = filterConfigs;
  const queryParamKeys = getQueryParamNames(listingFieldsConfig, defaultFiltersConfig);

  const getQueryParamKeysOfGivenFilters = (pickedKeys, key) => {
    const isFilterIncluded = filterKeys.includes(key);
    const addedQueryParamNamesMaybe = isFilterIncluded ? [key] : [];
    return [...pickedKeys, ...addedQueryParamNamesMaybe];
  };
  const queryParamKeysOfGivenFilters = queryParamKeys.reduce(getQueryParamKeysOfGivenFilters, []);

  const paramEntries = Object.entries(urlQueryParams);
  const activeKey = paramEntries.find(entry => {
    const [key, value] = entry;
    return queryParamKeysOfGivenFilters.includes(key) && value != null;
  });
  return !!activeKey;
};

/**
 * Pick initial vales for FieldSelectTree component.
 * The value object should be an object containing search params:
 * { pub_categoryId: 'cats', pub_subcategoryId: 'egyptian-mau', meta_foo: 'bar' }
 *
 * @param {String} prefix like "pub_categoryId"
 * @param {Object} values object literal containing level-specific info
 *
 * @returns returns properties, which have a key that starts with the given prefix.
 */
export const pickInitialValuesForFieldSelectTree = (prefix, values, isNestedEnum) => {
  const pickValuesFn = (picked, entry) => {
    const [key, value] = entry;
    const prefixIndex = key.indexOf(prefix);
    const startsWithPrefix = prefixIndex > -1;
    const slicedKey = isNestedEnum ? key.slice(prefixIndex) : `${key.slice(prefixIndex)}1`;
    return startsWithPrefix ? { ...picked, [slicedKey]: value } : picked;
  };
  const prefixCollection = Object.entries(values).reduce(pickValuesFn, {});
  return prefixCollection;
};

/**
 * This converts the category structure to the format that that's understood by SelectSingleFilter
 * and its child component: FieldSelectTree.
 *
 * @param {Array} categories contain objects with props: _id_, _name_, potentially _subcategories_.
 * @returns an array that contains objects with props: _option_, _label_ and potentially _suboptions_.
 */
export const convertCategoriesToSelectTreeOptions = (
  categories,
  categoryLevelKeys = [],
  shortLocale,
  maxDepth = 2
) => {
  const convertSubcategoryData = (params, level = 1) => {
    const { id, name, subcategories } = params;
    const shouldIncludeSuboptions = Array.isArray(subcategories) && level < maxDepth;
    const suboptionsMaybe = shouldIncludeSuboptions
      ? { suboptions: subcategories.map(cat => convertSubcategoryData(cat, level + 1)) }
      : {};
    const levelKeyMaybe = categoryLevelKeys?.[level - 1]
      ? { levelKey: categoryLevelKeys[level - 1] }
      : {};
    return {
      option: `${id}`,
      label: getCategoryDisplayName({ id, name, translations: params.translations }, shortLocale),
      ...levelKeyMaybe,
      ...suboptionsMaybe,
    };
  };

  const categoriesArray = Array.isArray(categories) ? categories : [];
  return categoriesArray.map(cat => convertSubcategoryData(cat));
};

/**
 * Check if the main search type is 'keywords'
 */
export const isMainSearchTypeKeywords = config =>
  config.search?.mainSearch?.searchType === 'keywords';

/**
 * Check if the origin parameter is currently active.
 */
export const isOriginInUse = config =>
  config.search?.mainSearch?.searchType === 'location' && config.maps?.search?.sortSearchByDistance;

/**
 * Check if the stock management is currently active.
 */
export const isStockInUse = config => {
  const listingTypes = config.listing.listingTypes;
  const stockProcesses = ['default-purchase'];
  const hasStockProcessesInUse = !!listingTypes.find(conf =>
    stockProcesses.includes(conf.transactionType.process)
  );

  // Note: these are active processes!
  return hasStockProcessesInUse;
};
