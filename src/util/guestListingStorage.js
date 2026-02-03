/**
 * Utility functions for storing and retrieving guest listing data
 * Used when users are not authenticated to save listing creation progress
 */

const STORAGE_KEY = 'guest_listing_draft';
const STORAGE_FLAG_KEY = 'guest_listing_pending_publish';

/**
 * Save guest listing data to localStorage
 * @param {Object} listingData - The listing data to save
 * @param {File[]} images - Array of image files
 * @param {Object} productAnalysis - Product analysis data
 * @param {Object} pricingData - Pricing data
 * @param {Object} availabilityData - Availability data
 * @param {Object} locationData - Location data
 */
export const saveGuestListingData = (
  listingData,
  images = [],
  productAnalysis = null,
  pricingData = null,
  availabilityData = null,
  locationData = null
) => {
  try {
    // Convert File objects to base64 for storage
    const imagePromises = images.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result, // base64 string
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises)
      .then(imageData => {
        const dataToSave = {
          listingData,
          images: imageData,
          productAnalysis,
          pricingData,
          availabilityData,
          locationData,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      })
      .catch(error => {
        console.error('Failed to save images to storage:', error);
        // Save without images if conversion fails
        const dataToSave = {
          listingData,
          images: [],
          productAnalysis,
          pricingData,
          availabilityData,
          locationData,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      });
  } catch (error) {
    console.error('Failed to save guest listing data:', error);
  }
};

/**
 * Load guest listing data from localStorage
 * @returns {Object|null} The saved listing data or null if not found
 */
export const loadGuestListingData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const data = JSON.parse(saved);

    // Convert base64 images back to File objects
    const imageFiles = data.images.map(imgData => {
      // Convert base64 to blob
      const byteCharacters = atob(imgData.data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: imgData.type });
      return new File([blob], imgData.name, { type: imgData.type });
    });

    return {
      ...data,
      images: imageFiles,
    };
  } catch (error) {
    console.error('Failed to load guest listing data:', error);
    return null;
  }
};

/**
 * Clear guest listing data from localStorage
 */
export const clearGuestListingData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_FLAG_KEY);
  } catch (error) {
    console.error('Failed to clear guest listing data:', error);
  }
};

/**
 * Set flag that guest listing is pending publish (user needs to login)
 */
export const setGuestListingPendingPublish = () => {
  try {
    localStorage.setItem(STORAGE_FLAG_KEY, 'true');
  } catch (error) {
    console.error('Failed to set guest listing pending publish flag:', error);
  }
};

/**
 * Check if guest listing is pending publish
 * @returns {boolean}
 */
export const isGuestListingPendingPublish = () => {
  try {
    return localStorage.getItem(STORAGE_FLAG_KEY) === 'true';
  } catch (error) {
    console.error('Failed to check guest listing pending publish flag:', error);
    return false;
  }
};

/**
 * Clear the pending publish flag
 */
export const clearGuestListingPendingPublish = () => {
  try {
    localStorage.removeItem(STORAGE_FLAG_KEY);
  } catch (error) {
    console.error('Failed to clear guest listing pending publish flag:', error);
  }
};

