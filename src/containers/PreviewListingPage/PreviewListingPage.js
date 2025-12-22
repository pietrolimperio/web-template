import React, { useEffect, useState, useCallback, useRef } from 'react';
import { bool, func, object, shape, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl, intlShape, injectIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { currencyFormatting } from '../../config/settingsCurrency';
import { ensureCurrentUser, ensureOwnListing } from '../../util/data';
import { LISTING_STATE_DRAFT } from '../../util/types';
import { createResourceLocatorString, findRouteByRouteName } from '../../util/routes';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';

// Helper function to delete image from listing
const deleteImageFromListing = (currentImages, imageUuid, listingId, config, sdk, dispatch) => {
  // Helper function to extract image ID (similar to EditListingPage.duck.js)
  const getImageId = img => img.imageId || img.id;
  
  // Remove the image to delete from the images array
  const imageIds = currentImages
    .map(getImageId)
    .filter(id => {
      // Compare UUIDs - handle both UUID objects and string UUIDs
      const idUuid = typeof id === 'object' ? id.uuid : id;
      return idUuid !== imageUuid;
    });

  const imageVariantInfo = getImageVariantInfo(config?.layout?.listingImage || {});
  const queryParams = {
    expand: true,
    include: ['images'],
    'fields.image': imageVariantInfo.fieldsImage,
    ...imageVariantInfo.imageVariants,
  };

  // Update listing with new images array
  return sdk.ownListings.update(
    { id: listingId, images: imageIds },
    queryParams
  ).then(response => {
    // Refresh the listing in the store
    return dispatch(requestShowListing({ id: listingId }, config));
  });
};
import { requirePayoutDetails } from '../../util/configHelpers';
import { INQUIRY_PROCESS_NAME } from '../../transactions/transaction';
import { types as sdkTypes, createImageVariantConfig, createInstance } from '../../util/sdkLoader';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';

const { UUID } = sdkTypes;

import {
  Page,
  LayoutSingleColumn,
  NamedLink,
  PrimaryButton,
  SecondaryButton,
  Modal,
  IconSpinner,
  Map,
  IconClose,
  IconDelete,
  NotificationBanner,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import NotFoundPage from '../NotFoundPage/NotFoundPage';
import { LoadingPage } from '../ListingPage/ListingPage.shared';
import AvailabilityCalendar from '../AIListingCreationPage/AvailabilityCalendar';
import LocationAutocompleteInputImpl from '../../components/LocationAutocompleteInput/LocationAutocompleteInput';

import {
  requestPublishListingDraft,
  clearPublishError,
  requestShowListing,
  requestUpdateListing,
} from '../EditListingPage/EditListingPage.duck';
import { getStripeConnectAccountLink, createStripeAccount, fetchStripeAccount } from '../../ducks/stripeConnectAccount.duck';

import css from './PreviewListingPage.module.css';

const STRIPE_ONBOARDING_RETURN_URL_SUCCESS = 'success';
const STRIPE_ONBOARDING_RETURN_URL_FAILURE = 'failure';

// Get country code for location search based on locale
const getCountryForLocale = locale => {
  // Extract base locale (e.g., 'it' from 'it-IT')
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'en';
  const countryMap = {
    en: 'GB',
    de: 'DE',
    fr: 'FR',
    it: 'IT',
    es: 'ES',
    pt: 'PT',
  };
  return countryMap[baseLocale] || 'IT';
};

/**
 * Geocode an address using Mapbox Geocoding API
 * @param {string} addressString - Full address string
 * @param {string} countryCode - ISO country code for limiting results (e.g., 'IT')
 * @returns {Promise<{lat: number, lng: number}|null>} - Geolocation coordinates or null if not found
 */
const geocodeAddress = async (addressString, countryCode) => {
  if (!addressString || !addressString.trim()) {
    return null;
  }

  // Check if Mapbox SDK is available
  if (typeof window === 'undefined' || !window.mapboxgl || !window.mapboxSdk || !window.mapboxgl.accessToken) {
    console.warn('Mapbox SDK not available for geocoding');
    return null;
  }

  try {
    const client = window.mapboxSdk({
      accessToken: window.mapboxgl.accessToken,
    });

    const queryParams = {
      limit: 1,
      types: 'address',
    };

    // Add country if provided
    if (countryCode) {
      queryParams.country = countryCode.toLowerCase();
    }

    const request = client.createRequest({
      method: 'GET',
      path: '/geocoding/v5/mapbox.places/:query.json',
      params: {
        query: addressString,
      },
      query: queryParams,
    });

    const response = await request.send();

    if (response.body && response.body.features && response.body.features.length > 0) {
      const feature = response.body.features[0];
      if (feature.center && Array.isArray(feature.center) && feature.center.length === 2) {
        // Mapbox returns coordinates as [longitude, latitude]
        const [lng, lat] = feature.center;
        return { lat, lng };
      }
    }

    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

// Helper function for image variants
const getImageVariantInfo = listingImageConfig => {
  const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } = listingImageConfig;
  const aspectRatio = aspectHeight / aspectWidth;
  const fieldsImage = [
    `variants.${variantPrefix}`,
    `variants.${variantPrefix}-2x`,
    `variants.${variantPrefix}-4x`,
    `variants.${variantPrefix}-6x`,
  ];

  return {
    fieldsImage,
    imageVariants: {
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-4x`, 1600, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-6x`, 2400, aspectRatio),
    },
  };
};

// Helper functions for Stripe account
const getStripeAccountData = stripeAccount => stripeAccount?.attributes?.stripeAccountData || null;

const hasRequirements = (stripeAccountData, requirementType) =>
  stripeAccountData != null &&
  stripeAccountData.requirements &&
  Array.isArray(stripeAccountData.requirements[requirementType]) &&
  stripeAccountData.requirements[requirementType].length > 0;

const getListingTypeConfig = (listing, selectedListingType, config) => {
  const existingListingType = listing?.attributes?.publicData?.listingType;
  const validListingTypes = config.listing?.listingTypes;
  const hasOnlyOneListingType = validListingTypes?.length === 1;

  const listingTypeConfig = existingListingType
    ? validListingTypes.find(conf => conf.listingType === existingListingType)
    : selectedListingType
    ? validListingTypes.find(conf => conf.listingType === selectedListingType.listingType)
    : hasOnlyOneListingType
    ? validListingTypes[0]
    : null;
  return listingTypeConfig;
};

export const PreviewListingPageComponent = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    history,
    getListing,
    onFetchListing,
    onUpdateListing,
    onPublishListingDraft,
    onUploadImage,
    onDeleteImage,
    publishListingError,
    publishInProgress,
    scrollingDisabled,
    stripeAccount,
    stripeAccountFetched,
    onGetStripeConnectAccountLink,
    onCreateStripeAccount,
    onFetchStripeAccount,
    getAccountLinkInProgress,
    createStripeAccountInProgress,
    onManageDisableScrolling,
    params,
  } = props;

  const { id, returnURLType } = params;
  const listingId = id ? new UUID(id) : null;
  const currentListing = ensureOwnListing(getListing(listingId));
  const { state: currentListingState } = currentListing.attributes || {};

  const ensuredCurrentUser = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!ensuredCurrentUser.id;

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isCreatingStripeAccount, setIsCreatingStripeAccount] = useState(false);
  const [hasPublished, setHasPublished] = useState(false);
  const [listingFetched, setListingFetched] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCheckingStripeStatus, setIsCheckingStripeStatus] = useState(false);

  // Editable fields state
  const [editingField, setEditingField] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [regeneratingField, setRegeneratingField] = useState(null);
  const [updatingListing, setUpdatingListing] = useState(false);
  
  // Drag and drop state for key features
  const [hoveredFeatureIndex, setHoveredFeatureIndex] = useState(null);
  const [showAddFeatureInput, setShowAddFeatureInput] = useState(false);
  const [newFeatureValue, setNewFeatureValue] = useState('');

  // Geocoded location state for addresses without geolocation
  const [geocodedLocation, setGeocodedLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);

  // Modals for editing
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationTooltip, setShowLocationTooltip] = useState(false);
  
  // Image deletion confirmation dialog state
  const [showDeleteImageDialog, setShowDeleteImageDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [imageToDeleteIndex, setImageToDeleteIndex] = useState(null);
  
  // Notification banner state
  const [notificationTitle, setNotificationTitle] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [notificationType, setNotificationType] = useState('error');
  
  // Location modal state
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [locationAutocompleteValue, setLocationAutocompleteValue] = useState({
    search: '',
    predictions: [],
    selectedPlace: null,
  });
  const [manualAddress, setManualAddress] = useState({
    street: '',
    streetNumber: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
  });
  const [modalGeolocation, setModalGeolocation] = useState(null);
  const [invalidFields, setInvalidFields] = useState([]);
  const [modalLocationVisible, setModalLocationVisible] = useState(true);
  const [modalHandByHandAvailable, setModalHandByHandAvailable] = useState(false);

  // Price modal state
  const [modalDefaultPrice, setModalDefaultPrice] = useState(0);
  const [modalPriceVariants, setModalPriceVariants] = useState([]);
  const [showAddPriceVariant, setShowAddPriceVariant] = useState(false);
  const [priceVariantType, setPriceVariantType] = useState('length');
  const [newPriceVariant, setNewPriceVariant] = useState({
    type: 'length',
    price: null,
    minLength: null,
    maxLength: '',
    dates: [],
  });
  const [editingPriceVariant, setEditingPriceVariant] = useState(null);
  const [priceVariantError, setPriceVariantError] = useState(null);

  // Location visibility
  const [locationVisible, setLocationVisible] = useState(
    currentListing.attributes?.publicData?.locationVisible || false
  );
  const [handByHandAvailable, setHandByHandAvailable] = useState(
    currentListing.attributes?.publicData?.handByHandAvailable || false
  );

  // Update location visibility state when listing data changes
  useEffect(() => {
    if (currentListing.attributes?.publicData) {
      const newLocationVisible = currentListing.attributes.publicData.locationVisible || false;
      const newHandByHandAvailable = currentListing.attributes.publicData.handByHandAvailable || false;
      
      setLocationVisible(newLocationVisible);
      setHandByHandAvailable(newHandByHandAvailable);
    }
  }, [currentListing.attributes?.publicData?.locationVisible, currentListing.attributes?.publicData?.handByHandAvailable, currentListing.id]);

  // Availability exceptions state
  const [availabilityExceptions, setAvailabilityExceptions] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [disabledDates, setDisabledDates] = useState([]);

  // Availability modal state (for editing)
  const [modalSelectedDates, setModalSelectedDates] = useState([]);
  const [modalExceptions, setModalExceptions] = useState([]);
  const [originalExceptionIds, setOriginalExceptionIds] = useState([]); // Track original exception IDs
  const [showExceptionCalendar, setShowExceptionCalendar] = useState(false);
  const [editingException, setEditingException] = useState(null);
  const [newVariant, setNewVariant] = useState({ dates: [] });

  // Fetch listing data on mount
  useEffect(() => {
    if (listingId) {
      onFetchListing({ id: listingId }, config)
        .then(() => setListingFetched(true))
        .catch(() => setListingFetched(true));
    }
  }, [id]);

  // Fetch availability exceptions when listing is loaded
  useEffect(() => {
    const fetchAvailabilityExceptions = async () => {
      if (!currentListing.id || !listingFetched) return;

      try {
        // Create SDK instance
        const sdk = createInstance({
          clientId: config.sdk?.clientId || process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        oneYearFromNow.setHours(23, 59, 59, 999);

        const response = await sdk.availabilityExceptions.query({
          listingId: currentListing.id,
          start: today,
          end: oneYearFromNow,
        });

        const exceptions = response.data.data || [];
        setAvailabilityExceptions(exceptions);

        // Convert exceptions to disabled dates (Date objects)
        const exceptionDateObjects = [];
        exceptions.forEach(exception => {
          if (exception.attributes.seats === 0) {
            // Unavailable exception
            const start = new Date(exception.attributes.start);
            const end = new Date(exception.attributes.end);
            const currentDate = new Date(start);
            currentDate.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            while (currentDate <= end) {
              const dateObj = new Date(currentDate);
              dateObj.setHours(0, 0, 0, 0);
              // Check if date is not already in the array
              const exists = exceptionDateObjects.some(d => 
                d.getTime() === dateObj.getTime()
              );
              if (!exists) {
                exceptionDateObjects.push(dateObj);
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        });
        setDisabledDates(exceptionDateObjects);

        // Calculate available dates (respecting availableFrom/availableUntil if set, minus exceptions) as Date objects
        const available = [];
        
        // Determine the date range based on availableFrom/availableUntil or default to today + 1 year
        let rangeStart = today;
        let rangeEnd = oneYearFromNow;
        
        if (currentListing.attributes?.publicData?.availableFrom) {
          const fromDate = new Date(currentListing.attributes.publicData.availableFrom);
          fromDate.setHours(0, 0, 0, 0);
          // Use the later of today or availableFrom
          if (fromDate > rangeStart) {
            rangeStart = fromDate;
          }
        }
        
        if (currentListing.attributes?.publicData?.availableUntil) {
          const untilDate = new Date(currentListing.attributes.publicData.availableUntil);
          untilDate.setHours(23, 59, 59, 999);
          // Use the earlier of oneYearFromNow or availableUntil
          if (untilDate < rangeEnd) {
            rangeEnd = untilDate;
          }
        }
        
        const currentDate = new Date(rangeStart);
        while (currentDate <= rangeEnd) {
          const dateObj = new Date(currentDate);
          dateObj.setHours(0, 0, 0, 0);
          // Check if date is not in exceptions
          const isException = exceptionDateObjects.some(d => 
            d.getTime() === dateObj.getTime()
          );
          if (!isException) {
            available.push(dateObj);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        setAvailableDates(available);
      } catch (error) {
        console.error('Failed to fetch availability exceptions:', error);
        // If fetch fails, calculate available dates respecting availableFrom/availableUntil if set
        const todayFallback = new Date();
        todayFallback.setHours(0, 0, 0, 0);
        const oneYearFromNowFallback = new Date();
        oneYearFromNowFallback.setFullYear(oneYearFromNowFallback.getFullYear() + 1);
        oneYearFromNowFallback.setHours(23, 59, 59, 999);
        
        // Determine the date range based on availableFrom/availableUntil or default to today + 1 year
        let rangeStart = todayFallback;
        let rangeEnd = oneYearFromNowFallback;
        
        if (currentListing.attributes?.publicData?.availableFrom) {
          const fromDate = new Date(currentListing.attributes.publicData.availableFrom);
          fromDate.setHours(0, 0, 0, 0);
          // Use the later of today or availableFrom
          if (fromDate > rangeStart) {
            rangeStart = fromDate;
          }
        }
        
        if (currentListing.attributes?.publicData?.availableUntil) {
          const untilDate = new Date(currentListing.attributes.publicData.availableUntil);
          untilDate.setHours(23, 59, 59, 999);
          // Use the earlier of oneYearFromNow or availableUntil
          if (untilDate < rangeEnd) {
            rangeEnd = untilDate;
          }
        }
        
        const available = [];
        const currentDate = new Date(rangeStart);
        while (currentDate <= rangeEnd) {
          const dateObj = new Date(currentDate);
          dateObj.setHours(0, 0, 0, 0);
          available.push(dateObj);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        setAvailableDates(available);
        setDisabledDates([]);
      }
    };

    fetchAvailabilityExceptions();
  }, [currentListing.id, listingFetched, config, currentListing.attributes?.publicData?.availableFrom, currentListing.attributes?.publicData?.availableUntil]);

  // Initialize field values when listing is loaded
  useEffect(() => {
    if (currentListing.id) {
      setFieldValues({
        title: currentListing.attributes?.title || '',
        description: currentListing.attributes?.description || '',
        price: currentListing.attributes?.price?.amount / 100 || 0,
        brand: currentListing.attributes?.publicData?.brand || '',
        condition: currentListing.attributes?.publicData?.condition || 'Used',
      });
    }
  }, [currentListing.id]);

  // Geocode address when geolocation is missing (always geocode if address exists)
  useEffect(() => {
    const location = currentListing.attributes?.publicData?.location;
    const geolocation = location?.geolocation || null;
    const addressObj = location?.address || {};
    // Handle address as object or string
    const addressString = typeof addressObj === 'string' 
      ? addressObj 
      : addressObj.street && addressObj.streetNumber
      ? `${addressObj.street} ${addressObj.streetNumber}, ${addressObj.city || ''} ${addressObj.postalCode || ''}`.trim()
      : addressObj.city || addressObj.address || '';

    // Reset geocoded location if geolocation is available
    if (geolocation) {
      setGeocodedLocation(null);
      setIsGeocoding(false);
      return;
    }

    // If no geolocation but address exists, try to geocode it (always, regardless of locationVisible)
    if (!geolocation && addressString) {
      setIsGeocoding(true);
      const countryCode = getCountryForLocale(intl.locale);
      
      geocodeAddress(addressString, countryCode)
        .then(coords => {
          if (coords) {
            setGeocodedLocation(coords);
          } else {
            setGeocodedLocation(null);
          }
        })
        .catch(error => {
          console.error('Error geocoding address:', error);
          setGeocodedLocation(null);
        })
        .finally(() => {
          setIsGeocoding(false);
        });
    } else {
      setGeocodedLocation(null);
      setIsGeocoding(false);
    }
  }, [currentListing.attributes?.publicData?.location, intl.locale]);

  // Handler functions for editing
  const handleEditField = fieldName => {
    setEditingField(fieldName);
  };

  const handleSaveField = async fieldName => {
    const value = fieldValues[fieldName];

    // Basic validation
    if (!value || (typeof value === 'string' && !value.trim())) {
      alert(intl.formatMessage({ id: 'PreviewListingPage.fieldRequired' }));
      return;
    }

    setUpdatingListing(true);
    try {
      // Prepare update data
      const updateData = {};
      if (fieldName === 'title') {
        updateData.title = value;
      } else if (fieldName === 'description') {
        updateData.description = value;
      } else if (fieldName === 'price') {
        updateData.price = {
          amount: Math.round(value * 100),
          currency: currentListing.attributes?.price?.currency || config.currency || 'EUR',
        };
      } else if (fieldName === 'brand' || fieldName === 'condition') {
        // Update publicData for brand and condition
        updateData.id = listingId;
        updateData.publicData = {
          ...currentListing.attributes?.publicData,
          [fieldName]: value,
        };
      }

      // Add id to updateData if not already present
      if (!updateData.id) {
        updateData.id = listingId;
      }

      await onUpdateListing('details', updateData, config);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update listing:', error);
      alert(intl.formatMessage({ id: 'PreviewListingPage.updateError' }));
    } finally {
      setUpdatingListing(false);
    }
  };

  const handleCancelEdit = fieldName => {
    // Restore original value
    if (fieldName === 'title') {
      setFieldValues({ ...fieldValues, title: currentListing.attributes?.title || '' });
    } else if (fieldName === 'description') {
      setFieldValues({ ...fieldValues, description: currentListing.attributes?.description || '' });
    } else if (fieldName === 'price') {
      setFieldValues({
        ...fieldValues,
        price: currentListing.attributes?.price?.amount / 100 || 0,
      });
    } else if (fieldName === 'brand') {
      setFieldValues({
        ...fieldValues,
        brand: currentListing.attributes?.publicData?.brand || '',
      });
    } else if (fieldName === 'condition') {
      setFieldValues({
        ...fieldValues,
        condition: currentListing.attributes?.publicData?.condition || 'Used',
      });
    }
    setEditingField(null);
  };

  const handleChangeField = (fieldName, value) => {
    setFieldValues({ ...fieldValues, [fieldName]: value });
  };

  // Helper to get key features field name
  const getKeyFeaturesFieldName = (publicData) => {
    return publicData.AI_KeyFeatures ? 'AI_KeyFeatures' :
           publicData.ai_KeyFeatures ? 'ai_KeyFeatures' :
           publicData.ai_keyFeatures ? 'ai_keyFeatures' :
           publicData.keyFeatures ? 'keyFeatures' :
           'AI_KeyFeatures'; // default
  };

  // Handler for removing a key feature
  const handleRemoveKeyFeature = async (indexToRemove) => {
    const publicData = currentListing.attributes?.publicData || {};
    const keyFeaturesFieldName = getKeyFeaturesFieldName(publicData);
    const currentKeyFeatures = publicData[keyFeaturesFieldName] || [];
    const updatedKeyFeatures = Array.isArray(currentKeyFeatures) 
      ? currentKeyFeatures.filter((_, index) => index !== indexToRemove)
      : [];
    
    setUpdatingListing(true);
    try {
      const updateData = {
        id: listingId,
        publicData: {
          ...publicData,
          [keyFeaturesFieldName]: updatedKeyFeatures,
        },
      };
      await onUpdateListing('details', updateData, config);
    } catch (error) {
      console.error('Failed to remove key feature:', error);
      alert(intl.formatMessage({ id: 'PreviewListingPage.updateError' }));
    } finally {
      setUpdatingListing(false);
    }
  };

  // Handler for reordering key features

  // Handler for adding a key feature
  const handleAddKeyFeature = async (newFeature, currentFeatures, keyFeaturesFieldName) => {
    if (!newFeature.trim()) return;
    
    setUpdatingListing(true);
    try {
      const updatedFeatures = [...(Array.isArray(currentFeatures) ? currentFeatures : []), newFeature.trim()];
      const updateData = {
        id: listingId,
        publicData: {
          ...currentListing.attributes?.publicData,
          [keyFeaturesFieldName]: updatedFeatures,
        },
      };
      await onUpdateListing('details', updateData, config);
    } catch (error) {
      console.error('Failed to add key feature:', error);
      alert(intl.formatMessage({ id: 'PreviewListingPage.updateError' }));
    } finally {
      setUpdatingListing(false);
    }
  };

  const handleImageClick = index => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
  };

  const handleNextImage = () => {
    if (listing.images && listing.images.length > 0) {
      setSelectedImageIndex(prev => (prev + 1) % listing.images.length);
    }
  };

  const handlePrevImage = () => {
    if (listing.images && listing.images.length > 0) {
      setSelectedImageIndex(prev => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  const handleLocationVisibleToggle = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // If trying to disable location visibility when handByHand is enabled, show tooltip
    if (handByHandAvailable && locationVisible) {
      setShowLocationTooltip(true);
      setTimeout(() => setShowLocationTooltip(false), 3000);
      return;
    }

    if (!listingId) {
      console.error('Listing ID is missing');
      return;
    }

    const newValue = !locationVisible;
    const previousValue = locationVisible;
    setLocationVisible(newValue);

    try {
      await onUpdateListing(
        'location', // tab name
        {
          id: listingId,
          publicData: {
            ...currentListing.attributes?.publicData,
            locationVisible: newValue,
          },
        },
        config
      );
    } catch (error) {
      console.error('Failed to update location visibility:', error);
      setLocationVisible(previousValue); // Revert on error
    }
  };

  const handleHandByHandToggle = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!listingId) {
      console.error('Listing ID is missing');
      return;
    }

    const newValue = !handByHandAvailable;
    const previousHandByHandValue = handByHandAvailable;
    const previousLocationVisibleValue = locationVisible;
    
    setHandByHandAvailable(newValue);

    // If enabling hand-by-hand, also enable location visible
    if (newValue) {
      setLocationVisible(true);
    }

    try {
      await onUpdateListing(
        'location', // tab name
        {
          id: listingId,
          publicData: {
            ...currentListing.attributes?.publicData,
            handByHandAvailable: newValue,
            ...(newValue ? { locationVisible: true } : {}),
          },
        },
        config
      );
    } catch (error) {
      console.error('Failed to update hand-by-hand availability:', error);
      // Revert both values on error
      setHandByHandAvailable(previousHandByHandValue);
      setLocationVisible(previousLocationVisibleValue);
    }
  };

  const handleImageUpload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert(
        intl.formatMessage(
          { id: 'PreviewListingPage.invalidImageType' },
          { defaultMessage: 'Only PNG and JPEG images are supported.' }
        )
      );
      return;
    }

    setUploadingImage(true);
    try {
      console.log('📤 Uploading image:', file.name);
      await onUploadImage(listingId, file, config);
      console.log('✅ Image uploaded successfully');

      // Reset the file input so the same file can be uploaded again if needed
      event.target.value = '';
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      alert(
        intl.formatMessage(
          { id: 'PreviewListingPage.uploadError' },
          { defaultMessage: 'Failed to upload image. Please try again.' }
        )
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (imageId, imageIndex) => {
    // Show confirmation dialog
    setImageToDelete(imageId);
    setImageToDeleteIndex(imageIndex);
    setShowDeleteImageDialog(true);
  };

  const confirmImageDelete = async () => {
    if (!imageToDelete) return;

    setDeletingImageId(imageToDelete.uuid);
    setShowDeleteImageDialog(false);
    
    try {
      console.log('🗑️  Deleting image:', imageToDelete.uuid);
      // Pass current images array directly since listing might be a draft
      await onDeleteImage(listingId, imageToDelete, listing.images || [], config);
      console.log('✅ Image deleted successfully');

      // Adjust selected index if needed
      if (selectedImageIndex >= listing.images.length - 1) {
        setSelectedImageIndex(Math.max(0, listing.images.length - 2));
      }
    } catch (error) {
      console.error('❌ Failed to delete image:', error);
      setNotificationTitle(
        intl.formatMessage(
          { id: 'PreviewListingPage.deleteError' },
          { defaultMessage: 'Failed to delete image. Please try again.' }
        )
      );
      setNotificationMessage('');
      setNotificationType('error');
    } finally {
      setDeletingImageId(null);
      setImageToDelete(null);
      setImageToDeleteIndex(null);
    }
  };

  const cancelImageDelete = () => {
    setShowDeleteImageDialog(false);
    setImageToDelete(null);
    setImageToDeleteIndex(null);
  };

  const handleRegenerateField = async fieldName => {
    setRegeneratingField(fieldName);

    try {
      // Import productApi dynamically
      const productApiInstance = (await import('../../util/productApi')).default;

      // Prepare product data for regeneration
      const productData = {
        category: currentListing.attributes?.publicData?.category,
        subcategory: currentListing.attributes?.publicData?.subcategory,
        fields: {
          title: currentListing.attributes?.title,
          description: currentListing.attributes?.description,
          price: currentListing.attributes?.price?.amount / 100,
        },
      };

      const result = await productApiInstance.regenerate(productData, fieldName);

      if (result && result.newValue) {
        // For price, the AI will return a numeric value, not in cents
        const newValue = fieldName === 'price' ? parseFloat(result.newValue) : result.newValue;
        setFieldValues({ ...fieldValues, [fieldName]: newValue });
      } else {
        throw new Error('Failed to regenerate field');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      alert(intl.formatMessage({ id: 'PreviewListingPage.regenerateError' }));
    } finally {
      setRegeneratingField(null);
    }
  };

  // Calculate minimum price from default price and variants
  const calculateMinimumPrice = () => {
    const defaultPrice = listing.attributes?.price?.amount / 100 || 0;
    const priceVariants = listing.attributes?.publicData?.priceVariants || [];

    if (priceVariants.length === 0) {
      return { price: defaultPrice, hasVariants: false };
    }

    const variantPrices = priceVariants.map(v => v.priceInSubunits / 100);
    const allPrices = [defaultPrice, ...variantPrices];
    const minPrice = Math.min(...allPrices);

    return { price: minPrice, hasVariants: true };
  };

  // Check Stripe connection status
  // An account is considered "connected" only if:
  // 1. User is loaded
  // 2. stripeAccount exists
  // 3. stripeAccount.id exists
  // 4. stripeAccountData exists (account is actually linked and has data)
  const stripeAccountData = stripeAccount ? getStripeAccountData(stripeAccount) : null;
  const hasValidStripeAccountData = !!stripeAccountData;
  const stripeConnected = currentUserLoaded && !!stripeAccount && !!stripeAccount.id && hasValidStripeAccountData;
  
  const stripeRequirementsMissing =
    stripeAccount &&
    stripeAccountData &&
    (hasRequirements(stripeAccountData, 'past_due') ||
      hasRequirements(stripeAccountData, 'currently_due'));

  // Log user and Stripe account information for debugging
  console.log('[Stripe] User and Account Status:', {
    currentUserLoaded,
    currentUserId: currentUser?.id?.uuid || currentUser?.id,
    stripeAccountExists: !!stripeAccount,
    stripeAccountId: stripeAccount?.id?.uuid || stripeAccount?.id,
    hasStripeAccountData: hasValidStripeAccountData,
    stripeAccountData: stripeAccountData ? {
      country: stripeAccountData.country,
      business_type: stripeAccountData.business_type,
      charges_enabled: stripeAccountData.charges_enabled,
      payouts_enabled: stripeAccountData.payouts_enabled,
      requirements: {
        past_due: stripeAccountData.requirements?.past_due || [],
        currently_due: stripeAccountData.requirements?.currently_due || [],
      },
    } : null,
    stripeConnected,
    stripeRequirementsMissing,
    listingState: currentListingState,
  });

  // Check if listing exists and is in draft state
  const isDraft = currentListingState === LISTING_STATE_DRAFT;
  const listingNotFound = listingFetched && !currentListing.id;

  // Handle successful Stripe return
  const returnedFromStripe = returnURLType === STRIPE_ONBOARDING_RETURN_URL_SUCCESS;

  // Helper function to handle successful publish
  const handleSuccessfulPublish = useCallback((publishedListingResponse) => {
    if (!publishedListingResponse) {
      console.error('[Stripe] Publish response is empty');
      setHasPublished(false);
      setIsPublishing(false);
      return;
    }

    setHasPublished(true);
    setIsPublishing(false);
    // Extract title from published listing or use current title
    // SDK response structure: response.data.data contains the listing
    const publishedListing = publishedListingResponse?.data?.data;
    
    if (!publishedListing) {
      console.error('[Stripe] Published listing not found in response');
      setHasPublished(false);
      setIsPublishing(false);
      return;
    }

    // Verify listing is actually published (not draft)
    const listingState = publishedListing?.attributes?.state;
    if (listingState === LISTING_STATE_DRAFT) {
      console.error('[Stripe] Listing is still in draft state after publish');
      setHasPublished(false);
      setIsPublishing(false);
      return;
    }

    const title = publishedListing?.attributes?.title || currentListing?.attributes?.title || 'listing';
    const publishedListingId = publishedListing?.id || listingId;
    
    // Use the published listing ID (should be the same, but just in case)
    const listingIdUuid = publishedListingId?.uuid || listingId.uuid;
    
    console.log('[Stripe] Publishing successful, redirecting to:', { listingIdUuid, title, state: listingState });
    
    // Redirect to listing page
    const listingPath = createResourceLocatorString(
      'ListingPage',
      routeConfiguration,
      { id: listingIdUuid, slug: createSlug(title) },
      {}
    );
    history.push(listingPath);
  }, [currentListing, listingId, routeConfiguration, history]);

  const handlePublish = useCallback(() => {
    // Prevent multiple publish attempts
    if (hasPublished || isCreatingStripeAccount) {
      return;
    }

    // Check if listing is already published (not draft)
    const isDraft = currentListingState === LISTING_STATE_DRAFT;
    if (!isDraft) {
      // Listing already published, redirect to listing page
      const title = currentListing?.attributes?.title || 'listing';
      const listingPath = createResourceLocatorString(
        'ListingPage',
        routeConfiguration,
        { id: listingId.uuid, slug: createSlug(title) },
        {}
      );
      history.push(listingPath);
      return;
    }

    const listingTypeConfig = getListingTypeConfig(currentListing, null, config);
    const processName = currentListing?.attributes?.publicData?.transactionProcessAlias?.split(
      '/'
    )[0];
    const isInquiryProcess = processName === INQUIRY_PROCESS_NAME;
    // requirePayoutDetails returns true by default (unless explicitly set to false)
    // If listingTypeConfig is null/undefined, we should still require payout details
    const isPayoutDetailsRequired = listingTypeConfig
      ? requirePayoutDetails(listingTypeConfig)
      : true; // Default to requiring payout details if config is missing

    // Check if Stripe account is complete (no missing requirements)
    // A newly created account will always have missing requirements until onboarding is complete
    // An account is complete only if:
    // 1. It's connected (exists and has valid data)
    // 2. It has no missing requirements
    const stripeAccountComplete = stripeConnected && !stripeRequirementsMissing;

    console.log('[Stripe] Publish Decision Check:', {
      isPayoutDetailsRequired,
      isInquiryProcess,
      stripeConnected,
      stripeRequirementsMissing,
      stripeAccountComplete,
      willShowModal: !stripeAccountComplete && isPayoutDetailsRequired && !isInquiryProcess,
    });

    // If payout details are not required OR it's an inquiry process, publish directly
    if (!isPayoutDetailsRequired || isInquiryProcess) {
      setIsPublishing(true);
      onPublishListingDraft(listingId)
        .then(response => {
          if (!response) {
            console.error('[Stripe] Publish returned empty response');
            setHasPublished(false);
            setIsPublishing(false);
            alert(intl.formatMessage({ id: 'PreviewListingPage.publishError' }));
            return;
          }
          handleSuccessfulPublish(response);
        })
        .catch(e => {
          console.error('[Stripe] Failed to publish listing:', e);
          setHasPublished(false); // Reset on error
          setIsPublishing(false);
          alert(intl.formatMessage({ id: 'PreviewListingPage.publishError' }));
        });
      return;
    }

    // Payout details ARE required - check Stripe account status
    if (stripeAccountComplete) {
      // Account exists and is complete, publish
      setIsPublishing(true);
      onPublishListingDraft(listingId)
        .then(response => {
          if (!response) {
            console.error('[Stripe] Publish returned empty response');
            setHasPublished(false);
            setIsPublishing(false);
            alert(intl.formatMessage({ id: 'PreviewListingPage.publishError' }));
            return;
          }
          handleSuccessfulPublish(response);
        })
        .catch(e => {
          console.error('[Stripe] Failed to publish listing:', e);
          setHasPublished(false); // Reset on error
          setIsPublishing(false);
          alert(intl.formatMessage({ id: 'PreviewListingPage.publishError' }));
        });
    } else {
      // Stripe account missing or incomplete - show onboarding modal
      // IMPORTANT: Listing must remain in draft until Stripe onboarding is complete
      console.log('[Stripe] Showing onboarding modal - listing will remain in draft');
      setShowPayoutModal(true);
    }
  }, [
    hasPublished,
    isCreatingStripeAccount,
    currentListing,
    currentListingState,
    config,
    stripeConnected,
    stripeRequirementsMissing,
    listingId,
    routeConfiguration,
    history,
    onPublishListingDraft,
    handleSuccessfulPublish,
    intl,
  ]);

  useEffect(() => {
    // When returning from Stripe, reload account data first
    if (returnedFromStripe && !isCheckingStripeStatus) {
      console.log('[Stripe] Returned from Stripe onboarding - reloading account data');
      setIsCreatingStripeAccount(false);
      setIsCheckingStripeStatus(true);
      
      // Reload Stripe account data to get updated information
      onFetchStripeAccount()
        .then(() => {
          console.log('[Stripe] Stripe account data reloaded successfully');
          setIsCheckingStripeStatus(false);
        })
        .catch(err => {
          console.error('[Stripe] Failed to reload Stripe account data:', err);
          setIsCheckingStripeStatus(false);
        });
    }
  }, [returnedFromStripe, isCheckingStripeStatus, onFetchStripeAccount]);

  // Separate effect to handle auto-publish after account data is loaded
  // Use a ref to track if we've already attempted to publish to prevent loops
  const publishAttemptedRef = useRef(false);
  
  useEffect(() => {
    // Only auto-publish if we returned from Stripe AND account is complete
    // Make sure we're not in the middle of creating an account and haven't already published
    // Also wait for account data to be reloaded (stripeAccountFetched)
    // And make sure we haven't already attempted to publish
    if (
      returnedFromStripe &&
      stripeAccountFetched &&
      !isCheckingStripeStatus &&
      stripeConnected &&
      !stripeRequirementsMissing &&
      !isCreatingStripeAccount &&
      !hasPublished &&
      !isPublishing &&
      !publishAttemptedRef.current
    ) {
      console.log('[Stripe] Auto-publishing listing after successful Stripe onboarding');
      publishAttemptedRef.current = true;
      setIsPublishing(true);
      // Auto-publish after successful Stripe onboarding
      handlePublish();
    } else if (returnedFromStripe && stripeAccountFetched && !isCheckingStripeStatus) {
      console.log('[Stripe] Not auto-publishing - conditions not met:', {
        stripeConnected,
        stripeRequirementsMissing,
        isCreatingStripeAccount,
        hasPublished,
        isPublishing,
        publishAttempted: publishAttemptedRef.current,
        stripeAccountFetched,
      });
    }
  }, [
    returnedFromStripe,
    stripeAccountFetched,
    isCheckingStripeStatus,
    stripeConnected,
    stripeRequirementsMissing,
    isCreatingStripeAccount,
    hasPublished,
    isPublishing,
    handlePublish,
  ]);

  const handlePayoutModalClose = () => {
    setShowPayoutModal(false);
    setSelectedCountry('');
  };

  // Helper to get Stripe account link after account is created/exists
  const getStripeAccountLinkAndRedirect = (accountId, isNewAccount = false, needsVerification = false) => {
    const rootURL = config.marketplaceRootURL;
    const successURL = `${rootURL}/l/create-preview/${listingId.uuid}/${STRIPE_ONBOARDING_RETURN_URL_SUCCESS}`;
    const failureURL = `${rootURL}/l/create-preview/${listingId.uuid}/${STRIPE_ONBOARDING_RETURN_URL_FAILURE}`;

    // Determine link type based on account status
    // For new accounts, use account_onboarding (no accountId)
    // For existing accounts, use account_update (with accountId)
    // The API will handle verification requirements automatically via collectionOptions
    const linkType = isNewAccount ? 'account_onboarding' : 'account_update';

    const params = {
      successURL,
      failureURL,
      type: linkType,
    };

    // Only add accountId for existing accounts (not for new account onboarding)
    if (accountId && !isNewAccount) {
      params.accountId = accountId;
    }

    onGetStripeConnectAccountLink(params)
      .then(url => {
        // Redirect immediately to Stripe
        window.location.href = url;
      })
      .catch(err => {
        console.error('Failed to get Stripe account link:', err);
        setIsCreatingStripeAccount(false);
      });
  };

  const handleGoToStripe = () => {
    console.log('[Stripe] handleGoToStripe called:', {
      stripeConnected,
      stripeAccountId: stripeAccount?.id?.uuid || stripeAccount?.id,
      stripeRequirementsMissing,
      selectedCountry,
    });

    if (stripeConnected) {
      // Account exists - determine if it needs verification or just update
      const needsVerification = stripeRequirementsMissing;
      // Extract UUID string from UUID object
      const accountIdString = stripeAccount.id?.uuid || stripeAccount.id;
      
      console.log('[Stripe] Redirecting to Stripe for existing account:', {
        accountIdString,
        needsVerification,
        linkType: needsVerification ? 'account_update' : 'account_update',
      });
      getStripeAccountLinkAndRedirect(accountIdString, false, needsVerification);
    } else {
      // No account - need to create one first
      console.log('[Stripe] No valid Stripe account found - creating new account');
      
      if (!selectedCountry) {
        console.warn('[Stripe] Country is required but not selected');
        return; // Country is required
      }

      // Set flag to prevent publishing during account creation
      setIsCreatingStripeAccount(true);

      // Create business profile URL (user's profile page)
      const pathToProfilePage = ensuredCurrentUser?.id?.uuid
        ? createResourceLocatorString('ProfilePage', routeConfiguration, { id: ensuredCurrentUser.id.uuid }, {})
        : '/';
      const rootUrl = config.marketplaceRootURL?.replace(/\/$/, '') || '';
      const businessProfileURL = rootUrl && !rootUrl.includes('localhost')
        ? `${rootUrl}${pathToProfilePage}?mode=storefront`
        : `https://test-marketplace.com${pathToProfilePage}?mode=storefront`;

      const createParams = {
        country: selectedCountry,
        accountType: 'individual', // Always individual, no choice needed
        businessProfileMCC: config.stripe?.defaultMCC || '5734',
        businessProfileURL,
        stripePublishableKey: config.stripe?.publishableKey,
      };

      console.log('[Stripe] Creating Stripe account with params:', createParams);
      
      onCreateStripeAccount(createParams)
        .then(newStripeAccount => {
          console.log('[Stripe] Stripe account created successfully:', {
            accountId: newStripeAccount.id?.uuid || newStripeAccount.id,
          });
          
          // Account created, now get the onboarding link and redirect immediately
          // Use account_onboarding type for new accounts
          // Extract UUID string from UUID object
          const newAccountIdString = newStripeAccount.id?.uuid || newStripeAccount.id;
          // The flag will be reset when user returns from Stripe
          getStripeAccountLinkAndRedirect(newAccountIdString, true);
        })
        .catch(err => {
          console.error('[Stripe] Failed to create Stripe account:', err);
          setIsCreatingStripeAccount(false);
        });
    }
  };

  const handleEdit = () => {
    history.push(`/l/create?draft=${listingId.uuid}`);
  };

  // Initialize price modal state when opening
  useEffect(() => {
    if (showPriceModal && currentListing.attributes?.price) {
      const defaultPrice = currentListing.attributes.price.amount;
      setModalDefaultPrice(defaultPrice);
      const priceVariants = currentListing.attributes.publicData?.priceVariants || [];
      setModalPriceVariants(priceVariants.map(v => {
        // Determine type from variant data if not present
        let variantType = v.type;
        if (!variantType) {
          // Infer type from fields
          if (v.period || (v.dates && Array.isArray(v.dates) && v.dates.length > 0)) {
            variantType = 'period';
          } else if (v.minLength || v.minDuration || v.maxLength || v.maxDuration || v.duration) {
            variantType = 'duration';
          }
        }
        return {
          ...v,
          type: variantType || 'duration', // Default to duration if cannot determine
          id: v.id || Date.now().toString() + Math.random(),
        };
      }));
      setShowAddPriceVariant(false);
      setEditingPriceVariant(null);
      setNewPriceVariant({
        type: 'length',
        price: defaultPrice || null,
        minLength: null,
        maxLength: '',
        dates: [],
      });
    }
  }, [showPriceModal, currentListing.attributes?.price, currentListing.attributes?.publicData?.priceVariants]);

   // Handle click outside availability modal to close it
  useEffect(() => {
    if (!showAvailabilityModal) return;

    const handleClickOutside = (event) => {
      // The modal container is the white box, its parent is the scrollLayer (backdrop)
      const modalContainer = event.target.closest(`.${css.availabilityModalContainer}`);
      
      // If the click is not inside the modal container, close the modal
      if (!modalContainer && event.target.closest('[class*="scrollLayer"]')) {
        setShowAvailabilityModal(false);
      }
    };

    // Add listener with a small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 200);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAvailabilityModal]);

  // Handle click outside price modal to close it
  useEffect(() => {
    if (!showPriceModal) return;

    const handleClickOutside = (event) => {
      const modalContainer = event.target.closest(`.${css.availabilityModalContainer}`);
      
      if (!modalContainer && event.target.closest('[class*="scrollLayer"]')) {
        handleClosePriceModal();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 200);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPriceModal]);

  // Handle click outside location modal to close it
  useEffect(() => {
    if (!showLocationModal) return;

    const handleClickOutside = (event) => {
      const modalContainer = event.target.closest(`.${css.availabilityModalContainer}`);
      
      if (!modalContainer && event.target.closest('[class*="scrollLayer"]')) {
        setShowLocationModal(false);
        setShowAddressSearch(false);
        setShowFullForm(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 200);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationModal]);

  // Initialize modal state when opening availability modal
  useEffect(() => {
    if (showAvailabilityModal && currentListing.id) {
      // Initialize with current available dates
      setModalSelectedDates(availableDates);
      // Convert exceptions to modal format - always preserve original exceptions
      const modalExceptionsList = availabilityExceptions
        .filter(exc => exc.attributes && exc.attributes.seats === 0)
        .map(exc => {
          const start = new Date(exc.attributes.start);
          const end = new Date(exc.attributes.end);
          const dates = [];
          const currentDate = new Date(start);
          currentDate.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          while (currentDate <= end) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          return {
            id: exc.id?.uuid || exc.id?.toString() || Date.now().toString(),
            dates: dates,
          };
        });
      // Always set exceptions when modal opens to preserve original ones
      setModalExceptions(modalExceptionsList);
      // Store original exception IDs for comparison when saving
      const originalIds = availabilityExceptions
        .filter(exc => exc.attributes && exc.attributes.seats === 0)
        .map(exc => exc.id);
      setOriginalExceptionIds(originalIds);
      setShowExceptionCalendar(false);
      setEditingException(null);
      setNewVariant({ dates: [] });
    }
  }, [showAvailabilityModal, availableDates, availabilityExceptions, currentListing.id]);

  // Exception handlers for modal
  const handleAddException = exceptionDates => {
    let updatedExceptions;
    if (editingException) {
      updatedExceptions = modalExceptions.map(exc =>
        exc.id === editingException.id ? { ...exc, dates: exceptionDates } : exc
      );
      setEditingException(null);
    } else {
      updatedExceptions = [
        ...modalExceptions,
        {
          id: Date.now().toString(),
          dates: exceptionDates,
        },
      ];
    }
    
    // Sort exceptions by start date (first date in the exception)
    const sortedExceptions = updatedExceptions.sort((a, b) => {
      const dateA = a.dates && a.dates.length > 0 ? new Date(a.dates[0]) : new Date(0);
      const dateB = b.dates && b.dates.length > 0 ? new Date(b.dates[0]) : new Date(0);
      return dateA - dateB;
    });
    
    setModalExceptions(sortedExceptions);
    setShowExceptionCalendar(false);
    setNewVariant({ dates: [] });
  };

  const handleEditException = exception => {
    setEditingException(exception);
    setNewVariant({ ...newVariant, dates: exception.dates });
    setShowExceptionCalendar(true);
  };

  const handleRemoveException = id => {
    setModalExceptions(modalExceptions.filter(e => e.id !== id));
  };

  // Format exception dates for display (e.g., "10 Dic - 13 Dic")
  const formatExceptionDates = dates => {
    if (!dates || dates.length === 0) return '';
    
    const formatDate = date => {
      const day = date.getDate();
      const monthNames = [
        'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
        'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
      ];
      const month = monthNames[date.getMonth()];
      return `${day} ${month}`;
    };

    if (dates.length === 1) {
      return formatDate(dates[0]);
    }
    const start = formatDate(dates[0]);
    const end = formatDate(dates[dates.length - 1]);
    return `${start} - ${end}`;
  };

  // Get exception dates as Date objects for calendar highlighting
  const getExceptionDatesForCalendar = () => {
    return modalExceptions.flatMap(exc => exc.dates);
  };

  // Price variant handlers
  const handleAddPriceVariant = () => {
    // Clear previous error
    setPriceVariantError(null);
    
    if (!newPriceVariant.price || newPriceVariant.price <= 0) {
      setPriceVariantError(intl.formatMessage({
        id: 'PreviewListingPage.enterValidPrice',
        defaultMessage: 'Please enter a valid price',
      }));
      return;
    }
    if (priceVariantType === 'seasonality' && newPriceVariant.dates.length === 0) {
      setPriceVariantError(intl.formatMessage({
        id: 'PreviewListingPage.selectDates',
        defaultMessage: 'Please select dates for seasonal pricing',
      }));
      return;
    }
    if (priceVariantType === 'length' && !newPriceVariant.minLength) {
      setPriceVariantError(intl.formatMessage({
        id: 'PreviewListingPage.enterMinLength',
        defaultMessage: 'Please enter minimum length',
      }));
      return;
    }
    
    // Check for duplicate minDuration in duration-type variants
    if (priceVariantType === 'length') {
      const existingDurationVariant = modalPriceVariants.find(
        v => (v.type === 'duration' || v.minDuration || v.minLength) && 
             (v.minDuration || v.minLength) === newPriceVariant.minLength &&
             (!editingPriceVariant || v.id !== editingPriceVariant.id)
      );
      if (existingDurationVariant) {
        setPriceVariantError(intl.formatMessage({
          id: 'PreviewListingPage.duplicateMinDuration',
          defaultMessage: 'A price variant with this minimum duration already exists',
        }));
        return;
      }
    }
    
    // Check for overlapping dates in period-type variants
    if (priceVariantType === 'seasonality' && newPriceVariant.dates.length > 0) {
      // Get all dates from existing period-type variants (excluding the one being edited)
      const existingPeriodDates = modalPriceVariants
        .filter(v => (v.type === 'period' || v.dates || v.period) && 
                     (!editingPriceVariant || v.id !== editingPriceVariant.id))
        .flatMap(v => {
          // If dates array exists (from modal), use it
          if (v.dates && Array.isArray(v.dates) && v.dates.length > 0) {
            return v.dates.map(d => {
              const date = d instanceof Date ? d : new Date(d);
              return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            });
          }
          // If period string exists (from API), parse it
          if (v.period && typeof v.period === 'string') {
            return v.period.split(',').map(dateStr => {
              // Parse YYYYMMDD format
              const year = parseInt(dateStr.substring(0, 4), 10);
              const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
              const day = parseInt(dateStr.substring(6, 8), 10);
              return `${year}-${month}-${day}`;
            });
          }
          return [];
        });
      
      // Check if any of the new dates overlap
      const hasOverlap = newPriceVariant.dates.some(d => {
        const date = d instanceof Date ? d : new Date(d);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        return existingPeriodDates.includes(dateKey);
      });
      
      if (hasOverlap) {
        setPriceVariantError(intl.formatMessage({
          id: 'PreviewListingPage.overlappingDates',
          defaultMessage: 'Some dates overlap with an existing price variant',
        }));
        return;
      }
    }

    // Map UI type to API type: 'length' -> 'duration', 'seasonality' -> 'period'
    const apiType = priceVariantType === 'length' ? 'duration' : priceVariantType === 'seasonality' ? 'period' : priceVariantType;
    
    const variant = {
      id: editingPriceVariant?.id || Date.now().toString() + Math.random(),
      type: apiType, // Always use API type format
      priceInSubunits: newPriceVariant.price,
      ...(priceVariantType === 'length' && {
        minDuration: newPriceVariant.minLength,
        maxDuration: newPriceVariant.maxLength || null,
      }),
      ...(priceVariantType === 'seasonality' && {
        dates: newPriceVariant.dates,
      }),
    };

    if (editingPriceVariant) {
      setModalPriceVariants(
        modalPriceVariants.map(v => (v.id === editingPriceVariant.id ? variant : v))
      );
      setEditingPriceVariant(null);
    } else {
      setModalPriceVariants([...modalPriceVariants, variant]);
    }

    setShowAddPriceVariant(false);
    setNewPriceVariant({
      type: 'length',
      price: modalDefaultPrice || null,
      minLength: null,
      maxLength: '',
      dates: [],
    });
  };

  const handleEditPriceVariant = variant => {
    setEditingPriceVariant(variant);
    // Map API type to UI type: 'duration' -> 'length', 'period' -> 'seasonality'
    const uiType = variant.type === 'duration' ? 'length' : variant.type === 'period' ? 'seasonality' : variant.type || 'length';
    setPriceVariantType(uiType);
    setNewPriceVariant({
      type: variant.type || uiType, // Keep API type format
      price: variant.priceInSubunits || null,
      minLength: variant.minDuration || null,
      maxLength: variant.maxDuration || '',
      dates: variant.dates || [],
    });
    setShowAddPriceVariant(true);
    setPriceVariantError(null);
  };

  const handleRemovePriceVariant = id => {
    setModalPriceVariants(modalPriceVariants.filter(v => v.id !== id));
  };

  // Handle close price modal and reset state
  const handleClosePriceModal = () => {
    setShowPriceModal(false);
    // Reset to original values
    if (currentListing.attributes?.price) {
      const defaultPrice = currentListing.attributes.price.amount;
      setModalDefaultPrice(defaultPrice);
      const priceVariants = currentListing.attributes.publicData?.priceVariants || [];
      setModalPriceVariants(priceVariants.map(v => {
        // Determine type from variant data if not present
        let variantType = v.type;
        if (!variantType) {
          // Infer type from fields
          if (v.period || (v.dates && Array.isArray(v.dates) && v.dates.length > 0)) {
            variantType = 'period';
          } else if (v.minLength || v.minDuration || v.maxLength || v.maxDuration || v.duration) {
            variantType = 'duration';
          }
        }
        return {
          ...v,
          type: variantType || 'duration', // Default to duration if cannot determine
          id: v.id || Date.now().toString() + Math.random(),
        };
      }));
    }
    setShowAddPriceVariant(false);
    setEditingPriceVariant(null);
  };

  // Handle save price from modal
  const handleSavePrice = async () => {
    setUpdatingListing(true);
    try {
      // Format price variants for API
      const formattedPriceVariants = modalPriceVariants
        .filter(v => v.priceInSubunits || v.price) // Only include variants with a price
        .map((v, index) => {
          // Determine type from variant data if not present
          let variantType = v.type;
          if (!variantType) {
            // Infer type from fields
            if (v.period || (v.dates && Array.isArray(v.dates) && v.dates.length > 0)) {
              variantType = 'period';
            } else if (v.minLength || v.minDuration || v.maxLength || v.maxDuration || v.duration) {
              variantType = 'duration';
            } else {
              variantType = 'duration'; // Default
            }
          }
          
          const variant = {
            name: v.name || `variant_${v.id || index}`,
            priceInSubunits: v.priceInSubunits || (v.price ? Math.round(v.price * 100) : 0),
            type: variantType, // Always include type
          };
          
          // Add duration fields for length-based variants
          // Check both minDuration/minLength and maxDuration/maxLength
          const minDuration = v.minDuration || v.minLength;
          const maxDuration = v.maxDuration || v.maxLength;
          
          if (variantType === 'length' || variantType === 'duration' || minDuration) {
            if (minDuration) {
              variant.minLength = minDuration;
            }
            if (maxDuration) {
              variant.maxLength = maxDuration;
            }
          }
          
          // Add period for seasonality/period-based variants
          // Check if period exists (from API) or dates (from modal)
          if (v.period) {
            variant.period = v.period;
          } else if ((variantType === 'seasonality' || variantType === 'period') && v.dates && v.dates.length > 0) {
            variant.period = v.dates
              .map(d => {
                const date = d instanceof Date ? d : new Date(d);
                return date.toISOString().split('T')[0].replace(/-/g, '');
              })
              .join(',');
          }
          
          // Remove undefined/null values (but keep type even if it's the only field)
          Object.keys(variant).forEach(key => {
            if (variant[key] === undefined || variant[key] === null) {
              delete variant[key];
            }
          });
          
          // Ensure type is always present
          if (!variant.type) {
            variant.type = variantType;
          }
          
          return variant;
        });
      
      // Update default price and variants together
      await onUpdateListing(
        'details',
        {
          id: listingId,
          price: {
            amount: modalDefaultPrice,
            currency: listing.attributes.price.currency,
          },
          publicData: {
            ...listing.attributes.publicData,
            priceVariationsEnabled: formattedPriceVariants.length > 0,
            priceVariants: formattedPriceVariants,
          },
        },
        config
      );

      // Refresh listing
      await onFetchListing({ id: listingId }, config);
      setShowPriceModal(false);
    } catch (error) {
      console.error('Failed to update price:', error);
      setNotificationTitle(
        intl.formatMessage(
          { id: 'PreviewListingPage.updateError' },
          { defaultMessage: 'Failed to update price. Please try again.' }
        )
      );
      setNotificationMessage('');
      setNotificationType('error');
    } finally {
      setUpdatingListing(false);
    }
  };

  // Initialize location modal when opened
  useEffect(() => {
    if (showLocationModal) {
      const location = currentListing.attributes?.publicData?.location || {};
      const geolocation = location.geolocation || null;
      let address = location.address || {};
      
      // Handle address as string or object
      if (typeof address === 'string') {
        // If address is a string, try to parse it or set empty object
        address = {};
      }
      
      // Ensure address is an object
      if (!address || typeof address !== 'object') {
        address = {};
      }
      
      // Also check if address fields are stored directly in location object
      // (some implementations save address fields directly in location instead of location.address)
      const streetFromLocation = location.street || location.addressLine1 || '';
      const cityFromLocation = location.city || '';
      const regionFromLocation = location.region || location.state || '';
      const postalCodeFromLocation = location.postalCode || location.postal_code || '';
      const countryFromLocation = location.country || '';
      
      // Parse addressLine1 if it contains both street and number
      let parsedStreet = '';
      let parsedStreetNumber = '';
      const addressLine1Value = address.addressLine1 || streetFromLocation || '';
      if (addressLine1Value) {
        // Try to parse "Street Name 123" format
        const match = addressLine1Value.match(/^(.+?)\s+(\d+)$/);
        if (match) {
          parsedStreet = match[1].trim();
          parsedStreetNumber = match[2].trim();
        } else {
          parsedStreet = addressLine1Value;
        }
      }
      
      setModalGeolocation(geolocation);
      setManualAddress({
        street: address.street || parsedStreet || address.addressLine1 || streetFromLocation || '',
        streetNumber: address.streetNumber || parsedStreetNumber || location.streetNumber || '',
        addressLine2: address.addressLine2 || location.addressLine2 || '',
        city: address.city || cityFromLocation || '',
        region: address.region || address.state || regionFromLocation || '',
        postalCode: address.postalCode || address.postal_code || postalCodeFromLocation || '',
        country: address.country || countryFromLocation || '',
      });
      setModalLocationVisible(locationVisible);
      setModalHandByHandAvailable(handByHandAvailable);
      // Always show full form (prefilled if address exists)
      setShowFullForm(true);
      setShowAddressSearch(false); // Don't show autocomplete by default, show form directly
    }
  }, [showLocationModal, currentListing.attributes?.publicData?.location, locationVisible, handByHandAvailable]);

  // Handle save location from modal
  const handleSaveLocation = async () => {
    setUpdatingListing(true);
    try {
      // Validate required fields if full form is shown
      if (showFullForm) {
        const invalid = [];
        if (!manualAddress.street.trim()) invalid.push('street');
        if (!manualAddress.streetNumber.trim()) invalid.push('streetNumber');
        if (!manualAddress.city.trim()) invalid.push('city');
        if (!manualAddress.region.trim()) invalid.push('region');
        if (!manualAddress.postalCode.trim()) invalid.push('postalCode');
        if (!manualAddress.country.trim()) invalid.push('country');
        
        if (invalid.length > 0) {
          setInvalidFields(invalid);
          setUpdatingListing(false);
          return;
        }
      }

      // Build location object
      const locationData = {
        geolocation: modalGeolocation,
        address: showFullForm ? manualAddress : currentListing.attributes?.publicData?.location?.address || {},
      };

      // Update location and options
      await onUpdateListing(
        'location',
        {
          id: listingId,
          publicData: {
            ...currentListing.attributes?.publicData,
            location: locationData,
            locationVisible: modalLocationVisible,
            handByHandAvailable: modalHandByHandAvailable,
          },
        },
        config
      );

      // Update local state
      setLocationVisible(modalLocationVisible);
      setHandByHandAvailable(modalHandByHandAvailable);

      // Refresh listing
      await onFetchListing({ id: listingId }, config);
      setShowLocationModal(false);
      setShowAddressSearch(false);
      setShowFullForm(false);
    } catch (error) {
      console.error('Failed to update location:', error);
    } finally {
      setUpdatingListing(false);
    }
  };

  // Handle save availability from modal
  const handleSaveAvailability = async () => {
    setUpdatingListing(true);
    try {
      // Build availability plan from selected dates
      const timezone = getDefaultTimeZoneOnBrowser();
      const availabilityPlan = {
        type: 'availability-plan/time',
        timezone,
        entries: [
          {
            dayOfWeek: 'mon',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
          {
            dayOfWeek: 'tue',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
          {
            dayOfWeek: 'wed',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
          {
            dayOfWeek: 'thu',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
          {
            dayOfWeek: 'fri',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
          {
            dayOfWeek: 'sat',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
          {
            dayOfWeek: 'sun',
            startTime: '00:00',
            endTime: '00:00',
            seats: 1,
          },
        ],
      };

      // Calculate availableFrom and availableUntil from modalSelectedDates
      let availableFrom = null;
      let availableUntil = null;
      if (modalSelectedDates && modalSelectedDates.length > 0) {
        // Sort dates to get the first and last
        const sortedDates = [...modalSelectedDates].sort((a, b) => a.getTime() - b.getTime());
        availableFrom = sortedDates[0].toISOString();
        availableUntil = sortedDates[sortedDates.length - 1].toISOString();
      }

      // Update availability plan and date range
      const updateData = {
        id: listingId,
        availabilityPlan,
      };

      // Add availableFrom and availableUntil to publicData if dates are selected
      if (availableFrom && availableUntil) {
        updateData.publicData = {
          ...currentListing.attributes?.publicData,
          availableFrom,
          availableUntil,
        };
      }

      await onUpdateListing(
        'details',
        updateData,
        config
      );

      // Handle availability exceptions separately
      const sdk = createInstance({
        clientId: config.sdk?.clientId || process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
      });

      // Use currentListing.id directly (same format as EditListingAvailabilityPanel)
      const listingIdForSDK = currentListing.id;

      // Helper to normalize IDs for comparison
      const normalizeId = (id) => {
        if (!id) return null;
        if (typeof id === 'object' && id.uuid) return id.uuid;
        if (typeof id === 'object' && id.id) return id.id;
        return String(id);
      };

      // Get current exception IDs from modal (those that still exist)
      const currentExceptionIds = modalExceptions
        .map(exc => normalizeId(exc.id))
        .filter(id => id && originalExceptionIds.some(origId => normalizeId(origId) === id));

      // Find exceptions to delete (those in original but not in current)
      const exceptionsToDelete = originalExceptionIds.filter(origId => {
        const origIdNormalized = normalizeId(origId);
        return origIdNormalized && !currentExceptionIds.includes(origIdNormalized);
      });

      // Delete removed exceptions
      for (const exceptionId of exceptionsToDelete) {
        try {
          const idToDelete = normalizeId(exceptionId);
          if (!idToDelete) continue;
          
          // SDK expects { id: ... } format - can be UUID object or string
          await sdk.availabilityExceptions.delete({ id: idToDelete });
        } catch (deleteError) {
          console.warn('Failed to delete exception:', exceptionId, deleteError);
          // Continue with other deletions even if one fails
        }
      }

      // Find new exceptions to create (those not in original)
      // New exceptions have string IDs (Date.now().toString()), original ones have UUID objects
      const newExceptions = modalExceptions.filter(exc => {
        const excIdNormalized = normalizeId(exc.id);
        // If ID is a numeric string (from Date.now()), it's a new exception
        if (excIdNormalized && /^\d+$/.test(excIdNormalized)) {
          return true;
        }
        // Otherwise check if it exists in original exceptions
        return !originalExceptionIds.some(origId => normalizeId(origId) === excIdNormalized);
      });

      // Create new exceptions
      if (newExceptions.length > 0) {
        console.log('Creating new exceptions:', newExceptions.length);
        for (const exc of newExceptions) {
          try {
            const dates = exc.dates;
            if (!dates || dates.length === 0) {
              console.warn('Skipping exception with no dates:', exc);
              continue;
            }
            
            let start, end;
            
            if (dates.length === 1) {
              start = new Date(dates[0]);
              start.setHours(0, 0, 0, 0);
              end = new Date(dates[0]);
              end.setHours(23, 0, 0, 0); // 23:00:00 to satisfy API requirements
            } else {
              start = new Date(dates[0]);
              start.setHours(0, 0, 0, 0);
              end = new Date(dates[dates.length - 1]);
              end.setHours(23, 0, 0, 0); // 23:00:00 to satisfy API requirements
            }

            console.log('Creating exception:', {
              listingId: listingIdForSDK,
              start: start.toISOString(),
              end: end.toISOString(),
              seats: 0,
            });

            const result = await sdk.availabilityExceptions.create({
              listingId: listingIdForSDK,
              start: start.toISOString(),
              end: end.toISOString(),
              seats: 0,
            });
            
            console.log('Exception created successfully:', result);
          } catch (createError) {
            console.error('Failed to create exception:', exc, createError);
            // Show error to user
            setNotificationTitle(
              intl.formatMessage(
                { id: 'PreviewListingPage.updateError' },
                { defaultMessage: 'Failed to create exception. Please try again.' }
              )
            );
            setNotificationMessage(createError.message || 'An unknown error occurred.');
            setNotificationType('error');
            // Continue with other creations even if one fails
          }
        }
      }

      // Refresh listing to update calendar
      await onFetchListing({ id: listingId }, config);
      
      // Reload availability exceptions to reflect changes
      const sdkForReload = createInstance({
        clientId: config.sdk?.clientId || process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      oneYearFromNow.setHours(23, 59, 59, 999);
      
      const exceptionsResponse = await sdkForReload.availabilityExceptions.query({
        listingId: currentListing.id,
        start: today,
        end: oneYearFromNow,
      });
      
      const updatedExceptions = exceptionsResponse.data.data || [];
      setAvailabilityExceptions(updatedExceptions);

      // Convert exceptions to disabled dates (Date objects)
      const exceptionDateObjects = [];
      updatedExceptions.forEach(exception => {
        if (exception.attributes.seats === 0) {
          // Unavailable exception
          const start = new Date(exception.attributes.start);
          const end = new Date(exception.attributes.end);
          const currentDate = new Date(start);
          currentDate.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);

          while (currentDate <= end) {
            const dateObj = new Date(currentDate);
            dateObj.setHours(0, 0, 0, 0);
            // Check if date is not already in the array
            const exists = exceptionDateObjects.some(d => 
              d.getTime() === dateObj.getTime()
            );
            if (!exists) {
              exceptionDateObjects.push(dateObj);
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
      setDisabledDates(exceptionDateObjects);

      // Calculate available dates (respecting availableFrom/availableUntil if set, minus exceptions) as Date objects
      const available = [];
      
      // Determine the date range based on availableFrom/availableUntil or default to today + 1 year
      let rangeStart = today;
      let rangeEnd = oneYearFromNow;
      
      // Get updated listing data (after refresh)
      const updatedListing = getListing(listingId);
      if (updatedListing?.attributes?.publicData?.availableFrom) {
        const fromDate = new Date(updatedListing.attributes.publicData.availableFrom);
        fromDate.setHours(0, 0, 0, 0);
        // Use the later of today or availableFrom
        if (fromDate > rangeStart) {
          rangeStart = fromDate;
        }
      }
      
      if (updatedListing?.attributes?.publicData?.availableUntil) {
        const untilDate = new Date(updatedListing.attributes.publicData.availableUntil);
        untilDate.setHours(23, 59, 59, 999);
        // Use the earlier of oneYearFromNow or availableUntil
        if (untilDate < rangeEnd) {
          rangeEnd = untilDate;
        }
      }
      
      const currentDateForAvailable = new Date(rangeStart);
      while (currentDateForAvailable <= rangeEnd) {
        const dateObj = new Date(currentDateForAvailable);
        dateObj.setHours(0, 0, 0, 0);
        // Check if date is not in disabled dates
        const isDisabled = exceptionDateObjects.some(d => 
          d.getTime() === dateObj.getTime()
        );
        if (!isDisabled) {
          available.push(dateObj);
        }
        currentDateForAvailable.setDate(currentDateForAvailable.getDate() + 1);
      }
      setAvailableDates(available);
      
      setShowAvailabilityModal(false);
    } catch (error) {
      console.error('Failed to update availability:', error);
      setNotificationTitle(
        intl.formatMessage(
          { id: 'PreviewListingPage.updateError' },
          { defaultMessage: 'Failed to update availability. Please try again.' }
        )
      );
      setNotificationMessage('');
      setNotificationType('error');
    } finally {
      setUpdatingListing(false);
    }
  };

  // Show loading while fetching
  if (!listingFetched) {
    return (
      <Page
        title={intl.formatMessage({ id: 'PreviewListingPage.title' })}
        scrollingDisabled={scrollingDisabled}
      >
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={null}>
          <div className={css.root}>
            <div className={css.container}>
              <div className={css.loadingContainer}>
                <IconSpinner />
                <p>
                  <FormattedMessage
                    id="PreviewListingPage.loading"
                    defaultMessage="Loading listing..."
                  />
                </p>
              </div>
            </div>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  if (listingNotFound) {
    return <NotFoundPage />;
  }

  if (!isDraft) {
    // If listing is not a draft, redirect to listing page
    const listingPath = createResourceLocatorString(
      'ListingPage',
      routeConfiguration,
      { id: listingId.uuid, slug: createSlug(currentListing.attributes.title) },
      {}
    );
    history.push(listingPath);
    return null;
  }

  const title = intl.formatMessage(
    { id: 'PreviewListingPage.title' },
    { marketplaceName: config.marketplaceName }
  );
  const listing = currentListing;

  // Debug: Log listing data (commented out to reduce console noise)
  // console.log('📋 Preview listing data:', {
  //   listing,
  //   images: listing.images,
  //   imagesCount: listing.images?.length,
  //   firstImage: listing.images?.[0],
  //   firstImageVariants: listing.images?.[0]?.attributes?.variants,
  // });

  const handleNotificationClose = () => {
    setNotificationTitle(null);
    setNotificationMessage(null);
  };

  // Show loading page while checking Stripe status or publishing
  if (isCheckingStripeStatus || isPublishing) {
    return (
      <LoadingPage
        topbar={<TopbarContainer />}
        scrollingDisabled={scrollingDisabled}
        intl={intl}
      />
    );
  }

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <NotificationBanner
        title={notificationTitle}
        message={notificationMessage}
        type={notificationType}
        duration={5000}
        onClose={handleNotificationClose}
      />
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={null}>
        <div className={css.root}>
          <div className={css.container}>
            <h1 className={css.title}>
              <FormattedMessage id="PreviewListingPage.heading" />
            </h1>
            <p className={css.description}>
              <FormattedMessage id="PreviewListingPage.description" />
            </p>

            {/* Preview Content */}
            <div className={css.previewCard}>

              {/* Main Content - Images and Title Side by Side */}
              <div className={css.mainContent}>
                {/* Images Gallery */}
                {listing.images && listing.images.length > 0 && (
                  <div className={css.imagesSection}>
                    {/* Main Image */}
                    <div className={css.mainImageWrapper}>
                      {(() => {
                        const mainImage = listing.images[selectedImageIndex];
                        const variants = mainImage?.attributes?.variants || {};
                        const imageUrl =
                          variants['listing-card-6x']?.url ||
                          variants['listing-card-4x']?.url ||
                          variants['listing-card-2x']?.url ||
                          variants['listing-card']?.url ||
                          variants['scaled-large']?.url ||
                          variants['scaled-medium']?.url;

                        return (
                          <img
                            src={imageUrl}
                            alt={`${listing.attributes.title} - Image ${selectedImageIndex + 1}`}
                            className={css.mainImage}
                            onClick={() => handleImageClick(selectedImageIndex)}
                            style={{ cursor: 'pointer' }}
                            onError={e => {
                              console.error('Failed to load image:', imageUrl);
                              e.target.style.display = 'none';
                            }}
                          />
                        );
                      })()}
                    </div>

                    {/* Thumbnails - Horizontally scrollable, delete icons if more than 4 images */}
                    <div className={css.thumbnailsContainer}>
                      <div className={css.thumbnailsScroll}>
                                                {/* Upload New Image Button */}
                                                <div className={css.thumbnail}>
                          <label className={css.uploadThumbnail}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              style={{ display: 'none' }}
                              disabled={uploadingImage}
                            />
                            <div className={css.uploadIcon}>{uploadingImage ? '...' : '+'}</div>
                          </label>
                        </div>
                        {listing.images.map((image, index) => {
                          const variants = image.attributes?.variants || {};
                          const imageUrl =
                            variants['listing-card-2x']?.url ||
                            variants['listing-card']?.url ||
                            variants['scaled-medium']?.url;
                          const isDeleting = deletingImageId === image.id?.uuid;

                          return (
                            <div
                              key={image.id?.uuid || index}
                              className={`${css.thumbnail} ${
                                index === selectedImageIndex ? css.thumbnailActive : ''
                              } ${isDeleting ? css.thumbnailDeleting : ''}`}
                            >
                              <div onClick={() => setSelectedImageIndex(index)}>
                                <img
                                  src={imageUrl}
                                  alt={`Thumbnail ${index + 1}`}
                                  className={css.thumbnailImage}
                                />
                              </div>
                              <button
                                className={css.thumbnailDeleteButton}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleImageDelete(image.id, index);
                                }}
                                disabled={isDeleting}
                                aria-label={intl.formatMessage(
                                  { id: 'PreviewListingPage.deleteImage' },
                                  { index: index + 1 }
                                )}
                              >
                                {isDeleting ? (
                                  '⏳'
                                ) : (
                                  <svg
                                    className={css.trashIcon}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                            {/* Breadcrumb */}
                            {listing.attributes.publicData?.category && (
                <div className={css.breadcrumb}>
                  <NamedLink
                    name="SearchPage"
                    to={{ search: `?keywords=${encodeURIComponent(listing.attributes.publicData.category)}` }}
                    className={css.breadcrumbItem}
                  >
                    {listing.attributes.publicData.category.charAt(0).toUpperCase() + 
                     listing.attributes.publicData.category.slice(1).toLowerCase()}
                  </NamedLink>
                  {listing.attributes.publicData.subcategory && (
                    <>
                      <span className={css.breadcrumbSeparator}>›</span>
                      <NamedLink
                        name="SearchPage"
                        to={{ search: `?keywords=${encodeURIComponent(listing.attributes.publicData.subcategory)}` }}
                        className={css.breadcrumbItem}
                      >
                        {listing.attributes.publicData.subcategory.charAt(0).toUpperCase() + 
                         listing.attributes.publicData.subcategory.slice(1).toLowerCase()}
                      </NamedLink>
                    </>
                  )}
                </div>
              )}
              
              {/* Editable Description */}
              <div className={css.descriptionSection}>
                <div className={css.descriptionHeader}>
                  <h3 className={css.sectionTitle}>
                    <FormattedMessage
                      id="PreviewListingPage.descriptionLabel"
                      defaultMessage="Description"
                    />
                  </h3>
                  {editingField !== 'description' && (
                    <button
                      onClick={() => handleEditField('description')}
                      className={css.modifyLink}
                    >
                      <FormattedMessage
                        id="PreviewListingPage.modifyLink"
                        defaultMessage="Edit"
                      />
                    </button>
                  )}
                </div>
                <div className={css.editableField}>
                  {editingField === 'description' ? (
                    <>
                      <textarea
                        className={css.descriptionTextarea}
                        value={fieldValues.description}
                        onChange={e => handleChangeField('description', e.target.value)}
                        rows={8}
                      />
                      <div className={css.editButtons}>
                        <button
                          onClick={() => handleSaveField('description')}
                          className={css.saveButton}
                          disabled={updatingListing || !fieldValues.description}
                        >
                          <FormattedMessage
                            id="PreviewListingPage.saveButton"
                            defaultMessage="Save"
                          />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className={css.cancelButton}
                          disabled={updatingListing}
                        >
                          <FormattedMessage
                            id="PreviewListingPage.cancelButton"
                            defaultMessage="Cancel"
                          />
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className={css.listingDescription}>
                      {fieldValues.description || listing.attributes.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Condition and Brand - Below Description, Above Details Title */}
              {listing.attributes.publicData && (
                <>
                  {/* Condition Field */}
                  <div className={css.conditionBrandSection}>
                    <div className={css.detailItem}>
                      <span className={css.detailLabel}>
                        <FormattedMessage id="PreviewListingPage.condition" defaultMessage="Condition" />:
                      </span>
                      {editingField === 'condition' ? (
                        <div className={css.detailEditWrapper}>
                          <select
                            value={fieldValues.condition || listing.attributes?.publicData?.condition || 'Used'}
                            onChange={e => handleChangeField('condition', e.target.value)}
                            className={css.detailSelect}
                            autoFocus
                          >
                            <option value="New">
                              {intl.formatMessage({ id: 'PreviewListingPage.condition.new', defaultMessage: 'New' })}
                            </option>
                            <option value="Like New">
                              {intl.formatMessage({ id: 'PreviewListingPage.condition.likeNew', defaultMessage: 'Like New' })}
                            </option>
                            <option value="Used">
                              {intl.formatMessage({ id: 'PreviewListingPage.condition.used', defaultMessage: 'Used' })}
                            </option>
                            <option value="Refurbished">
                              {intl.formatMessage({ id: 'PreviewListingPage.condition.refurbished', defaultMessage: 'Refurbished' })}
                            </option>
                          </select>
                          <div className={css.editActions}>
                            <button
                              onClick={() => handleSaveField('condition')}
                              className={css.saveButton}
                              disabled={updatingListing}
                            >
                              <FormattedMessage id="PreviewListingPage.saveButton" />
                            </button>
                            <button
                              onClick={() => handleCancelEdit('condition')}
                              className={css.cancelButton}
                              disabled={updatingListing}
                            >
                              <FormattedMessage id="PreviewListingPage.cancelButton" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className={css.detailValue}>
                          {(() => {
                            const condition = fieldValues.condition || listing.attributes?.publicData?.condition || 'Used';
                            let conditionKey = 'PreviewListingPage.condition.used';
                            if (condition === 'New') {
                              conditionKey = 'PreviewListingPage.condition.new';
                            } else if (condition === 'Like New') {
                              conditionKey = 'PreviewListingPage.condition.likeNew';
                            } else if (condition === 'Refurbished') {
                              conditionKey = 'PreviewListingPage.condition.refurbished';
                            }
                            return intl.formatMessage(
                              { id: conditionKey, defaultMessage: condition }
                            );
                          })()}
                          <button onClick={() => handleEditField('condition')} className={css.editLink}>
                            <FormattedMessage
                              id="PreviewListingPage.editLink"
                              defaultMessage="edit"
                            />
                          </button>
                        </span>
                      )}
                    </div>

                    {/* Brand Field */}
                    <div className={css.detailItem}>
                      <span className={css.detailLabel}>
                        <FormattedMessage id="PreviewListingPage.brand" defaultMessage="Brand" />:
                      </span>
                      {editingField === 'brand' ? (
                        <div className={css.detailEditWrapper}>
                          <input
                            type="text"
                            value={fieldValues.brand || listing.attributes?.publicData?.brand || ''}
                            onChange={e => handleChangeField('brand', e.target.value)}
                            className={css.detailInput}
                            autoFocus
                          />
                          <div className={css.editActions}>
                            <button
                              onClick={() => handleSaveField('brand')}
                              className={css.saveButton}
                              disabled={updatingListing}
                            >
                              <FormattedMessage id="PreviewListingPage.saveButton" />
                            </button>
                            <button
                              onClick={() => handleCancelEdit('brand')}
                              className={css.cancelButton}
                              disabled={updatingListing}
                            >
                              <FormattedMessage id="PreviewListingPage.cancelButton" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className={css.detailValue}>
                          {fieldValues.brand || listing.attributes?.publicData?.brand || ''}
                          <button onClick={() => handleEditField('brand')} className={css.editLink}>
                            <FormattedMessage
                              id="PreviewListingPage.editLink"
                              defaultMessage="edit"
                            />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Section - Key Features Below Title */}
                  <div className={css.detailsSection}>
                    <h3 className={css.sectionTitle}>
                      <FormattedMessage id="PreviewListingPage.details" defaultMessage="Details" />
                    </h3>
                    
                    {/* AI Key Features List */}
                    {(() => {
                      // Try different possible field names
                      const publicData = listing.attributes?.publicData || {};
                      const keyFeatures = 
                        publicData.AI_KeyFeatures ||
                        publicData.ai_KeyFeatures ||
                        publicData.ai_keyFeatures ||
                        publicData.keyFeatures ||
                        [];
                      
                      const keyFeaturesArray = Array.isArray(keyFeatures) ? keyFeatures : [];
                      
                      // Get the field name for updates
                      const keyFeaturesFieldName = 
                        publicData.AI_KeyFeatures ? 'AI_KeyFeatures' :
                        publicData.ai_KeyFeatures ? 'ai_KeyFeatures' :
                        publicData.ai_keyFeatures ? 'ai_keyFeatures' :
                        publicData.keyFeatures ? 'keyFeatures' :
                        'AI_KeyFeatures';
                      
                      return (
                        <div className={css.keyFeaturesListContainer}>
                          <ul className={css.keyFeaturesList}>
                            {keyFeaturesArray.map((feature, index) => (
                              <li
                                key={`${index}-${feature}`}
                                className={css.keyFeatureListItem}
                                onMouseEnter={() => setHoveredFeatureIndex(index)}
                                onMouseLeave={() => setHoveredFeatureIndex(null)}
                              >
                                <span className={css.keyFeatureBullet}></span>
                                <span className={css.keyFeatureText}>{String(feature)}</span>
                                {hoveredFeatureIndex === index && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKeyFeature(index)}
                                    className={css.keyFeatureDelete}
                                    disabled={updatingListing}
                                    aria-label={intl.formatMessage({ id: 'PreviewListingPage.removeFeature' })}
                                  >
                                    <IconDelete />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                          
                          {/* Add Feature Link */}
                          {showAddFeatureInput ? (
                            <div className={css.addFeatureInputWrapper}>
                              <input
                                type="text"
                                value={newFeatureValue}
                                onChange={e => setNewFeatureValue(e.target.value)}
                                onKeyPress={e => {
                                  if (e.key === 'Enter' && newFeatureValue.trim()) {
                                    handleAddKeyFeature(newFeatureValue.trim(), keyFeaturesArray, keyFeaturesFieldName);
                                    setNewFeatureValue('');
                                    setShowAddFeatureInput(false);
                                  }
                                }}
                                className={css.addFeatureInput}
                                autoFocus
                                placeholder={intl.formatMessage({ id: 'PreviewListingPage.addFeaturePlaceholder', defaultMessage: 'Enter feature...' })}
                              />
                              <div className={css.addFeatureActions}>
                                <button
                                  onClick={() => {
                                    if (newFeatureValue.trim()) {
                                      handleAddKeyFeature(newFeatureValue.trim(), keyFeaturesArray, keyFeaturesFieldName);
                                      setNewFeatureValue('');
                                    }
                                    setShowAddFeatureInput(false);
                                  }}
                                  className={css.saveButton}
                                  disabled={!newFeatureValue.trim() || updatingListing}
                                >
                                  <FormattedMessage id="PreviewListingPage.saveButton" />
                                </button>
                                <button
                                  onClick={() => {
                                    setNewFeatureValue('');
                                    setShowAddFeatureInput(false);
                                  }}
                                  className={css.cancelButton}
                                  disabled={updatingListing}
                                >
                                  <FormattedMessage id="PreviewListingPage.cancelButton" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowAddFeatureInput(true)}
                              className={css.addFeatureLink}
                            >
                              <FormattedMessage id="PreviewListingPage.addFeature" defaultMessage="Add" />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
                  </div>
                )}

                {/* Title and Summary Info */}
                <div className={css.summarySection}>
                  {/* Editable Title */}
                  <div className={css.titleSection}>
                    {editingField === 'title' ? (
                      <>
                        <textarea
                          value={fieldValues.title || ''}
                          onChange={e => handleChangeField('title', e.target.value)}
                          className={css.titleInput}
                          autoFocus
                          rows={1}
                        />
                        <div className={css.editActions}>
                          <button
                            onClick={() => handleSaveField('title')}
                            className={css.saveButton}
                            disabled={updatingListing}
                          >
                            <FormattedMessage id="PreviewListingPage.saveButton" />
                          </button>
                          <button
                            onClick={() => handleCancelEdit('title')}
                            className={css.cancelButton}
                            disabled={updatingListing}
                          >
                            <FormattedMessage id="PreviewListingPage.cancelButton" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className={css.listingTitle}>
                          {fieldValues.title || listing.attributes.title}
                          <button onClick={() => handleEditField('title')} className={css.editLink}>
                            <FormattedMessage
                              id="PreviewListingPage.editLink"
                              defaultMessage="edit"
                            />
                          </button>
                        </h2>
                      </>
                    )}
                  </div>

                  {/* Availability Calendar */}
                  <div className={css.calendarSection}>
                    <div className={css.calendarHeader}>
                      <button
                        onClick={() => setShowAvailabilityModal(true)}
                        className={css.modifyLink}
                      >
                        <FormattedMessage
                          id="PreviewListingPage.modifyAvailabilityLink"
                          defaultMessage="Modify availability"
                        />
                      </button>
                    </div>
                    <AvailabilityCalendar
                      selectedDates={availableDates}
                      onDatesChange={() => {}}
                      selectMode="range"
                      marketplaceColor={config.branding?.marketplaceColor || '#4A90E2'}
                      disabledDates={disabledDates}
                      readOnly={true}
                      availableFrom={currentListing.attributes?.publicData?.availableFrom}
                      availableUntil={currentListing.attributes?.publicData?.availableUntil}
                    />
                  </div>

                  {/* Price Section with Complex Logic */}
                  {listing.attributes.price &&
                    (() => {
                      const { price: minPrice, hasVariants } = calculateMinimumPrice();
                      const currency = listing.attributes.price.currency;
                      const priceVariants = listing.attributes.publicData?.priceVariants || [];

                      const defaultPrice = listing.attributes.price.amount / 100;

                      // Format price with currency symbol
                      const formatPrice = (priceAmount) => {
                        const currencyConfig = currencyFormatting(currency, { enforceSupportedCurrencies: false });
                        return intl.formatNumber(priceAmount, currencyConfig);
                      };

                      // Format price variant label
                      const formatPriceVariantLabel = variant => {
                        // Determine variant type - prioritize explicit type, then infer from fields
                        const variantType = variant.type || 
                          (variant.period || (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0) ? 'period' : null) ||
                          (variant.minLength || variant.minDuration || variant.maxLength || variant.maxDuration || variant.duration ? 'duration' : null) ||
                          'duration'; // Default fallback
                        
                        // Handle period-based variants FIRST (more specific than duration)
                        // Check for dates array first (from PreviewListingPage modal)
                        if (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0) {
                          const start = new Date(variant.dates[0]);
                          const end = new Date(variant.dates[variant.dates.length - 1]);
                          const formatDate = date => {
                            const day = date.getDate();
                            const monthNames = [
                              'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                              'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
                            ];
                            const month = monthNames[date.getMonth()];
                            return `${day} ${month}`;
                          };
                          return `${formatDate(start)} - ${formatDate(end)}`;
                        }
                        
                        // Check for period string (from ListingConfigurationPage or PricingConfiguration)
                        if (variant.period && typeof variant.period === 'string' && variant.period.trim()) {
                          const formatPeriodDate = dateStr => {
                            // Handle format YYYYMMDD
                            if (dateStr.length === 8) {
                              const year = parseInt(dateStr.substring(0, 4));
                              const month = parseInt(dateStr.substring(4, 6)) - 1;
                              const day = parseInt(dateStr.substring(6, 8));
                              const date = new Date(year, month, day);
                              const dayNum = date.getDate();
                              const monthNames = [
                                'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                                'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
                              ];
                              const monthName = monthNames[date.getMonth()];
                              return `${dayNum} ${monthName}`;
                            }
                            // Fallback: try to parse as ISO date string
                            try {
                              const date = new Date(dateStr);
                              if (!isNaN(date.getTime())) {
                                const dayNum = date.getDate();
                                const monthNames = [
                                  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                                  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
                                ];
                                const monthName = monthNames[date.getMonth()];
                                return `${dayNum} ${monthName}`;
                              }
                            } catch (e) {
                              // Ignore parsing errors
                            }
                            return dateStr;
                          };
                          
                          // Parse period string
                          // Format 1: "20251012-20251212,20251224-20251231" (start-end ranges)
                          // Format 2: "20251012,20251013,20251014" (list of dates)
                          const periodStr = variant.period.trim();
                          const periods = periodStr.split(',');
                          const firstPeriod = periods[0].trim();
                          
                          if (firstPeriod.includes('-')) {
                            // Format 1: start-end range (e.g., "20251012-20251212")
                            const [startStr, endStr] = firstPeriod.split('-').map(s => s.trim());
                            if (startStr && endStr) {
                              const start = formatPeriodDate(startStr);
                              const end = formatPeriodDate(endStr);
                              return `${start} - ${end}`;
                            }
                          } else if (periods.length > 1) {
                            // Format 2: multiple dates separated by commas (e.g., "20251012,20251013,20251014")
                            // Take first and last date
                            const startStr = periods[0].trim();
                            const endStr = periods[periods.length - 1].trim();
                            if (startStr && endStr && startStr.length === 8 && endStr.length === 8) {
                              const start = formatPeriodDate(startStr);
                              const end = formatPeriodDate(endStr);
                              return `${start} - ${end}`;
                            }
                          } else if (firstPeriod.length === 8) {
                            // Single date in YYYYMMDD format
                            return formatPeriodDate(firstPeriod);
                          }
                        }
                        
                        // Handle duration-based variants (type: 'length' or 'duration', or has duration field)
                        if (variantType === 'length' || variantType === 'duration' || variant.duration || variant.minLength || variant.minDuration) {
                          // Check for minDuration/maxDuration (from PreviewListingPage modal)
                          const minDuration = variant.minDuration || variant.minLength;
                          const maxDuration = variant.maxDuration || variant.maxLength;
                          
                          if (minDuration && maxDuration) {
                            return intl.formatMessage(
                              { id: 'PreviewListingPage.fromToDays' },
                              {
                                min: minDuration,
                                max: maxDuration,
                                defaultMessage: 'from {min} to {max} days',
                              }
                            );
                          } else if (minDuration) {
                            return intl.formatMessage(
                              { id: 'PreviewListingPage.fromDays' },
                              {
                                days: minDuration,
                                defaultMessage: 'from {days} days',
                              }
                            );
                          }
                          
                          // Handle duration string format (e.g., ">10", "7-10" from PricingConfiguration)
                          if (variant.duration) {
                            const durationStr = variant.duration.trim();
                            if (durationStr.startsWith('>')) {
                              const days = durationStr.substring(1).trim();
                              return intl.formatMessage(
                                { id: 'PreviewListingPage.moreThanDays' },
                                {
                                  days: days,
                                  defaultMessage: 'more than {days} days',
                                }
                              );
                            } else if (durationStr.includes('-')) {
                              const [min, max] = durationStr.split('-').map(s => s.trim());
                              return intl.formatMessage(
                                { id: 'PreviewListingPage.fromToDays' },
                                {
                                  min: min,
                                  max: max,
                                  defaultMessage: 'from {min} to {max} days',
                                }
                              );
                            } else {
                              // Single number
                              return intl.formatMessage(
                                { id: 'PreviewListingPage.fromDays' },
                                {
                                  days: durationStr,
                                  defaultMessage: 'from {days} days',
                                }
                              );
                            }
                          }
                        }
                        
                        return '';
                      };

                      return (
                        <div className={css.priceSection}>
                          <div className={css.priceSectionHeader}>
                            <button
                              onClick={() => setShowPriceModal(true)}
                              className={css.modifyLink}
                            >
                              <FormattedMessage
                                id="PreviewListingPage.modifyPriceLink"
                                defaultMessage="Modify price or add price variants"
                              />
                            </button>
                          </div>

                          {/* Price Cards */}
                          <div className={css.priceCardsList}>
                            {/* Default Price Card */}
                            <div
                              className={css.priceCard}
                              style={{
                                borderColor: config.branding?.marketplaceColor || '#4A90E2',
                              }}
                            >
                              <div className={css.priceCardPrice}>
                                {formatPrice(defaultPrice)}
                              </div>
                              <div className={css.priceCardLabel}>
                                <FormattedMessage
                                  id="PreviewListingPage.defaultPrice"
                                  defaultMessage="Default"
                                />
                              </div>
                            </div>

                            {/* Price Variants Cards */}
                            {priceVariants.map((variant, index) => (
                              <div
                                key={index}
                                className={css.priceCard}
                                style={{
                                  borderColor: config.branding?.marketplaceColor || '#4A90E2',
                                }}
                              >
                                <div className={css.priceCardPrice}>
                                  {formatPrice(variant.priceInSubunits / 100)}
                                </div>
                                <div className={css.priceCardLabel}>
                                  {formatPriceVariantLabel(variant)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Map or Address (always visible if location exists) */}
                  {listing.attributes.publicData?.location &&
                    (() => {
                      const location = listing.attributes.publicData.location;
                      const geolocation = location.geolocation || null;
                      // Handle address as object or string
                      const addressObj = location.address || {};
                      const addressString = typeof addressObj === 'string' 
                        ? addressObj 
                        : addressObj.street && addressObj.streetNumber
                        ? `${addressObj.street} ${addressObj.streetNumber}, ${addressObj.city || ''} ${addressObj.postalCode || ''}`.trim()
                        : addressObj.city || addressObj.address || '';
                      
                      // Normalize geolocation format - handle both {lat, lng} and {latitude, longitude}
                      let normalizedGeolocation = null;
                      if (geolocation) {
                        if (geolocation.lat !== undefined && geolocation.lng !== undefined) {
                          normalizedGeolocation = { lat: geolocation.lat, lng: geolocation.lng };
                        } else if (geolocation.latitude !== undefined && geolocation.longitude !== undefined) {
                          normalizedGeolocation = { lat: geolocation.latitude, lng: geolocation.longitude };
                        } else if (Array.isArray(geolocation) && geolocation.length === 2) {
                          // Handle [lat, lng] or [lng, lat] format
                          normalizedGeolocation = { lat: geolocation[0], lng: geolocation[1] };
                        }
                      }
                      
                      // Use geocoded location if geolocation is not available
                      const mapCenter = normalizedGeolocation || geocodedLocation;
                      
                      // Debug log (commented out to reduce console noise)
                      // if (process.env.NODE_ENV === 'development') {
                      //   console.log('🗺️ Map debug:', {
                      //     geolocation,
                      //     normalizedGeolocation,
                      //     geocodedLocation,
                      //     mapCenter,
                      //     addressString,
                      //   });
                      // }

                      return (
                        <div className={css.mapSection}>
                          {/* Location Visibility Toggles - above the map */}
                          <div className={css.locationToggles}>
                            <div className={css.toggleRow}>
                              <button
                                type="button"
                                className={`${css.toggleButton} ${locationVisible ? css.toggleActive : ''}`}
                                onClick={handleLocationVisibleToggle}
                                disabled={updatingListing}
                                style={locationVisible ? { backgroundColor: config.branding?.marketplaceColor || '#4A90E2', borderColor: config.branding?.marketplaceColor || '#4A90E2' } : {}}
                              >
                                <FormattedMessage
                                  id="PreviewListingPage.locationVisible"
                                  defaultMessage="Location visible"
                                />
                                {showLocationTooltip && (
                                  <span className={css.toggleTooltip}>
                                    <FormattedMessage
                                      id="PreviewListingPage.locationVisibleTooltip"
                                      defaultMessage="Cannot hide location while hand-by-hand is enabled"
                                    />
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                className={`${css.toggleButton} ${handByHandAvailable ? css.toggleActive : ''}`}
                                onClick={handleHandByHandToggle}
                                disabled={updatingListing}
                                style={handByHandAvailable ? { backgroundColor: config.branding?.marketplaceColor || '#4A90E2', borderColor: config.branding?.marketplaceColor || '#4A90E2' } : {}}
                              >
                                <FormattedMessage
                                  id="PreviewListingPage.handByHand"
                                  defaultMessage="Hand-by-hand available"
                                />
                              </button>
                            </div>
                          </div>

                          {/* Map */}
                          {mapCenter && mapCenter.lat && mapCenter.lng ? (
                            <div className={css.mapWrapper}>
                              <Map
                                center={mapCenter}
                                obfuscatedCenter={mapCenter}
                                address={addressString}
                                zoom={13}
                                useStaticMap={false}
                                mapsConfig={{
                                  ...config.maps,
                                  fuzzy: {
                                    enabled: true,
                                    offset: config.maps?.fuzzy?.offset || 500,
                                    defaultZoomLevel: config.maps?.fuzzy?.defaultZoomLevel || 13,
                                    circleColor: config.branding?.marketplaceColor || config.maps?.fuzzy?.circleColor || '#4A90E2',
                                  },
                                }}
                              />
                              <div className={css.approximateLabel}>
                                <FormattedMessage
                                  id="PreviewListingPage.approximateLocation"
                                  defaultMessage="Approximate location for privacy"
                                />
                              </div>
                            </div>
                          ) : null}
                          {!mapCenter && addressString && (
                            <div className={css.addressDisplay}>
                              {isGeocoding ? (
                                <>
                                  <IconSpinner />
                                  <span>
                                    <FormattedMessage
                                      id="PreviewListingPage.geocodingAddress"
                                      defaultMessage="Loading map..."
                                    />
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className={css.locationIcon}>📍</span>
                                  <span>{addressString}</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Edit Location Link - below the map */}
                          <div className={css.mapEditLink}>
                            <button
                              type="button"
                              onClick={() => setShowLocationModal(true)}
                              className={css.modifyLink}
                            >
                              <FormattedMessage
                                id="PreviewListingPage.editAddress"
                                defaultMessage="Edit the address"
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {publishListingError && (
              <div className={css.error}>
                <FormattedMessage id="PreviewListingPage.publishError" />
              </div>
            )}

            {/* Action Buttons */}
            <div className={css.actions}>
              <PrimaryButton onClick={handlePublish} inProgress={publishInProgress}>
                {publishInProgress ? (
                  <FormattedMessage id="PreviewListingPage.publishingButton" />
                ) : (
                  <FormattedMessage id="PreviewListingPage.publishButton" />
                )}
              </PrimaryButton>
            </div>
          </div>
        </div>

        {/* Stripe Payout Modal */}
        <Modal
          id="PreviewListingPage.payoutModal"
          isOpen={showPayoutModal}
          onClose={handlePayoutModalClose}
          onManageDisableScrolling={onManageDisableScrolling}
          usePortal
        >
          <div className={css.payoutModalContent}>
            <h2 className={css.modalTitle}>
              <FormattedMessage id="PreviewListingPage.payoutModalTitle" />
            </h2>
            <p className={css.modalDescription}>
              <FormattedMessage id="PreviewListingPage.payoutModalDescription" />
            </p>

            {/* Show country selection only if Stripe account doesn't exist */}
            {!stripeConnected && (
              <div className={css.countrySelectWrapper}>
                <label className={css.countryLabel}>
                  <FormattedMessage id="PreviewListingPage.countryLabel" />
                </label>
                <select
                  className={css.countrySelect}
                  value={selectedCountry}
                  onChange={e => setSelectedCountry(e.target.value)}
                >
                  <option value="">
                    {intl.formatMessage({ id: 'PreviewListingPage.selectCountryPlaceholder' })}
                  </option>
                  {config.stripe?.supportedCountries?.map(country => (
                    <option key={country.code} value={country.code}>
                      {intl.formatMessage({ id: `StripeConnectAccountForm.countryNames.${country.code}` })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Show verification message if Stripe account exists but needs verification */}
            {stripeConnected && stripeRequirementsMissing && (
              <div className={css.verificationNeeded}>
                <FormattedMessage id="PreviewListingPage.verificationNeededMessage" />
              </div>
            )}

            <div className={css.modalActions}>
              <SecondaryButton onClick={handlePayoutModalClose}>
                <FormattedMessage id="PreviewListingPage.payoutModalCancelButton" />
              </SecondaryButton>
              <PrimaryButton
                onClick={handleGoToStripe}
                inProgress={getAccountLinkInProgress || createStripeAccountInProgress}
                disabled={!stripeConnected && !selectedCountry}
              >
                <FormattedMessage id="PreviewListingPage.payoutModalContinueButton" />
              </PrimaryButton>
            </div>
          </div>
        </Modal>

        {/* Price Modification Modal */}
        <Modal
          id="PreviewListingPage.priceModal"
          isOpen={showPriceModal}
          onClose={handleClosePriceModal}
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.availabilityModalContainer}
          usePortal
        >
          <div className={css.availabilityModalContent}>
            <div className={css.availabilityModalHeader}>
              <h2 className={css.modalTitle}>
                <FormattedMessage
                  id="ListingConfiguration.pricingTitle"
                  defaultMessage="Price Configuration"
                />
              </h2>
              <p className={css.modalDescription}>
                <FormattedMessage
                  id="ListingConfiguration.pricingDescription"
                  defaultMessage="Set your daily rental price and optional variants"
                />
              </p>
            </div>

            {/* Default Price Input */}
            <div className={css.priceInputWrapper}>
              <label className={css.priceLabel}>
                <FormattedMessage id="ListingConfiguration.priceLabel" defaultMessage="Daily Price" />
              </label>
              <div className={css.priceInputGroup}>
                <span className={css.currencySymbol}>
                  {listing.attributes.price?.currency === 'EUR' ? '€' : listing.attributes.price?.currency || '€'}
                </span>
                <input
                  type="number"
                  value={modalDefaultPrice === 0 ? '' : modalDefaultPrice / 100}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || value === null || value === undefined) {
                      setModalDefaultPrice(0);
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        setModalDefaultPrice(Math.round(numValue * 100));
                      } else {
                        setModalDefaultPrice(0);
                      }
                    }
                  }}
                  className={css.priceInput}
                  step="1"
                  min="1"
                  placeholder="0"
                />
                <span className={css.perDay}>
                  <FormattedMessage id="ListingConfiguration.perDay" defaultMessage="/giorno" />
                </span>
              </div>
            </div>

            {/* Price Variants Section */}
            <div className={css.exceptionsSection}>
              <div className={css.variantsHeader}>
                <h3 className={css.variantsTitle}>
                  <FormattedMessage
                    id="ListingConfiguration.priceVariants"
                    defaultMessage="Price Variants (Optional)"
                  />
                </h3>
                {!showAddPriceVariant && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPriceVariant(true);
                      setPriceVariantError(null);
                    }}
                    className={css.addExceptionLink}
                    style={{ color: config.branding?.marketplaceColor || '#4A90E2' }}
                  >
                    <FormattedMessage
                      id="ListingConfiguration.addVariant"
                      defaultMessage="+ Add Price Variant"
                    />
                  </button>
                )}
              </div>

              {modalPriceVariants.length > 0 && (
                <div className={css.exceptionsList}>
                  {modalPriceVariants.map(variant => (
                    <div
                      key={variant.id}
                      className={css.exceptionCard}
                      onClick={() => handleEditPriceVariant(variant)}
                      style={{
                        borderColor: config.branding?.marketplaceColor || '#4A90E2',
                      }}
                    >
                      <div className={css.priceCardPrice}>
                        {(variant.priceInSubunits / 100).toFixed(2)}{' '}
                        {listing.attributes.price?.currency || 'EUR'}
                      </div>
                      <div className={css.priceCardLabel}>
                        {(() => {
                          // Use the same formatPriceVariantLabel logic
                          // Determine variant type - prioritize explicit type, then infer from fields
                          const variantType = variant.type || 
                            (variant.period || (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0) ? 'period' : null) ||
                            (variant.minLength || variant.minDuration || variant.maxLength || variant.maxDuration || variant.duration ? 'duration' : null) ||
                            'duration'; // Default fallback
                          
                          // Handle period-based variants FIRST (more specific than duration)
                          // Check for dates array first (from PreviewListingPage modal)
                          if (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0) {
                            const start = new Date(variant.dates[0]);
                            const end = new Date(variant.dates[variant.dates.length - 1]);
                            const formatDate = date => {
                              const day = date.getDate();
                              const monthNames = [
                                'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                                'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
                              ];
                              const month = monthNames[date.getMonth()];
                              return `${day} ${month}`;
                            };
                            return `${formatDate(start)} - ${formatDate(end)}`;
                          }
                          
                          // Check for period string (from ListingConfigurationPage or API)
                          if (variant.period && typeof variant.period === 'string' && variant.period.trim()) {
                            const formatPeriodDate = dateStr => {
                              // Handle format YYYYMMDD
                              if (dateStr.length === 8) {
                                const year = parseInt(dateStr.substring(0, 4));
                                const month = parseInt(dateStr.substring(4, 6)) - 1;
                                const day = parseInt(dateStr.substring(6, 8));
                                const date = new Date(year, month, day);
                                const dayNum = date.getDate();
                                const monthNames = [
                                  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                                  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
                                ];
                                const monthName = monthNames[date.getMonth()];
                                return `${dayNum} ${monthName}`;
                              }
                              // Fallback: try to parse as ISO date string
                              try {
                                const date = new Date(dateStr);
                                if (!isNaN(date.getTime())) {
                                  const dayNum = date.getDate();
                                  const monthNames = [
                                    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
                                    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
                                  ];
                                  const monthName = monthNames[date.getMonth()];
                                  return `${dayNum} ${monthName}`;
                                }
                              } catch (e) {
                                // Ignore parsing errors
                              }
                              return dateStr;
                            };
                            
                            // Parse period string
                            const periodStr = variant.period.trim();
                            const periods = periodStr.split(',');
                            const firstPeriod = periods[0].trim();
                            
                            if (firstPeriod.includes('-')) {
                              // Format 1: start-end range (e.g., "20251012-20251212")
                              const [startStr, endStr] = firstPeriod.split('-').map(s => s.trim());
                              if (startStr && endStr) {
                                const start = formatPeriodDate(startStr);
                                const end = formatPeriodDate(endStr);
                                return `${start} - ${end}`;
                              }
                            } else if (periods.length > 1) {
                              // Format 2: multiple dates separated by commas
                              const startStr = periods[0].trim();
                              const endStr = periods[periods.length - 1].trim();
                              if (startStr && endStr && startStr.length === 8 && endStr.length === 8) {
                                const start = formatPeriodDate(startStr);
                                const end = formatPeriodDate(endStr);
                                return `${start} - ${end}`;
                              }
                            } else if (firstPeriod.length === 8) {
                              // Single date in YYYYMMDD format
                              return formatPeriodDate(firstPeriod);
                            }
                          }
                          
                          // Handle duration-based variants (type: 'length' or 'duration', or has duration field)
                          if (variantType === 'length' || variantType === 'duration' || variant.duration || variant.minLength || variant.minDuration) {
                            const minDuration = variant.minDuration || variant.minLength;
                            const maxDuration = variant.maxDuration || variant.maxLength;
                            
                            if (minDuration && maxDuration) {
                              return intl.formatMessage(
                                { id: 'PreviewListingPage.fromToDays' },
                                {
                                  min: minDuration,
                                  max: maxDuration,
                                  defaultMessage: 'da {min} a {max} giorni',
                                }
                              );
                            } else if (minDuration) {
                              return intl.formatMessage(
                                { id: 'PreviewListingPage.fromDays' },
                                {
                                  days: minDuration,
                                  defaultMessage: 'da {days} giorni',
                                }
                              );
                            }
                          }
                          
                          return '';
                        })()}
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemovePriceVariant(variant.id);
                        }}
                        className={css.removeButton}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddPriceVariant && (
                <div className={css.exceptionCalendar}>
                  <div className={css.variantTypeSelector}>
                    <button
                      type="button"
                      onClick={() => {
                        setPriceVariantType('length');
                        setPriceVariantError(null);
                      }}
                      className={css.chipCard}
                      style={
                        priceVariantType === 'length'
                          ? {
                              backgroundColor: config.branding?.marketplaceColor || '#4A90E2',
                              borderColor: config.branding?.marketplaceColor || '#4A90E2',
                              color: 'white',
                            }
                          : {}
                      }
                    >
                      <FormattedMessage
                        id="ListingConfiguration.lengthBased"
                        defaultMessage="Based on rental length"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPriceVariantType('seasonality');
                        setPriceVariantError(null);
                      }}
                      className={css.chipCard}
                      style={
                        priceVariantType === 'seasonality'
                          ? {
                              backgroundColor: config.branding?.marketplaceColor || '#4A90E2',
                              borderColor: config.branding?.marketplaceColor || '#4A90E2',
                              color: 'white',
                            }
                          : {}
                      }
                    >
                      <FormattedMessage
                        id="ListingConfiguration.seasonalityBased"
                        defaultMessage="Based on seasonality"
                      />
                    </button>
                  </div>

                  {priceVariantType === 'length' && (
                    <div className={css.lengthVariantFields}>
                      <div className={css.fieldGroup}>
                        <label className={css.fieldLabel}>
                          <FormattedMessage
                            id="ListingConfiguration.variantPrice"
                            defaultMessage="Price"
                          />
                        </label>
                        <div className={css.priceInputGroup}>
                          <span className={css.currencySymbol}>
                            {listing.attributes.price?.currency === 'EUR' ? '€' : listing.attributes.price?.currency || '€'}
                          </span>
                          <input
                            type="number"
                            value={newPriceVariant.price ? newPriceVariant.price / 100 : ''}
                            onChange={e => {
                              const value = e.target.value;
                              setPriceVariantError(null); // Clear error on change
                              if (value === '' || value === null || value === undefined) {
                                setNewPriceVariant({ ...newPriceVariant, price: null });
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue > 0) {
                                  setNewPriceVariant({
                                    ...newPriceVariant,
                                    price: Math.round(numValue * 100),
                                  });
                                } else {
                                  setNewPriceVariant({ ...newPriceVariant, price: null });
                                }
                              }
                            }}
                            className={css.priceInput}
                            step="1"
                            min="1"
                            placeholder="0"
                          />
                          <span className={css.perDay}>
                            <FormattedMessage
                              id="ListingConfiguration.perDay"
                              defaultMessage="/giorno"
                            />
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                        <div className={css.fieldGroup} style={{ flex: '1 1 50%' }}>
                          <label className={css.fieldLabel}>
                            <FormattedMessage
                              id="ListingConfiguration.minLength"
                              defaultMessage="Minimum length (days)"
                            />
                          </label>
                          <input
                            type="number"
                            value={newPriceVariant.minLength || ''}
                            onChange={e => {
                              const value = e.target.value;
                              setPriceVariantError(null); // Clear error on change
                              if (value === '' || value === null || value === undefined) {
                                setNewPriceVariant({ ...newPriceVariant, minLength: null });
                              } else {
                                setNewPriceVariant({
                                  ...newPriceVariant,
                                  minLength: parseInt(value) || null,
                                });
                              }
                            }}
                            className={css.input}
                            min="1"
                            placeholder="0"
                          />
                        </div>
                        <div className={css.fieldGroup} style={{ flex: '1 1 50%' }}>
                          <label className={css.fieldLabel}>
                            <FormattedMessage
                              id="ListingConfiguration.maxLength"
                              defaultMessage="Maximum length (days, optional)"
                            />
                          </label>
                          <input
                            type="number"
                            value={newPriceVariant.maxLength}
                            onChange={e =>
                              setNewPriceVariant({
                                ...newPriceVariant,
                                maxLength: parseInt(e.target.value) || '',
                              })
                            }
                            className={css.input}
                            min={newPriceVariant.minLength || 1}
                            placeholder={intl.formatMessage({
                              id: 'ListingConfiguration.noLimit',
                              defaultMessage: 'No limit',
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {priceVariantType === 'seasonality' && (
                    <>
                      <div className={css.fieldGroup}>
                        <label className={css.fieldLabel}>
                          <FormattedMessage
                            id="ListingConfiguration.variantPrice"
                            defaultMessage="Price"
                          />
                        </label>
                        <div className={css.priceInputGroup}>
                          <span className={css.currencySymbol}>
                            {listing.attributes.price?.currency === 'EUR' ? '€' : listing.attributes.price?.currency || '€'}
                          </span>
                          <input
                            type="number"
                            value={newPriceVariant.price ? newPriceVariant.price / 100 : ''}
                            onChange={e => {
                              const value = e.target.value;
                              setPriceVariantError(null); // Clear error on change
                              if (value === '' || value === null || value === undefined) {
                                setNewPriceVariant({ ...newPriceVariant, price: null });
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue > 0) {
                                  setNewPriceVariant({
                                    ...newPriceVariant,
                                    price: Math.round(numValue * 100),
                                  });
                                } else {
                                  setNewPriceVariant({ ...newPriceVariant, price: null });
                                }
                              }
                            }}
                            className={css.priceInput}
                            step="1"
                            min="1"
                            placeholder="0"
                          />
                          <span className={css.perDay}>
                            <FormattedMessage
                              id="ListingConfiguration.perDay"
                              defaultMessage="/giorno"
                            />
                          </span>
                        </div>
                      </div>
                      <p className={css.exceptionInstructions}>
                        <FormattedMessage
                          id="ListingConfiguration.seasonalityInstructions"
                          defaultMessage="Select dates or a range for this seasonal price"
                        />
                      </p>
                      <AvailabilityCalendar
                        selectedDates={newPriceVariant.dates}
                        onDatesChange={dates => {
                          setPriceVariantError(null); // Clear error on change
                          setNewPriceVariant({ ...newPriceVariant, dates });
                        }}
                        selectMode="exception"
                        marketplaceColor={config.branding?.marketplaceColor || '#4A90E2'}
                        disabledDates={[
                          ...disabledDates,
                          // Include dates from other period-type price variants (exclude editing one)
                          ...modalPriceVariants
                            .filter(v => (v.type === 'period' || v.dates || v.period) && (!editingPriceVariant || v.id !== editingPriceVariant.id))
                            .flatMap(v => {
                              // If dates array exists (from modal), use it
                              if (v.dates && Array.isArray(v.dates) && v.dates.length > 0) {
                                return v.dates.map(d => d instanceof Date ? d : new Date(d));
                              }
                              // If period string exists (from API), parse it
                              if (v.period && typeof v.period === 'string') {
                                return v.period.split(',').map(dateStr => {
                                  // Parse YYYYMMDD format
                                  const year = parseInt(dateStr.substring(0, 4), 10);
                                  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
                                  const day = parseInt(dateStr.substring(6, 8), 10);
                                  return new Date(year, month, day);
                                });
                              }
                              return [];
                            })
                        ]}
                        availableFrom={currentListing.attributes?.publicData?.availableFrom}
                        availableUntil={currentListing.attributes?.publicData?.availableUntil}
                      />
                    </>
                  )}

                  {priceVariantError && (
                    <div className={css.priceVariantError}>
                      {priceVariantError}
                    </div>
                  )}

                  <div className={css.exceptionActions}>
                    <button
                      type="button"
                      onClick={handleAddPriceVariant}
                      className={css.saveExceptionButton}
                      style={{ background: config.branding?.marketplaceColor || '#4A90E2' }}
                      disabled={
                        !newPriceVariant.price ||
                        newPriceVariant.price <= 0 ||
                        (priceVariantType === 'length' && !newPriceVariant.minLength) ||
                        (priceVariantType === 'seasonality' && newPriceVariant.dates.length === 0)
                      }
                    >
                      <FormattedMessage id="ListingConfiguration.save" defaultMessage="Save" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPriceVariant(false);
                        setEditingPriceVariant(null);
                        setPriceVariantError(null);
                        setNewPriceVariant({
                          type: 'length',
                          price: modalDefaultPrice || null,
                          minLength: null,
                          maxLength: '',
                          dates: [],
                        });
                      }}
                      className={css.cancelButton}
                    >
                      <FormattedMessage id="ListingConfiguration.cancel" defaultMessage="Cancel" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={css.drawerActions}>
              <SecondaryButton onClick={handleClosePriceModal} disabled={updatingListing}>
                <FormattedMessage id="PreviewListingPage.cancelButton" defaultMessage="Cancel" />
              </SecondaryButton>
              <PrimaryButton onClick={handleSavePrice} inProgress={updatingListing}>
                <FormattedMessage id="PreviewListingPage.saveButton" defaultMessage="Save" />
              </PrimaryButton>
            </div>
          </div>
        </Modal>

        {/* Availability Modification Modal */}
        <Modal
          id="PreviewListingPage.availabilityModal"
          isOpen={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.availabilityModalContainer}
          usePortal
        >
          <div className={css.availabilityModalContent}>
            <div className={css.availabilityModalHeader}>
              <h2 className={css.modalTitle}>
                <FormattedMessage
                  id="ListingConfiguration.availabilityTitle"
                  defaultMessage="Calendar Availability"
                />
              </h2>
              <p className={css.modalDescription}>
                <FormattedMessage
                  id="ListingConfiguration.availabilityDescription"
                  defaultMessage="Select the dates when your item will be available for rent. All dates from today onwards are selected by default."
                />
              </p>
            </div>

            <div className={css.calendarWrapper}>
              <AvailabilityCalendar
                selectedDates={modalSelectedDates}
                onDatesChange={setModalSelectedDates}
                marketplaceColor={config.branding?.marketplaceColor || '#4A90E2'}
                disabledDates={getExceptionDatesForCalendar()}
                availableFrom={currentListing.attributes?.publicData?.availableFrom}
                availableUntil={currentListing.attributes?.publicData?.availableUntil}
              />
            </div>

            {/* Exceptions Section */}
            <div className={css.exceptionsSection}>
              <div className={css.exceptionsHeader}>
                <button
                  type="button"
                  className={css.infoIcon}
                  style={{
                    background: 'transparent',
                    border: `2px solid ${config.branding?.marketplaceColor || '#4A90E2'}`,
                    color: config.branding?.marketplaceColor || '#4A90E2',
                  }}
                >
                  i
                  <div className={css.tooltip}>
                    <p className={css.tooltipMessage}>
                      <FormattedMessage
                        id="ListingConfiguration.exceptionInfoTooltip"
                        defaultMessage="You can add availability exceptions even later"
                      />
                    </p>
                  </div>
                </button>
                <span className={css.exceptionsQuestion}>
                  <FormattedMessage
                    id="ListingConfiguration.exceptionsQuestion"
                    defaultMessage="Sai già quando non sarà disponibile?"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingException(null);
                    setNewVariant({ dates: [] });
                    setShowExceptionCalendar(!showExceptionCalendar);
                  }}
                  className={css.addExceptionLink}
                  style={{ color: config.branding?.marketplaceColor || '#4A90E2' }}
                >
                  <FormattedMessage
                    id="ListingConfiguration.addException"
                    defaultMessage="+ Add availability exception"
                  />
                </button>
              </div>

              {showExceptionCalendar && (
                <div className={css.exceptionCalendar}>
                  <p className={css.exceptionInstructions}>
                    <FormattedMessage
                      id="ListingConfiguration.exceptionInstructions"
                      defaultMessage="Select a single day or a range of days when your item will NOT be available"
                    />
                  </p>
                  <AvailabilityCalendar
                    selectedDates={newVariant.dates}
                    onDatesChange={dates => setNewVariant({ ...newVariant, dates })}
                    selectMode="exception"
                    marketplaceColor={config.branding?.marketplaceColor || '#4A90E2'}
                    availableFrom={currentListing.attributes?.publicData?.availableFrom}
                    availableUntil={currentListing.attributes?.publicData?.availableUntil}
                    disabledDates={modalExceptions
                      .filter(exc => !editingException || exc.id !== editingException.id)
                      .flatMap(exc => exc.dates)}
                  />
                  <div className={css.exceptionActions}>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddException(newVariant.dates);
                        setNewVariant({ dates: [] });
                      }}
                      className={css.saveExceptionButton}
                      style={{ background: config.branding?.marketplaceColor || '#4A90E2' }}
                      disabled={newVariant.dates.length === 0}
                    >
                      <FormattedMessage
                        id="ListingConfiguration.saveException"
                        defaultMessage="Save Exception"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExceptionCalendar(false);
                        setEditingException(null);
                        setNewVariant({ dates: [] });
                      }}
                      className={css.cancelButton}
                    >
                      <FormattedMessage id="ListingConfiguration.cancel" defaultMessage="Cancel" />
                    </button>
                  </div>
                </div>
              )}

              {modalExceptions.length > 0 && (
                <div className={css.exceptionsList}>
                  {modalExceptions
                    .slice()
                    .sort((a, b) => {
                      // Sort by first date in the exception
                      const dateA = a.dates && a.dates.length > 0 ? new Date(a.dates[0]) : new Date(0);
                      const dateB = b.dates && b.dates.length > 0 ? new Date(b.dates[0]) : new Date(0);
                      return dateA - dateB;
                    })
                    .map(exc => (
                      <div
                        key={exc.id}
                        className={css.exceptionCard}
                        onClick={() => handleEditException(exc)}
                        style={{
                          borderColor: config.branding?.marketplaceColor || '#4A90E2',
                        }}
                      >
                        <span className={css.exceptionDates}>{formatExceptionDates(exc.dates)}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveException(exc.id);
                          }}
                          className={css.removeButton}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={css.drawerActions}>
              <SecondaryButton onClick={() => setShowAvailabilityModal(false)} disabled={updatingListing}>
                <FormattedMessage id="PreviewListingPage.cancelButton" defaultMessage="Cancel" />
              </SecondaryButton>
              <PrimaryButton onClick={handleSaveAvailability} inProgress={updatingListing}>
                <FormattedMessage id="PreviewListingPage.saveButton" defaultMessage="Save" />
              </PrimaryButton>
            </div>
          </div>
        </Modal>

        {/* Location Modification Modal */}
        <Modal
          id="PreviewListingPage.locationModal"
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setShowAddressSearch(false);
            setShowFullForm(false);
          }}
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.availabilityModalContainer}
          usePortal
        >
          <div className={css.availabilityModalContent}>
            <div className={css.availabilityModalHeader}>
              <h2 className={css.modalTitle}>
                <FormattedMessage
                  id="ListingConfiguration.locationTitle"
                  defaultMessage="Location"
                />
              </h2>
              <p className={css.modalDescription}>
                <FormattedMessage
                  id="ListingConfiguration.locationDescription"
                  defaultMessage="Specify where the item is located"
                />
              </p>
            </div>

            <div className={css.locationModalContent}>
              {/* Autocomplete Search */}
              {showAddressSearch && !showFullForm && (
                <div className={css.addressSection}>
                  <button
                    type="button"
                    className={css.chipCard}
                    onClick={() => {
                      setShowFullForm(true);
                      setManualAddress({
                        street: '',
                        streetNumber: '',
                        addressLine2: '',
                        city: '',
                        region: '',
                        postalCode: '',
                        country: '',
                      });
                      setLocationAutocompleteValue({
                        search: '',
                        predictions: [],
                        selectedPlace: null,
                      });
                      setModalGeolocation(null);
                    }}
                    style={{
                      backgroundColor: 'white',
                      borderColor: config.branding?.marketplaceColor || '#4A90E2',
                      color: config.branding?.marketplaceColor || '#4A90E2',
                      marginBottom: '1rem',
                    }}
                  >
                    <FormattedMessage
                      id="ListingConfiguration.cantFindAddress"
                      defaultMessage="Non trovi l'indirizzo? Procedi con l'inserimento manualmente"
                    />
                  </button>
                  <LocationAutocompleteInputImpl
                    className={css.input}
                    iconClassName={css.locationIcon}
                    inputClassName={css.locationAutocompleteInput}
                    predictionsClassName={css.predictionsRoot}
                    validClassName={css.validLocation}
                    autoFocus={false}
                    placeholder={intl.formatMessage({
                      id: 'ListingConfiguration.addressPlaceholder',
                      defaultMessage: 'Enter your address',
                    })}
                    useDefaultPredictions={false}
                    format={v => v}
                    input={{
                      name: 'location',
                      value: locationAutocompleteValue,
                      onChange: value => {
                        setLocationAutocompleteValue(value);
                        if (value && value.selectedPlace) {
                          const place = value.selectedPlace;
                          setModalGeolocation(place.origin);
                          const newAddress = {
                            street: place.street || '',
                            streetNumber: place.streetNumber || '',
                            addressLine2: '',
                            city: place.city || '',
                            region: place.state || '',
                            postalCode: place.postalCode || '',
                            country: place.country || '',
                          };
                          setManualAddress(newAddress);
                          setShowFullForm(true);
                          setTimeout(() => {
                            const invalid = [];
                            if (!newAddress.street.trim()) invalid.push('street');
                            if (!newAddress.streetNumber.trim()) invalid.push('streetNumber');
                            if (!newAddress.city.trim()) invalid.push('city');
                            if (!newAddress.region.trim()) invalid.push('region');
                            if (!newAddress.postalCode.trim()) invalid.push('postalCode');
                            if (!newAddress.country.trim()) invalid.push('country');
                            setInvalidFields(invalid);
                          }, 100);
                        }
                      },
                      onFocus: () => {},
                      onBlur: () => {},
                    }}
                    meta={{
                      touched: false,
                      valid: true,
                    }}
                  />
                </div>
              )}

              {/* Full Address Form */}
              {showFullForm && (
                <div className={css.manualAddressForm}>
                  <button
                    type="button"
                    className={css.chipCard}
                    onClick={() => {
                      setShowAddressSearch(true);
                      setShowFullForm(false);
                      setLocationAutocompleteValue({
                        search: '',
                        predictions: [],
                        selectedPlace: null,
                      });
                    }}
                    style={{
                      backgroundColor: 'white',
                      borderColor: config.branding?.marketplaceColor || '#4A90E2',
                      color: config.branding?.marketplaceColor || '#4A90E2',
                      marginBottom: '20px',
                    }}
                  >
                    <FormattedMessage
                      id="ListingConfiguration.useAutomaticSearch"
                      defaultMessage="Procedi con la ricerca automatica"
                    />
                  </button>
                  <div className={css.twoColumns}>
                    <div className={css.fieldGroup}>
                      <label className={css.fieldLabel}>
                        <FormattedMessage id="ListingConfiguration.street" defaultMessage="Street" />
                      </label>
                      <input
                        type="text"
                        value={manualAddress.street}
                        onChange={e => {
                          const newAddress = { ...manualAddress, street: e.target.value };
                          setManualAddress(newAddress);
                          if (invalidFields.includes('street') && e.target.value.trim()) {
                            setInvalidFields(invalidFields.filter(f => f !== 'street'));
                          }
                        }}
                        className={`${css.input} ${
                          invalidFields.includes('street') ? css.inputInvalid : ''
                        }`}
                        placeholder={intl.formatMessage({
                          id: 'ListingConfiguration.streetPlaceholder',
                          defaultMessage: 'Via/Street',
                        })}
                      />
                    </div>
                    <div className={css.fieldGroup}>
                      <label className={css.fieldLabel}>
                        <FormattedMessage
                          id="ListingConfiguration.streetNumber"
                          defaultMessage="Number"
                        />
                      </label>
                      <input
                        type="text"
                        value={manualAddress.streetNumber}
                        onChange={e => {
                          const newAddress = { ...manualAddress, streetNumber: e.target.value };
                          setManualAddress(newAddress);
                          if (invalidFields.includes('streetNumber') && e.target.value.trim()) {
                            setInvalidFields(invalidFields.filter(f => f !== 'streetNumber'));
                          }
                        }}
                        className={`${css.input} ${
                          invalidFields.includes('streetNumber') ? css.inputInvalid : ''
                        }`}
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div className={css.fieldGroup}>
                    <label className={css.fieldLabel}>
                      <FormattedMessage
                        id="ListingConfiguration.apartment"
                        defaultMessage="Apartment (Optional)"
                      />
                    </label>
                    <input
                      type="text"
                      value={manualAddress.addressLine2}
                      onChange={e => {
                        setManualAddress({ ...manualAddress, addressLine2: e.target.value });
                      }}
                      className={css.input}
                      placeholder={intl.formatMessage({
                        id: 'ListingConfiguration.apartmentPlaceholder',
                        defaultMessage: 'Apt, Suite, Unit, etc.',
                      })}
                    />
                  </div>
                  <div className={css.fieldGroup}>
                    <label className={css.fieldLabel}>
                      <FormattedMessage id="ListingConfiguration.city" defaultMessage="City" />
                    </label>
                    <input
                      type="text"
                      value={manualAddress.city}
                      onChange={e => {
                        const newAddress = { ...manualAddress, city: e.target.value };
                        setManualAddress(newAddress);
                        if (invalidFields.includes('city') && e.target.value.trim()) {
                          setInvalidFields(invalidFields.filter(f => f !== 'city'));
                        }
                      }}
                      className={`${css.input} ${
                        invalidFields.includes('city') ? css.inputInvalid : ''
                      }`}
                    />
                  </div>
                  <div className={css.twoColumns}>
                    <div className={css.fieldGroup}>
                      <label className={css.fieldLabel}>
                        <FormattedMessage
                          id="ListingConfiguration.region"
                          defaultMessage="Region/Province"
                        />
                      </label>
                      <input
                        type="text"
                        value={manualAddress.region}
                        onChange={e => {
                          const newAddress = { ...manualAddress, region: e.target.value };
                          setManualAddress(newAddress);
                          if (invalidFields.includes('region') && e.target.value.trim()) {
                            setInvalidFields(invalidFields.filter(f => f !== 'region'));
                          }
                        }}
                        className={`${css.input} ${
                          invalidFields.includes('region') ? css.inputInvalid : ''
                        }`}
                        placeholder={intl.formatMessage({
                          id: 'ListingConfiguration.regionPlaceholder',
                          defaultMessage: 'Province',
                        })}
                      />
                    </div>
                    <div className={css.fieldGroup}>
                      <label className={css.fieldLabel}>
                        <FormattedMessage
                          id="ListingConfiguration.postalCode"
                          defaultMessage="Postal Code"
                        />
                      </label>
                      <input
                        type="text"
                        value={manualAddress.postalCode}
                        onChange={e => {
                          const newAddress = { ...manualAddress, postalCode: e.target.value };
                          setManualAddress(newAddress);
                          if (invalidFields.includes('postalCode') && e.target.value.trim()) {
                            setInvalidFields(invalidFields.filter(f => f !== 'postalCode'));
                          }
                        }}
                        className={`${css.input} ${
                          invalidFields.includes('postalCode') ? css.inputInvalid : ''
                        }`}
                      />
                    </div>
                  </div>
                  <div className={css.fieldGroup}>
                    <label className={css.fieldLabel}>
                      <FormattedMessage id="ListingConfiguration.country" defaultMessage="Country" />
                    </label>
                    <input
                      type="text"
                      value={manualAddress.country}
                      onChange={e => {
                        const newAddress = { ...manualAddress, country: e.target.value };
                        setManualAddress(newAddress);
                        if (invalidFields.includes('country') && e.target.value.trim()) {
                          setInvalidFields(invalidFields.filter(f => f !== 'country'));
                        }
                      }}
                      className={`${css.input} ${
                        invalidFields.includes('country') ? css.inputInvalid : ''
                      }`}
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className={css.drawerActions}>
              <SecondaryButton
                onClick={() => {
                  setShowLocationModal(false);
                  setShowAddressSearch(false);
                  setShowFullForm(false);
                }}
                disabled={updatingListing}
              >
                <FormattedMessage id="PreviewListingPage.cancelButton" defaultMessage="Cancel" />
              </SecondaryButton>
              <PrimaryButton onClick={handleSaveLocation} inProgress={updatingListing}>
                <FormattedMessage id="PreviewListingPage.saveButton" defaultMessage="Save" />
              </PrimaryButton>
            </div>
          </div>
        </Modal>

        {/* Image Lightbox Modal with Prev/Next Navigation */}
        {showImageModal && listing.images && listing.images.length > 0 && (
          <div className={css.imageModalOverlay} onClick={handleCloseImageModal}>
            <div className={css.imageModalContent} onClick={e => e.stopPropagation()}>
              <button className={css.imageModalClose} onClick={handleCloseImageModal}>
                ×
              </button>

              {/* Previous Button */}
              {listing.images.length > 1 && (
                <button className={css.imageModalPrev} onClick={handlePrevImage}>
                  ‹
                </button>
              )}

              {/* Current Image */}
              {(() => {
                const mainImage = listing.images[selectedImageIndex];
                const variants = mainImage?.attributes?.variants || {};
                const imageUrl =
                  variants['listing-card-6x']?.url ||
                  variants['listing-card-4x']?.url ||
                  variants['listing-card-2x']?.url ||
                  variants['listing-card']?.url ||
                  variants['scaled-large']?.url ||
                  variants['scaled-medium']?.url;

                return (
                  <img
                    src={imageUrl}
                    alt={`${listing.attributes.title} - Image ${selectedImageIndex + 1}`}
                    className={css.imageModalImage}
                  />
                );
              })()}

              {/* Next Button */}
              {listing.images.length > 1 && (
                <button className={css.imageModalNext} onClick={handleNextImage}>
                  ›
                </button>
              )}

              {/* Image Counter */}
              <div className={css.imageModalCounter}>
                {selectedImageIndex + 1} / {listing.images.length}
              </div>
            </div>
          </div>
        )}

        {/* Delete Image Confirmation Dialog */}
        <Modal
          id="PreviewListingPage.deleteImageDialog"
          isOpen={showDeleteImageDialog}
          onClose={cancelImageDelete}
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.deleteImageDialogContainer}
          usePortal
        >
          <div className={css.deleteImageDialogContent}>
            <h2 className={css.deleteImageDialogTitle}>
              <FormattedMessage
                id="PreviewListingPage.deleteImageConfirm"
                defaultMessage="Are you sure you want to delete this image?"
              />
            </h2>
            <p className={css.deleteImageDialogMessage}>
              <FormattedMessage
                id="PreviewListingPage.deleteImageWarning"
                defaultMessage="This action cannot be undone."
              />
            </p>
            <div className={css.deleteImageDialogActions}>
              <SecondaryButton onClick={cancelImageDelete} disabled={deletingImageId !== null}>
                <FormattedMessage id="PreviewListingPage.cancelButton" defaultMessage="Cancel" />
              </SecondaryButton>
              <PrimaryButton onClick={confirmImageDelete} inProgress={deletingImageId !== null}>
                <FormattedMessage id="PreviewListingPage.deleteButton" defaultMessage="Delete" />
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      </LayoutSingleColumn>
    </Page>
  );
};

PreviewListingPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  getListing: func.isRequired,
  onFetchListing: func.isRequired,
  onUpdateListing: func.isRequired,
  onPublishListingDraft: func.isRequired,
  onUploadImage: func.isRequired,
  onDeleteImage: func.isRequired,
  publishListingError: propTypes.error,
  publishInProgress: bool,
  scrollingDisabled: bool.isRequired,
  stripeAccount: object,
  stripeAccountFetched: bool,
  onGetStripeConnectAccountLink: func.isRequired,
  onCreateStripeAccount: func.isRequired,
  onFetchStripeAccount: func.isRequired,
  getAccountLinkInProgress: bool,
  createStripeAccountInProgress: bool,
  params: shape({
    id: string.isRequired,
    returnURLType: string,
  }).isRequired,
  history: shape({
    push: func.isRequired,
  }).isRequired,
  intl: intlShape.isRequired,
};

const createSlug = title => {
  if (!title || typeof title !== 'string') {
    return 'listing';
  }
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const { publishListingError, publishInProgress } = state.EditListingPage;
  const {
    getAccountLinkInProgress,
    getAccountLinkError,
    createStripeAccountInProgress,
    stripeAccount,
    stripeAccountFetched,
  } = state.stripeConnectAccount;

  const getListing = id => {
    const ref = { id, type: 'ownListing' };
    const listings = getMarketplaceEntities(state, [ref]);
    return listings.length === 1 ? listings[0] : null;
  };

  return {
    currentUser,
    getListing,
    publishListingError,
    publishInProgress,
    scrollingDisabled: isScrollingDisabled(state),
    stripeAccount,
    stripeAccountFetched,
    getAccountLinkInProgress,
    getAccountLinkError,
    createStripeAccountInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchListing: (params, config) => dispatch(requestShowListing(params, config)),
  onUpdateListing: (tab, data, config) =>
    dispatch(requestUpdateListing(tab, data, config)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  onPublishListingDraft: listingId => dispatch(requestPublishListingDraft(listingId)),
  onGetStripeConnectAccountLink: params => dispatch(getStripeConnectAccountLink(params)),
  onCreateStripeAccount: params => dispatch(createStripeAccount(params)),
  onFetchStripeAccount: () => dispatch(fetchStripeAccount()),
  onUploadImage: (listingId, imageFile, config) =>
    dispatch((dispatch, getState, sdk) => {
      const imageVariantInfo = getImageVariantInfo(config?.layout?.listingImage || {});
      const queryParams = {
        expand: true,
        'fields.image': imageVariantInfo.fieldsImage,
        ...imageVariantInfo.imageVariants,
      };

      return sdk.images
        .upload({ image: imageFile }, queryParams)
        .then(response => {
          const imageId = response.data.data.id;
          return sdk.ownListings.addImage(
            { id: listingId, imageId },
            {
              expand: true,
              include: ['images'],
              'fields.image': imageVariantInfo.fieldsImage,
              ...imageVariantInfo.imageVariants,
            }
          );
        })
        .then(response => {
          // Refresh the listing in the store
          return dispatch(requestShowListing({ id: listingId }, config));
        });
    }),
  onDeleteImage: (listingId, imageId, currentImages, config) =>
    dispatch((dispatch, getState, sdk) => {
      const imageUuid = typeof imageId === 'object' ? imageId.uuid : imageId;
      
      // Use the current images array passed from the component
      // This works for both drafts and published listings
      if (!currentImages || currentImages.length === 0) {
        throw new Error('No images found in listing');
      }

      return deleteImageFromListing(currentImages, imageUuid, listingId, config, sdk, dispatch);
    }),
});

const PreviewListingPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(PreviewListingPageComponent);

export default PreviewListingPage;
