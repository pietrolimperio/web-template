import React, { useState, useEffect } from 'react';
import { bool, func, object } from 'prop-types';
import { FormattedMessage } from '../../util/reactIntl';
import { LocationAutocompleteInput } from '../../components';
import css from './LocationSelection.module.css';

/**
 * LocationSelection Component
 * 
 * Features:
 * - Location search with autocomplete (Mapbox/Google)
 * - Geolocation support
 * - Building/apartment number input
 */
const LocationSelection = ({ onComplete, onBack, isSubmitting }) => {
  const [location, setLocation] = useState(null);
  const [building, setBuilding] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Request geolocation permission on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      // Check if permission already granted
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            // Permission already granted, but don't auto-fetch
            // Let user click button
          }
        });
      }
    }
  }, []);

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        // This will be handled by LocationAutocompleteInput
        // For now, set the coordinates
        setLocation({
          address: `${latitude}, ${longitude}`,
          origin: { lat: latitude, lng: longitude },
          bounds: null,
        });
        setIsGettingLocation(false);
      },
      error => {
        setLocationError('Unable to get your location. Please enter manually.');
        setIsGettingLocation(false);
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleLocationChange = value => {
    setLocation(value);
    setLocationError(null);
  };

  const handleSubmit = () => {
    if (!location || !location.address) {
      setLocationError('Please select a location');
      return;
    }

    const locationData = {
      address: location.address,
      building: building.trim(),
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
            id="AIListingCreation.locationSubtitle"
            defaultMessage="Help renters find your listing"
          />
        </p>
      </div>

      {/* Geolocation Button */}
      <div className={css.section}>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGettingLocation || isSubmitting}
          className={css.geoButton}
        >
          {isGettingLocation ? (
            <>
              <div className={css.spinner} />
              <FormattedMessage
                id="AIListingCreation.gettingLocation"
                defaultMessage="Getting your location..."
              />
            </>
          ) : (
            <>
              📍{' '}
              <FormattedMessage
                id="AIListingCreation.useCurrentLocation"
                defaultMessage="Use my current location"
              />
            </>
          )}
        </button>
      </div>

      {/* Location Search */}
      <div className={css.section}>
        <label className={css.label}>
          <FormattedMessage
            id="AIListingCreation.locationLabel"
            defaultMessage="Address or location"
          />
        </label>
        <LocationAutocompleteInput
          input={{
            value: location,
            onChange: handleLocationChange,
          }}
          meta={{}}
          placeholder="Search for an address..."
          iconClassName={css.locationIcon}
        />
        {locationError && <div className={css.error}>⚠️ {locationError}</div>}
      </div>

      {/* Building/Apartment */}
      <div className={css.section}>
        <label className={css.label}>
          <FormattedMessage
            id="AIListingCreation.buildingLabel"
            defaultMessage="Building, apartment, or unit (optional)"
          />
        </label>
        <input
          type="text"
          value={building}
          onChange={e => setBuilding(e.target.value)}
          className={css.input}
          placeholder="e.g., Building A, Apartment 3B"
          disabled={isSubmitting}
        />
      </div>

      {/* Help Text */}
      <div className={css.helpText}>
        <p>
          💡 <strong>Tip:</strong> Your exact address won't be shared publicly until a booking is
          confirmed. Only the general area will be visible on the map.
        </p>
      </div>

      {/* Footer Actions */}
      <div className={css.footer}>
        <button type="button" onClick={onBack} className={css.backButton} disabled={isSubmitting}>
          ← Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className={css.continueButton}
          disabled={isSubmitting || !location}
        >
          {isSubmitting ? 'Saving...' : 'Continue to Preview'}
        </button>
      </div>
    </div>
  );
};

LocationSelection.propTypes = {
  onComplete: func.isRequired,
  onBack: func.isRequired,
  isSubmitting: bool,
};

export default LocationSelection;
