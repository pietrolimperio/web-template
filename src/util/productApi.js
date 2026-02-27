/**
 * Product Analysis API Client
 * Interfaces with AI-powered product analysis backend
 */

import { DEFAULT_LOCALE as APP_DEFAULT_LOCALE } from '../config/localeConfig';
import devLog from './devLog';

const PRODUCT_API_BASE_URL =
process.env.REACT_APP_PRODUCT_API_URL || 'http://localhost:3001/api';
const DEFAULT_MODELS = ['gemini-2.5-flash', 'claude-4.5-sonnet'];
//const DEFAULT_MODELS =['gemini-2.5-flash','gemini-2.5-pro','gemini-3-flash-preview','gemini-2.5-flash-lite','claude-4.5-sonnet','claude-3-haiku','gpt-5.2','gpt-5.2-mini','grok-4-fast-reasoning','sonar-pro','sonar-reasoning'];
const DEFAULT_PROMPT_VERSION = 'v3';

/** Key for Product API token in localStorage (used when backend persists session) */
const PRODUCT_API_TOKEN_KEY = 'product_api_session_token';

/**
 * Clears Product API session/token from memory and localStorage.
 * Call this when you get "Invalid or expired session" (e.g. after backend restart)
 * to start fresh. Also exported for manual use: import { clearProductApiToken } from 'util/productApi'
 */
export function clearProductApiToken() {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(PRODUCT_API_TOKEN_KEY);
    devLog('🧹 [Product API] Cleared token from localStorage');
  }
}

/**
 * Product API Client Class
 */
class ProductAPI {
  constructor() {
    this.baseURL = PRODUCT_API_BASE_URL;
    this.models = [...DEFAULT_MODELS];
    this.model = DEFAULT_MODELS[0]; // Default model for other methods (refine, regenerate, etc.)
    /** @type {string | null} Token anonimo per API AI (solo in memoria, non in localStorage) */
    this.anonToken = null;
    // Get current locale from localStorage (default: it-IT)
    // Safe for server-side rendering: check if localStorage is available
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.locale = localStorage.getItem('marketplace_locale') || APP_DEFAULT_LOCALE;
    } else {
      this.locale = APP_DEFAULT_LOCALE;
    }
  }

  /**
   * Ottiene un token anonimo dal backend (GET /api/session) se non già presente in memoria.
   * Usato per autenticare le chiamate alle API AI senza richiedere login.
   * @private
   */
  async ensureToken() {
    if (this.anonToken) return;
    const sessionURL = `${this.baseURL}/session`;
    devLog('🔑 [Product API] Fetching anonymous token from /session');
    const response = await fetch(sessionURL, { method: 'GET' });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to get session token: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    if (!data?.token) {
      throw new Error('Session response missing token');
    }
    this.anonToken = data.token;
    devLog('🔑 [Product API] Token obtained');
  }

  /**
   * Analyze product images and get structured data
   * Tries models in order, falling back to next model on error
   * @param {File[]} images - Array of image files (1-10)
   * @param {string} locale - Language locale (it-IT, fr-FR, es-ES, etc.) - defaults to current locale
   * @param {string} promptVersion
   * @returns {Promise<ProductAnalysis>}
   */
  async analyze(images, locale = this.locale, promptVersion = DEFAULT_PROMPT_VERSION) {
    if (!images || images.length === 0) {
      throw new Error('At least one image is required');
    }

    if (images.length > 10) {
      throw new Error('Maximum 10 images allowed');
    }

    // Validate all images first
    images.forEach(img => {
      if (!this.isValidImage(img)) {
        throw new Error(
          `Invalid image: ${img.name}. Must be JPG, PNG, WebP, or HEIF and under 5MB`
        );
      }
    });

    // Try each model in order until one succeeds
    let lastError = null;
    for (const model of this.models) {
      try {
        const formData = new FormData();
        images.forEach(img => formData.append('images', img));
        formData.append('model', model);
        formData.append('locale', locale);
        formData.append('promptVersion', promptVersion);

        const result = await this.call('analyze', formData);
        // Save the successful model for subsequent calls (refine, regenerate, etc.)
        this.model = model;
        console.log(`✅ [Product API] Successfully used model: ${model}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ [Product API] Model ${model} failed, trying next model...`, error.message);
        // Continue to next model
      }
    }

    // All models failed, throw the last error
    console.error('❌ [Product API] All models failed');
    throw lastError;
  }

  /**
   * Refine product analysis with user answers
   * @param {Object} params - Refinement parameters
   * @param {Object} params.previousAnalysis - Previous analysis result
   * @param {Object} params.answers - User answers to clarification questions
   * @param {string} params.locale - Language locale (e.g., "en-US")
   * @param {number} params.totalQuestionsAsked - Total questions asked so far
   * @param {number} params.roundNumber - Current refinement round
   * @param {string} params.promptVersion
   * @returns {Promise<ProductAnalysis>}
   */
  async refine({ previousAnalysis, answers, locale = this.locale, totalQuestionsAsked, roundNumber, promptVersion = DEFAULT_PROMPT_VERSION }) {
    return await this.call('refine', {
      previousAnalysis,
      answers,
      locale,
      model: this.model,
      totalQuestionsAsked,
      roundNumber,
      promptVersion,
    });
  }

  /**
   * Regenerate a specific field
   * @param {Object} productAnalysis - Current analysis
   * @param {string} fieldName - Field to regenerate
   * @param {string} locale - Language locale (default: current locale)
   * @param {string} promptVersion
   * @returns {Promise<{fieldName: string, newValue: any}>}
   */
  async regenerate(productAnalysis, fieldName, locale = this.locale, promptVersion = DEFAULT_PROMPT_VERSION) {
    return await this.call('regenerate-field', {
      productAnalysis,
      fieldName,
      locale,
      model: this.model,
      promptVersion,
    });
  }

  /**
   * Translate product fields to another language
   * @param {Object} fields - Product fields to translate
   * @param {string} fromLocale - Source locale
   * @param {string} toLocale - Target locale
   * @param {string} category - Product category
   * @param {string} promptVersion
   * @returns {Promise<Object>}
   */
  async translate(fields, fromLocale, toLocale, category, promptVersion = DEFAULT_PROMPT_VERSION) {
    return await this.call('translate-fields', {
      fields,
      fromLocale,
      toLocale,
      category,
      model: this.model,
      promptVersion,
    });
  }

  /**
   * Get similar product recommendation
   * @param {Object} productAnalysis - Product analysis
   * @returns {Promise<Object>}
   */
  async recommend(productAnalysis) {
    return await this.call('recommended-product', {
      productAnalysis,
      model: this.model,
    });
  }

  /**
   * Verify if changes to a product are still consistent with original category classification
   * @param {Object} original - Original product snapshot before modifications
   * @param {Object} newSnapshot - New product snapshot after modifications
   * @param {string} locale - Locale code (default: current locale)
   * @param {string} model - AI model to use (default: current model)
   * @param {File[]} images - Optional array of product images (max 10 files, max 4MB per file)
   * @param {string} promptVersion
   * @returns {Promise<Object>} Verification result with confidence scores and isValid flag
   */
  async verifyChanges(
    original,
    newSnapshot,
    locale = this.locale,
    model = this.model,
    images = null,
    promptVersion = DEFAULT_PROMPT_VERSION
  ) {
    // If images are provided, use FormData; otherwise use JSON
    if (images && images.length > 0) {
      // Validate images
      if (images.length > 10) {
        throw new Error('Maximum 10 images allowed');
      }

      images.forEach(img => {
        if (!this.isValidImage(img)) {
          throw new Error(
            `Invalid image: ${img.name}. Must be JPG, PNG, WebP, or HEIF and under 4MB`
          );
        }
        // Check 4MB limit for verify-changes
        const maxSize = 4 * 1024 * 1024; // 4MB
        if (img.size > maxSize) {
          throw new Error(`Image ${img.name} exceeds 4MB limit`);
        }
      });

      const formData = new FormData();
      
      // Append JSON data FIRST (before images) - some servers parse FormData in order
      const originalStr = JSON.stringify(original);
      const newStr = JSON.stringify(newSnapshot);
       
      // Append JSON fields as plain strings
      // Some servers can't read Blob fields when files are present, so use plain strings
      formData.append('original', originalStr);
      formData.append('new', newStr);
      formData.append('locale', locale);
      formData.append('model', model);
      formData.append('promptVersion', promptVersion);
      
      // Append images AFTER JSON fields
      images.forEach((img, index) => {
        formData.append('images', img);
      });

      // Collect FormData entries (iterating over entries() consumes the FormData)
      const formDataEntries = [];
      for (const [key, value] of formData.entries()) {
        formDataEntries.push([key, value]);
      }
      
      // Recreate FormData with all entries in the same order
      const formDataToSend = new FormData();
      for (const [key, value] of formDataEntries) {
        formDataToSend.append(key, value);
      }
      
      return await this.call('verify-changes', formDataToSend);
    } else {
      // No images, use JSON format (backward compatible)
      const payload = {
        original,
        new: newSnapshot,
        locale,
        model,
        promptVersion
      };
      
      return await this.call('verify-changes', payload);
    }
  }

  /**
   * Internal API call method
   * @private
   * @param {string} endpoint - Endpoint path (analyze, refine, etc.)
   * @param {FormData | Object} payload - Request body
   * @param {boolean} isRetry - True se è un retry dopo 401
   */
  async call(endpoint, payload, isRetry = false) {
    const isFormData = payload instanceof FormData;
    const fullURL = `${this.baseURL}/${endpoint}`;

    // Ottieni token anonimo prima di ogni richiesta AI (tranne /session, che non passa da call)
    await this.ensureToken();

    const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
    if (this.anonToken) {
      headers['Authorization'] = `Bearer ${this.anonToken}`;
    }

    // Debug logging
    devLog('🔍 [Product API] Calling:', fullURL);
    devLog('📦 [Product API] Payload type:', isFormData ? 'FormData' : 'JSON');
    devLog('🌐 [Product API] Base URL:', this.baseURL);

    try {
      const requestOptions = {
        method: 'POST',
        headers,
        body: isFormData ? payload : JSON.stringify(payload),
      };
      if (isFormData && payload instanceof FormData) {
        const formDataKeys = Array.from(payload.keys());
        // Try to get values for non-file fields (this won't work for files)
        for (const key of formDataKeys) {
          const value = payload.get(key);
          if (value instanceof File) {
          } else {
            const preview = typeof value === 'string' && value.length > 150 
              ? value.substring(0, 150) + '...' 
              : value;
          }
        }
      } else {
        const bodyPreview = typeof requestOptions.body === 'string' 
          ? (requestOptions.body.length > 500 
              ? requestOptions.body.substring(0, 500) + '...' 
              : requestOptions.body)
          : 'N/A';
      }

      const response = await fetch(fullURL, requestOptions);

      console.log('📡 [Product API] Response status:', response.status, response.statusText);

      // 401: token scaduto – azzera, pulisci localStorage, riprova una sola volta
      if (response.status === 401 && !isRetry) {
        clearProductApiToken();
        this.anonToken = null;
        devLog('🔑 [Product API] 401 – token expired, clearing and retrying');
        return this.call(endpoint, payload, true);
      }

      if (!response.ok) {
        let errorMessage;
        let errorCode = null;
        try {
          const error = await response.json();
          console.error('❌ Error', error);
          errorMessage =
            error.error || error.message || `API call failed with status ${response.status}`;
          // Check for PROHIBITED_CATEGORY error code
          if (response.status === 403 && error.errorCode === 'PROHIBITED_CATEGORY') {
            errorCode = 'PROHIBITED_CATEGORY';
          }
        } catch {
          errorMessage = `API call failed with status ${response.status} - ${response.statusText}`;
        }

        // Invalid/expired session (e.g. backend restarted) – clear token and retry once
        const isSessionError =
          /invalid or expired session|invalid.*expired.*session/i.test(errorMessage);
        if (isSessionError && !isRetry) {
          clearProductApiToken();
          this.anonToken = null;
          devLog('🔑 [Product API] Session invalid/expired, clearing token and retrying');
          return this.call(endpoint, payload, true);
        }

        console.error('❌ [Product API] Error response:', errorMessage);
        const apiError = new Error(errorMessage);
        if (errorCode) {
          apiError.errorCode = errorCode;
        }
        throw apiError;
      }

      const data = await response.json();
      devLog('✅ [Product API] Success:', data);
      return data;
    } catch (error) {
      console.error(`❌ [Product API Error - ${endpoint}]:`, error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  /**
   * Optimize image for use as thumbnail (light background, improved visibility, contrast).
   * POST /optimize-image with multipart/form-data.
   *
   * @param {File|Blob} image - Product image file
   * @param {string} category - Listing category (e.g. "Construction Equipment & Tools", "Electronics", "Home")
   * @param {string} [model] - gemini-2.5-flash-image (default) or gemini-3-pro-image-preview
   * @returns {Promise<{ data: string, mimeType: string }>} Base64-encoded image and mimeType
   */
  async optimizeImage(image, category, model = 'gemini-2.5-flash-image') {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('category', category || 'Other');
    formData.append('model', model);
    return await this.call('optimize-image', formData);
  }

  /**
   * Validate image file
   * Note: Sharetribe only accepts PNG and JPEG formats
   * @private
   */
  isValidImage(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heif'];
    const maxSize = 5 * 1024 * 1024; // 5MB (for analyze endpoint)

    return validTypes.includes(file.type) && file.size <= maxSize;
  }
}

/**
 * Convert image entity to File object by downloading from URL
 * @param {Object} imageEntity - Image entity with variants
 * @returns {Promise<File>} File object
 */
/**
 * Convert base64 data to File for Sharetribe upload
 * @param {string} base64Data - Base64-encoded image string
 * @param {string} mimeType - e.g. "image/png"
 * @returns {File}
 */
export const base64ToFile = (base64Data, mimeType = 'image/png') => {
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  const ext = mimeType.split('/')[1] || 'png';
  return new File([blob], `thumbnail-${Date.now()}.${ext}`, { type: mimeType });
};

export const imageEntityToFile = async (imageEntity) => {
  if (!imageEntity || !imageEntity.attributes || !imageEntity.attributes.variants) {
    throw new Error('Invalid image entity');
  }

  const variants = imageEntity.attributes.variants;
  
  // Find the largest variant available (prefer scaled-large, scaled-xlarge, or largest by width)
  const variantNames = Object.keys(variants);
  let bestVariant = null;
  let maxWidth = 0;

  // Priority order: scaled-xlarge > scaled-large > scaled-medium > scaled-small > others
  const priorityOrder = ['scaled-xlarge', 'scaled-large', 'scaled-medium', 'scaled-small'];
  
  for (const priorityName of priorityOrder) {
    if (variants[priorityName]) {
      bestVariant = variants[priorityName];
      break;
    }
  }

  // If no priority variant found, use the one with largest width
  if (!bestVariant) {
    for (const variantName of variantNames) {
      const variant = variants[variantName];
      if (variant && variant.width && variant.width > maxWidth) {
        maxWidth = variant.width;
        bestVariant = variant;
      }
    }
  }

  // Fallback to first available variant
  if (!bestVariant && variantNames.length > 0) {
    bestVariant = variants[variantNames[0]];
  }

  if (!bestVariant || !bestVariant.url) {
    throw new Error('No valid image variant found');
  }

  // Download image from URL
  const response = await fetch(bestVariant.url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const blob = await response.blob();
  
  // Determine file extension from content type or URL
  let extension = 'jpg';
  const contentType = response.headers.get('content-type');
  if (contentType) {
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
    else if (contentType.includes('webp')) extension = 'webp';
  } else {
    // Try to get from URL
    const urlMatch = bestVariant.url.match(/\.(jpg|jpeg|png|webp)/i);
    if (urlMatch) {
      extension = urlMatch[1].toLowerCase();
    }
  }

  // Create File object
  const fileName = `image-${Date.now()}.${extension}`;
  const file = new File([blob], fileName, { type: blob.type || `image/${extension === 'jpg' ? 'jpeg' : extension}` });

  return file;
};

/**
 * Convert array of image entities to File objects
 * @param {Object[]} imageEntities - Array of image entities
 * @returns {Promise<File[]>} Array of File objects
 */
export const imageEntitiesToFiles = async (imageEntities) => {
  if (!imageEntities || !Array.isArray(imageEntities) || imageEntities.length === 0) {
    return [];
  }

  // Limit to 10 images
  const limitedImages = imageEntities.slice(0, 10);
  
  // Convert all images in parallel
  const filePromises = limitedImages.map(img => imageEntityToFile(img));
  const files = await Promise.all(filePromises);
  
  return files;
};

// Singleton instance
const productApiInstance = new ProductAPI();

/**
 * Map Product API response to Sharetribe listing format
 * @param {Object} productAnalysis - Product analysis from API
 * @param {Object} config - Marketplace config
 * @returns {Object} Sharetribe-compatible listing data
 */
export const mapProductToListingData = (productAnalysis, config) => {
  const {
    fields,
    category,
    subcategory,
    thirdCategory,
    categoryId,
    subcategoryId,
    thirdCategoryId,
    calendarAvailability,
  } = productAnalysis;

  // Normalize condition to always use English values
  const normalizeCondition = (conditionValue) => {
    if (!conditionValue) return 'Used';
    const normalized = String(conditionValue).trim();
    // Map common variations to standard English values
    const conditionMap = {
      'new': 'New',
      'like new': 'Like New',
      'like-new': 'Like New',
      'likenew': 'Like New',
      'used': 'Used',
      'refurbished': 'Refurbished',
      'refurb': 'Refurbished',
    };
    const lowerNormalized = normalized.toLowerCase();
    return conditionMap[lowerNormalized] || normalized;
  };

  // Normalize brand: always include it in publicData, even if "N/A"
  const normalizeBrand = (brandValue) => {
    if (!brandValue) return 'N/A';
    const normalized = String(brandValue).trim();
    // If brand is empty, return "N/A", otherwise return normalized value
    if (normalized === '') {
      return 'N/A';
    }
    // Normalize "N/A" variations to standard "N/A"
    if (normalized.toLowerCase() === 'n/a' || 
        normalized.toLowerCase() === 'na' ||
        normalized.toLowerCase() === 'n.a.') {
      return 'N/A';
    }
    return normalized;
  };

  const normalizedCondition = normalizeCondition(fields.condition);
  const normalizedBrand = normalizeBrand(fields.brand);

  // restFields excludes: title, brand, condition, longDescription, priceSuggestion, weight, dimensions, shortDescription, key_features, tags
  const { title, brand, condition, longDescription, priceSuggestion, weight, dimensions, priceNew, ...restFields } = fields;

  // Map to Sharetribe structure
  const listingData = {
    title: fields.title || 'Untitled',
    description: fields.longDescription || fields.shortDescription || '',
    publicData: {
      category: category || 'Other',
      subcategory: subcategory || '',
      thirdCategory: thirdCategory || '',
      ...(categoryId != null && { categoryId: categoryId, categoryLevel1: categoryId }),
      ...(subcategoryId != null && { subcategoryId: subcategoryId, categoryLevel2: subcategoryId }),
      ...(thirdCategoryId != null && { thirdCategoryId: thirdCategoryId, categoryLevel3: thirdCategoryId }),
      brand: normalizedBrand, // Always include brand, even if "N/A"
      condition: normalizedCondition,
      estimatedPriceNew: fields.priceNew,
      // Map weight and dimensions from API (same keys in publicData)
      ...(fields.weight != null && fields.weight !== '' && { weight: fields.weight }),
      ...(fields.dimensions != null && fields.dimensions !== '' && { dimensions: fields.dimensions }),
      // Add all other fields as custom extended data
      ...restFields,
    },
    privateData: {
      aiGenerated: true,
      aiModel: productAnalysis.model || productApiInstance.model,
      aiConfidence: productAnalysis.confidence,
      // Store priceSuggestion in privateData
      ...(fields.priceSuggestion && { priceSuggestion: fields.priceSuggestion }),
    },
  };

  // Parse price suggestion if available and use it to set listingData.price
  if (fields.priceSuggestion) {
    const priceMatch = fields.priceSuggestion.match(/\$?(\d+)-?(\d+)?/);
    if (priceMatch) {
      const minPrice = parseInt(priceMatch[1], 10);
      // Sharetribe expects 'price' as a Money object with amount and currency
      listingData.price = {
        amount: minPrice * 100, // Convert to cents
        currency: config?.currency || 'USD', // Get currency from config or default to USD
      };
    }
  }

  // Map calendar availability if present
  if (calendarAvailability) {
    listingData.availabilityPlan = {
      type: 'availability-plan/time',
      timezone: 'Etc/UTC',
      entries: [],
    };

    if (calendarAvailability.startDate) {
      listingData.publicData.availableFrom = calendarAvailability.startDate;
    }

    if (calendarAvailability.endDate) {
      listingData.publicData.availableUntil = calendarAvailability.endDate;
    }

    if (calendarAvailability.unavailableDates?.length > 0) {
      listingData.publicData.blockedDates = calendarAvailability.unavailableDates;
    }
  }

  return listingData;
};

/**
 * Map Sharetribe listing to Product API format (for editing)
 * @param {Object} listing - Sharetribe listing
 * @returns {Object} Product API compatible format
 */
export const mapListingToProductData = listing => {
  const { title, description, publicData, privateData } = listing.attributes || {};

  // Resolve category hierarchy names
  const category =
    publicData?.category || '';
  const subcategory =
    publicData?.subcategory || '';
  const thirdCategory =
    publicData?.thirdCategory ||  '';

  // Resolve category hierarchy IDs (if present)
  const categoryId = publicData?.categoryId ?? null;
  const subcategoryId = publicData?.subcategoryId ?? null;
  const thirdCategoryId = publicData?.thirdCategoryId ?? null;

  // Extract custom fields (all publicData except standard fields)
  const {
    category: _cat,
    subcategory: _subcat,
    thirdCategory: _thirdCat,
    categoryId: _catId,
    subcategoryId: _subcatId,
    thirdCategoryId: _thirdCatId,
    brand: _brand,
    condition: _cond,
    weight: _weight,
    dimensions: _dims,
    ...customFields
  } = publicData || {};

  return {
    category,
    subcategory,
    thirdCategory,
    categoryId,
    subcategoryId,
    thirdCategoryId,
    confidence: privateData?.aiConfidence || 'medium',
    locale: 'en-US', // Could be dynamic based on user settings
    fields: {
      title: title || '',
      brand: publicData?.brand || '',
      condition: publicData?.condition || '',
      shortDescription: description?.substring(0, 200) || '',
      longDescription: description || '',
      weight: publicData?.weight,
      dimensions: publicData?.dimensions,
      ...customFields,
    },
  };
};

/**
 * Check if Product API is configured and available
 * @returns {boolean}
 */
export const isProductAPIAvailable = () => {
  return !!PRODUCT_API_BASE_URL;
};

/**
 * Validate product analysis response
 * @param {Object} analysis - Product analysis to validate
 * @returns {boolean}
 */
export const isValidProductAnalysis = analysis => {
  return (
    analysis &&
    typeof analysis === 'object' &&
    // Category string OR numeric categoryId must be present
    (analysis.category || typeof analysis.categoryId === 'number') &&
    analysis.fields &&
    analysis.fields.title
  );
};

/**
 * Create a ProductSnapshot from a listing for change verification
 * @param {Object} listing - Sharetribe listing object
 * @returns {Object} ProductSnapshot
 */
export const createProductSnapshot = listing => {
  const { title, description, publicData } = listing.attributes || {};
  
  // Extract key features from publicData (keyFeatures or key_features)
  let keyFeatures = [];
  const keyFeaturesFieldNames = ['keyFeatures', 'key_features'];
  for (const fieldName of keyFeaturesFieldNames) {
    if (publicData?.[fieldName] && Array.isArray(publicData[fieldName])) {
      keyFeatures.push(...publicData[fieldName]);
      break; // Use first match
    }
  }
  
  // If no key features found, try to extract from description or other fields
  if (keyFeatures.length === 0 && description) {
    // Simple extraction: look for bullet points or numbered lists
    const lines = description.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
    if (lines.length > 0) {
      keyFeatures.push(...lines.map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim()).filter(Boolean));
    }
  }
  
  // Extract image UUIDs from listing.images (not listing.attributes.images)
  const imageUuids = (listing.images || []).map(img => {
    // Extract UUID from image ID object
    const imgId = img.imageId || img.id;
    if (typeof imgId === 'object' && imgId.uuid) {
      return imgId.uuid;
    }
    if (typeof imgId === 'string') {
      return imgId;
    }
    return null;
  }).filter(Boolean);
  
  return {
    title: title || '',
    description: description || '',
    keyFeatures: keyFeatures.length > 0 ? keyFeatures : [],
    brand: publicData?.brand || '',
    images: imageUuids,
    category: publicData?.categoryId || null,
    subcategory: publicData?.subcategoryId || null,
    thirdcategory: publicData?.thirdCategoryId || undefined,
  };
};

// Export singleton instance
export default productApiInstance;
