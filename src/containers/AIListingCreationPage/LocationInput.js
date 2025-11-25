import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import LocationAutocompleteInputImpl from '../../components/LocationAutocompleteInput/LocationAutocompleteInput';
import { useConfiguration } from '../../context/configurationContext';
import { DEFAULT_LOCALE } from '../../config/localeConfig';
import css from './LocationInput.module.css';

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

/**
 * LocationInput Component
 *
 * Allows users to enter the rental item's location using:
 * - Autocomplete (Mapbox or Google Maps based on config)
 * - Browser geolocation (with permission)
 * - Prefilled from user profile data if available
 */
const LocationInput = ({ onComplete, onBack, isSubmitting, currentUser }) => {
  const config = useConfiguration();
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Get current locale from localStorage (default: it-IT)
  // Safe for server-side rendering: check if localStorage is available
  const currentLocale =
    typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
      : DEFAULT_LOCALE;
  const searchCountry = getCountryForLocale(currentLocale);

  // Initialize location from user data
  useEffect(() => {
    console.log('🔍 LocationInput useEffect - Starting prefill logic');
    console.log('currentUser received:', currentUser);

    if (currentUser && currentUser.attributes && currentUser.attributes.profile) {
      console.log('✅ currentUser.attributes.profile exists');
      const profile = currentUser.attributes.profile;
      const privateData = profile.privateData || {};
      const publicData = profile.publicData || {};

      console.log('privateData:', privateData);
      console.log('publicData:', publicData);

      // Check for user address in privateData (from signup)
      if (privateData.address) {
        console.log('✅ Found privateData.address:', privateData.address);
        const userAddress = privateData.address;

        // Build full address string
        const addressParts = [
          userAddress.addressLine1,
          userAddress.city,
          userAddress.postalCode,
          userAddress.country,
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ');
        console.log('📝 Built full address:', fullAddress);

        // Check if user has geolocation
        if (userAddress.geolocation) {
          console.log('✅ Geolocation found:', userAddress.geolocation);
          const userLocation = {
            address: fullAddress,
            origin: {
              lat: userAddress.geolocation.lat,
              lng: userAddress.geolocation.lng,
            },
          };
          console.log('🎯 Setting location with geolocation:', userLocation);
          setLocation(userLocation);
          setAddress(fullAddress);
        } else if (fullAddress) {
          console.log('⚠️  No geolocation, but setting address:', fullAddress);
          // No geolocation but has address - try to geocode it
          setAddress(fullAddress);
          
          // Geocode the address asynchronously
          setIsGeocoding(true);
          geocodeAddress(fullAddress, searchCountry)
            .then(geolocation => {
              if (geolocation) {
                console.log('✅ Geocoded address successfully:', geolocation);
                setLocation({
                  address: fullAddress,
                  origin: geolocation,
                });
              } else {
                console.log('⚠️  Could not geocode address');
                // Set location without geolocation - user can still continue
                setLocation({
                  address: fullAddress,
                });
              }
            })
            .catch(error => {
              console.error('Error geocoding address:', error);
              // Set location without geolocation - user can still continue
              setLocation({
                address: fullAddress,
              });
            })
            .finally(() => {
              setIsGeocoding(false);
            });
        }
      }
      // Fallback: Check legacy location data in publicData
      else if (publicData.location && publicData.location.lat && publicData.location.lng) {
        console.log('✅ Found legacy publicData.location:', publicData.location);
        const legacyLocation = {
          address:
            publicData.location.address || `${publicData.location.lat}, ${publicData.location.lng}`,
          origin: { lat: publicData.location.lat, lng: publicData.location.lng },
        };
        console.log('🎯 Setting location from legacy data:', legacyLocation);
        setLocation(legacyLocation);
        setAddress(legacyLocation.address);
      } else {
        console.log('❌ No address data found in privateData or publicData');
      }
    } else {
      console.log('❌ currentUser, attributes, or profile not available');
      if (!currentUser) console.log('  - currentUser is null/undefined');
      if (currentUser && !currentUser.attributes)
        console.log('  - currentUser.attributes is missing');
      if (currentUser && currentUser.attributes && !currentUser.attributes.profile)
        console.log('  - currentUser.attributes.profile is missing');
    }
  }, [currentUser]);

  // Handle location selection from autocomplete
  const handleLocationChange = selectedLocation => {
    console.log('Location selected:', selectedLocation);
    setLocation(selectedLocation);
    setAddress(selectedLocation?.address || '');
    setError(null);
  };

  // Request browser geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;

        // Use reverse geocoding to get address
        // For now, set coordinates - the autocomplete component will handle reverse geocoding
        const currentLocation = {
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          origin: { lat: latitude, lng: longitude },
        };

        setLocation(currentLocation);
        setAddress(currentLocation.address);
        setIsGettingLocation(false);
      },
      error => {
        console.error('Geolocation error:', error);
        setError('Could not get your location. Please enter it manually.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle continue
  const handleContinue = async () => {
    if (!location || !location.address) {
      setError('Please select a location');
      return;
    }

    // If we have an address but no geolocation, try to geocode it
    let finalLocation = { ...location };
    
    if (!finalLocation.origin && finalLocation.address) {
      setIsGeocoding(true);
      try {
        const geocodedLocation = await geocodeAddress(finalLocation.address, searchCountry);
        if (geocodedLocation) {
          finalLocation.origin = geocodedLocation;
          setLocation(finalLocation);
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
        // Continue without geolocation if geocoding fails
      } finally {
        setIsGeocoding(false);
      }
    }

    // Format location data to match Sharetribe structure
    const locationData = {
      address: finalLocation.address,
      building: finalLocation.building || '',
      ...(finalLocation.origin && {
        geolocation: {
          lat: finalLocation.origin.lat,
          lng: finalLocation.origin.lng,
        },
      }),
    };

    onComplete(locationData);
  };

  return (
    <div className={css.root}>
      <div className={css.header}>
        <h2 className={css.title}>
          <FormattedMessage
            id="AIListingCreation.locationTitle"
            defaultMessage="Where is your item located?"
          />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id="AIListingCreation.locationDescription"
            defaultMessage="Help renters find your item by providing its location. This will be shown on the map."
          />
        </p>
      </div>

      <div className={css.content}>
        {/* Current Location Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGettingLocation || isSubmitting}
          className={css.currentLocationButton}
        >
          {isGettingLocation ? (
            <>
              <div className={css.spinner} />
              Getting your location...
            </>
          ) : (
            <>📍 Use Current Location</>
          )}
        </button>

        <div className={css.divider}>
          <span>or</span>
        </div>

        {/* Location Autocomplete Input */}
        <div className={css.autocompleteWrapper}>
          <LocationAutocompleteInputImpl
            input={{
              name: 'location',
              value: location,
              onChange: handleLocationChange,
            }}
            meta={{}}
            placeholder="Enter address, city, or place"
            iconClassName={css.searchIcon}
            inputClassName={css.searchInput}
            predictionsClassName={css.predictions}
            predictionsAttributionClassName={css.attribution}
            validClassName={css.valid}
            autoFocus
          />
        </div>

        {/* Selected Location Display */}
        {location && location.address && (
          <div className={css.selectedLocation}>
            <div className={css.selectedIcon}>✓</div>
            <div className={css.selectedText}>
              <strong>Selected location:</strong>
              <br />
              {location.address}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <div className={css.error}>⚠️ {error}</div>}
      </div>

      {/* Actions */}
      <div className={css.footer}>
        <button type="button" onClick={onBack} className={css.backButton} disabled={isSubmitting}>
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className={css.continueButton}
          disabled={isSubmitting || isGeocoding || !location || !location.address}
        >
          {isGeocoding ? 'Geocoding address...' : 'Continue to Preview →'}
        </button>
      </div>
    </div>
  );
};

export default LocationInput;
