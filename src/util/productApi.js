/**
 * Product Analysis API Client
 * Interfaces with AI-powered product analysis backend
 */

import { DEFAULT_LOCALE as APP_DEFAULT_LOCALE } from '../config/localeConfig';

const PRODUCT_API_BASE_URL =
  process.env.REACT_APP_PRODUCT_API_URL || 'http://localhost:3001/api';
const DEFAULT_MODELS = ['gemini-2.5-flash'];
//const DEFAULT_MODELS = ['gemini-2.5-flash', 'gpt-5', 'claude-4.5-sonnet'];

/**
 * Product API Client Class
 */
class ProductAPI {
  constructor() {
    this.baseURL = PRODUCT_API_BASE_URL;
    this.models = [...DEFAULT_MODELS];
    this.model = DEFAULT_MODELS[0]; // Default model for other methods (refine, regenerate, etc.)
    // Get current locale from localStorage (default: it-IT)
    // Safe for server-side rendering: check if localStorage is available
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.locale = localStorage.getItem('marketplace_locale') || APP_DEFAULT_LOCALE;
    } else {
      this.locale = APP_DEFAULT_LOCALE;
    }
  }

  /**
   * Analyze product images and get structured data
   * Tries models in order, falling back to next model on error
   * @param {File[]} images - Array of image files (1-10)
   * @param {string} locale - Language locale (it-IT, fr-FR, es-ES, etc.) - defaults to current locale
   * @returns {Promise<ProductAnalysis>}
   */
  async analyze(images, locale = this.locale) {
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
   * @returns {Promise<ProductAnalysis>}
   */
  async refine({ previousAnalysis, answers, locale = this.locale, totalQuestionsAsked, roundNumber }) {
    return await this.call('refine', {
      previousAnalysis,
      answers,
      locale,
      model: this.model,
      totalQuestionsAsked,
      roundNumber,
    });
  }

  /**
   * Regenerate a specific field
   * @param {Object} productAnalysis - Current analysis
   * @param {string} fieldName - Field to regenerate
   * @returns {Promise<{fieldName: string, newValue: any}>}
   */
  async regenerate(productAnalysis, fieldName, locale = this.locale) {
    return await this.call('regenerate-field', {
      productAnalysis,
      fieldName,
      locale,
      model: this.model,
    });
  }

  /**
   * Translate product fields to another language
   * @param {Object} fields - Product fields to translate
   * @param {string} fromLocale - Source locale
   * @param {string} toLocale - Target locale
   * @param {string} category - Product category
   * @returns {Promise<Object>}
   */
  async translate(fields, fromLocale, toLocale, category) {
    return await this.call('translate-fields', {
      fields,
      fromLocale,
      toLocale,
      category,
      model: this.model,
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
   * Internal API call method
   * @private
   */
  async call(endpoint, payload) {
    const isFormData = payload instanceof FormData;
    const fullURL = `${this.baseURL}/${endpoint}`;

    // Debug logging
    console.log('🔍 [Product API] Calling:', fullURL);
    console.log('📦 [Product API] Payload type:', isFormData ? 'FormData' : 'JSON');
    console.log('🌐 [Product API] Base URL:', this.baseURL);

    try {
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
        body: isFormData ? payload : JSON.stringify(payload),
      });

      console.log('📡 [Product API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage;
        let errorCode = null;
        try {
          const error = await response.json();
          errorMessage =
            error.error || error.message || `API call failed with status ${response.status}`;
          // Check for PROHIBITED_CATEGORY error code
          if (response.status === 403 && error.errorCode === 'PROHIBITED_CATEGORY') {
            errorCode = 'PROHIBITED_CATEGORY';
          }
        } catch {
          errorMessage = `API call failed with status ${response.status} - ${response.statusText}`;
        }
        console.error('❌ [Product API] Error response:', errorMessage);
        const apiError = new Error(errorMessage);
        if (errorCode) {
          apiError.errorCode = errorCode;
        }
        throw apiError;
      }

      const data = await response.json();
      console.log('✅ [Product API] Success:', data);
      return data;
    } catch (error) {
      console.error(`❌ [Product API Error - ${endpoint}]:`, error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   * Note: Sharetribe only accepts PNG and JPEG formats
   * @private
   */
  isValidImage(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    return validTypes.includes(file.type) && file.size <= maxSize;
  }
}

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

  // Map to Sharetribe structure
  const listingData = {
    title: fields.title || 'Untitled',
    description: fields.longDescription || fields.shortDescription || '',
    publicData: {
      category: category || 'Other',
      subcategory: subcategory || '',
      thirdCategory: thirdCategory || '',
      ...(categoryId != null && { categoryId: categoryId }),
      ...(subcategoryId != null && { subcategoryId: subcategoryId }),
      ...(thirdCategoryId != null && { thirdCategoryId: thirdCategoryId }),
      brand: fields.brand || '',
      condition: fields.condition || 'Used',
      // Map weight and dimensions from API (same keys in publicData)
      ...(fields.weight != null && fields.weight !== '' && { weight: fields.weight }),
      ...(fields.dimensions != null && fields.dimensions !== '' && { dimensions: fields.dimensions }),
      // Add all other fields as custom extended data (excluding priceSuggestion)
      ...Object.keys(fields).reduce((acc, key) => {
        if (!['title', 'brand', 'condition', 'longDescription', 'priceSuggestion', 'weight', 'dimensions', 'priceNew'].includes(key)) {
          acc[`ai_${key}`] = fields[key];
        }
        return acc;
      }, {}),
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

  // Extract AI fields
  const aiFields = {};
  Object.keys(publicData || {}).forEach(key => {
    if (key.startsWith('ai_')) {
      aiFields[key.replace('ai_', '')] = publicData[key];
    }
  });

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
      ...aiFields,
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

// Export singleton instance
export default productApiInstance;
