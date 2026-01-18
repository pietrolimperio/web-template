// Convert kebab-case to camelCase: my-page-asset > myPageAsset
export const camelize = s => s.replace(/-(.)/g, l => l[1].toUpperCase());

export const extractYouTubeID = url => {
  const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = url ? url.match(regExp) : null;

  return match ? match[1] : null;
};

/**
 * Converts a category name to camelCase format used in translation keys.
 * Example: "Storage Unit" -> "storageUnit", "Construction Equipment & Tools" -> "constructionEquipment&Tools"
 * 
 * @param {string} categoryName - The category name to convert
 * @returns {string} The camelCase formatted category name
 */
export const categoryNameToCamelCase = categoryName => {
  if (!categoryName) return '';
  
  // Split by spaces and filter empty strings
  const parts = categoryName.split(/\s+/).filter(part => part.length > 0);
  
  if (parts.length === 0) return '';
  
  // First part: lowercase all
  let result = parts[0].toLowerCase();
  
  // Remaining parts: capitalize first letter of each word
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.length === 0) continue;
    
    // Find first letter in the part (might have special chars before it)
    const firstLetterIndex = part.search(/[a-zA-Z]/);
    
    if (firstLetterIndex === -1) {
      // No letters, just append special chars as-is
      result += part;
    } else {
      // Capitalize first letter, keep rest as-is
      const before = part.substring(0, firstLetterIndex);
      const firstLetter = part[firstLetterIndex].toUpperCase();
      const after = part.substring(firstLetterIndex + 1);
      result += before + firstLetter + after;
    }
  }
  
  return result;
};

/**
 * Gets the localized category name from translation files.
 * Uses the pattern "Categories.{camelCaseCategoryName}" to find the translation key.
 * 
 * @param {Object} intl - The intl object from react-intl (useIntl hook or injectIntl)
 * @param {string} categoryName - The category name to translate
 * @returns {string} The localized category name, or the original name if translation not found
 */
export const getLocalizedCategoryName = (intl, categoryName) => {
  if (!categoryName || !intl) return categoryName || '';
  
  const camelCaseKey = categoryNameToCamelCase(categoryName);
  const translationKey = `Categories.${camelCaseKey}`;
  
  try {
    const translated = intl.formatMessage({ id: translationKey }, {});
    // If formatMessage returns the key itself, it means translation was not found
    if (translated === translationKey) {
      return categoryName;
    }
    return translated;
  } catch (error) {
    // If translation key doesn't exist, return original name
    return categoryName;
  }
};
