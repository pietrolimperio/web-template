import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { types as sdkTypes } from '../../util/sdkLoader';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';
import { useConfiguration } from '../../context/configurationContext';
import { DEFAULT_LOCALE } from '../../config/localeConfig';
import { Map, AddressCascadingDropdowns } from '../../components';
import LocationAutocompleteInputImpl from '../../components/LocationAutocompleteInput/LocationAutocompleteInput';
import AvailabilityCalendar from './AvailabilityCalendar';
import classNames from 'classnames';
import css from './ListingConfigurationPage.module.css';

const { LatLng } = sdkTypes;

// Helper function for form field formatting
const identity = v => v;

/**
 * ListingConfigurationPage Component
 *
 * Tabbed interface with three sections:
 * 1. Calendar Availability
 * 2. Pricing Configuration
 * 3. Location Details
 */
const ListingConfigurationPage = ({
  suggestedPrice,
  currentUser,
  onComplete,
  onBack,
  isSubmitting,
}) => {
  const intl = useIntl();
  const config = useConfiguration();
  const timezone = getDefaultTimeZoneOnBrowser();
  const currency = config?.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  const marketplaceColor = config?.branding?.marketplaceColor || '#4A90E2';

  // Tab state
  const [currentTab, setCurrentTab] = useState('availability'); // 'availability' | 'price' | 'location'

  // Calendar Availability State
  const [selectedDates, setSelectedDates] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [showExceptionCalendar, setShowExceptionCalendar] = useState(false);
  const [editingException, setEditingException] = useState(null);

  // Pricing State
  const parsedPrice = suggestedPrice?.match(/\$?(\d+)/);
  const defaultPriceAmount = parsedPrice ? parseInt(parsedPrice[1], 10) * 100 : 2000;
  const [defaultPrice, setDefaultPrice] = useState(defaultPriceAmount);
  const [priceVariants, setPriceVariants] = useState([]);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [variantType, setVariantType] = useState('length'); // 'length' | 'seasonality'
  const [editingVariant, setEditingVariant] = useState(null);
  const [newVariant, setNewVariant] = useState({
    price: defaultPriceAmount,
    minLength: 10,
    maxLength: '',
    dates: [],
  });

  // Location State
  const [locationVisible, setLocationVisible] = useState(true);
  const [handByHandAvailable, setHandByHandAvailable] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false); // Track if user initiated search
  const [showFullForm, setShowFullForm] = useState(false); // Show full form after autocomplete selection
  const [showLocationTooltip, setShowLocationTooltip] = useState(false); // Show tooltip when trying to disable location
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
  const [geolocation, setGeolocation] = useState(null);
  const [addressFieldsChanged, setAddressFieldsChanged] = useState(false); // Track if user changed any field
  const [addressFromAutocomplete, setAddressFromAutocomplete] = useState(false); // Track if address came from autocomplete
  const [invalidFields, setInvalidFields] = useState([]); // Track which fields are invalid
  
  // Get current locale from localStorage (default: it-IT)
  const currentLocale =
    typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
      : DEFAULT_LOCALE;

  // Validate mandatory location fields
  const validateLocationFields = () => {
    const invalid = [];
    if (!manualAddress.street.trim()) invalid.push('street');
    if (!manualAddress.streetNumber.trim()) invalid.push('streetNumber');
    if (!manualAddress.city.trim()) invalid.push('city');
    if (!manualAddress.region.trim()) invalid.push('region');
    if (!manualAddress.postalCode.trim()) invalid.push('postalCode');
    if (!manualAddress.country.trim()) invalid.push('country');
    return invalid;
  };

  // Check if location form is valid
  const isLocationValid = () => {
    return validateLocationFields().length === 0;
  };

  // Initialize location from user data
  useEffect(() => {
    console.log('🔍 ListingConfigurationPage - Location Tab - Starting prefill logic');
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

        // Check if user has geolocation
        if (userAddress.geolocation) {
          console.log('✅ Geolocation found:', userAddress.geolocation);
          const userGeolocation = new LatLng(
            userAddress.geolocation.lat,
            userAddress.geolocation.lng
          );
          setGeolocation(userGeolocation);
        }

        // Pre-fill manual address fields if available
        if (userAddress.addressLine1 || userAddress.city) {
          console.log('📋 Prefilling manual address fields');

          // Parse addressLine1 to separate street and street number
          let street = userAddress.addressLine1 || '';
          let streetNumber = '';

          // Try to extract street number from the end of addressLine1
          if (userAddress.addressLine1) {
            const match = userAddress.addressLine1.match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
            if (match) {
              street = match[1].trim();
              streetNumber = match[2].trim();
              console.log(`📋 Parsed address: street="${street}", number="${streetNumber}"`);
            }
          }

          setManualAddress({
            street: street,
            streetNumber: streetNumber,
            addressLine2: userAddress.addressLine2 || '',
            city: userAddress.city || '',
            region: userAddress.state || '',
            postalCode: userAddress.postalCode || '',
            country: userAddress.country || '',
          });

          // Enable search and show full form to display prefilled fields
          console.log('✅ Enabling full form to display prefilled data from profile');
          setShowAddressSearch(true);
          setShowFullForm(true);
          setAddressFromAutocomplete(true); // Treat profile data as if from autocomplete
          setAddressFieldsChanged(false); // No changes yet
        }
      }
      // Fallback: Check legacy location data in publicData
      else if (publicData.location && publicData.location.lat && publicData.location.lng) {
        console.log('✅ Found legacy publicData.location:', publicData.location);
        const userGeolocation = new LatLng(publicData.location.lat, publicData.location.lng);
        setGeolocation(userGeolocation);
        console.log(
          '🎯 Set geolocation from legacy data (manual address fields left empty for user to fill)'
        );
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

  // Calculate commission and shipping
  const calculateFees = price => {
    const priceInEuros = price / 100;
    const commission = Math.max(priceInEuros * 0.1, 5);
    const shipping = 4.99;
    const netAmount = priceInEuros - commission - shipping;
    return {
      commission: commission.toFixed(2),
      shipping: shipping.toFixed(2),
      net: netAmount.toFixed(2),
    };
  };

  // Exception Handlers
  const handleAddException = exceptionDates => {
    let updatedExceptions;
    if (editingException) {
      // Update existing exception
      updatedExceptions = exceptions.map(exc =>
        exc.id === editingException.id ? { ...exc, dates: exceptionDates } : exc
      );
      setEditingException(null);
    } else {
      // Add new exception
      updatedExceptions = [
        ...exceptions,
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
    
    setExceptions(sortedExceptions);
    setShowExceptionCalendar(false);
  };

  const handleEditException = exception => {
    setEditingException(exception);
    setNewVariant({ ...newVariant, dates: exception.dates });
    setShowExceptionCalendar(true);
  };

  const handleRemoveException = id => {
    setExceptions(exceptions.filter(e => e.id !== id));
  };

  // Format exception dates for display
  const formatExceptionDates = dates => {
    if (dates.length === 1) {
      return dates[0].toLocaleDateString(intl.locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const start = dates[0].toLocaleDateString(intl.locale, { month: 'short', day: 'numeric' });
    const end = dates[dates.length - 1].toLocaleDateString(intl.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  // Format variant dates for display
  const formatVariantDates = dates => {
    if (!dates || dates.length === 0) return '';
    if (dates.length === 1) {
      return dates[0].toLocaleDateString(intl.locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const start = dates[0].toLocaleDateString(intl.locale, { month: 'short', day: 'numeric' });
    const end = dates[dates.length - 1].toLocaleDateString(intl.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  // Price Variant Handlers
  const handleAddVariant = () => {
    if (variantType === 'length' && !newVariant.minLength) {
      alert(
        intl.formatMessage({
          id: 'ListingConfiguration.errorMinLength',
          defaultMessage: 'Please specify minimum length',
        })
      );
      return;
    }
    if (variantType === 'seasonality' && newVariant.dates.length === 0) {
      alert(
        intl.formatMessage({
          id: 'ListingConfiguration.errorSeasonalityDates',
          defaultMessage: 'Please select dates for this price variant',
        })
      );
      return;
    }

    const variant = {
      id: editingVariant?.id || Date.now().toString(),
      type: variantType,
      price: newVariant.price,
      ...(variantType === 'length' && {
        minLength: newVariant.minLength,
        maxLength: newVariant.maxLength || null,
      }),
      ...(variantType === 'seasonality' && {
        dates: newVariant.dates,
      }),
    };

    if (editingVariant) {
      setPriceVariants(priceVariants.map(v => (v.id === editingVariant.id ? variant : v)));
      setEditingVariant(null);
    } else {
      setPriceVariants([...priceVariants, variant]);
    }

    setShowAddVariant(false);
    setNewVariant({
      price: defaultPriceAmount,
      minLength: 10,
      maxLength: '',
      dates: [],
    });
  };

  const handleEditVariant = variant => {
    setEditingVariant(variant);
    setVariantType(variant.type);
    setNewVariant({
      price: variant.price,
      minLength: variant.minLength || 10,
      maxLength: variant.maxLength || '',
      dates: variant.dates || [],
    });
    setShowAddVariant(true);
  };

  const handleRemoveVariant = id => {
    setPriceVariants(priceVariants.filter(v => v.id !== id));
  };

  // Location Handlers
  const handleLocationChange = selectedLocation => {
    setLocation(selectedLocation);
    if (selectedLocation?.origin) {
      setGeolocation(new LatLng(selectedLocation.origin.lat, selectedLocation.origin.lng));
    }
  };

  const handleManualAddressChange = (field, value) => {
    setManualAddress({ ...manualAddress, [field]: value });
    // Mark that user has changed a field
    setAddressFieldsChanged(true);
    // Remove field from invalid list when user starts typing
    if (invalidFields.includes(field) && value.trim()) {
      setInvalidFields(invalidFields.filter(f => f !== field));
    }
  };

  // Tab Navigation
  const handleTabChange = tab => {
    setCurrentTab(tab);
  };

  const handleNextTab = () => {
    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (currentTab === 'availability') {
      setCurrentTab('price');
    } else if (currentTab === 'price') {
      // Validate price before moving to location tab
      if (defaultPrice <= 0) {
        alert(
          intl.formatMessage({
            id: 'ListingConfiguration.invalidPriceError',
            defaultMessage: 'Please enter a valid price greater than 0',
          })
        );
        return;
      }
      setCurrentTab('location');
    }
  };

  const handlePreviousTab = () => {
    if (currentTab === 'location') {
      setCurrentTab('price');
    } else if (currentTab === 'price') {
      setCurrentTab('availability');
    } else {
      onBack();
    }
  };

  // Submit Handler
  const handleSubmit = () => {
    // Validate price before submitting
    if (defaultPrice <= 0) {
      alert(
        intl.formatMessage({
          id: 'ListingConfiguration.invalidPriceError',
          defaultMessage: 'Please enter a valid price greater than 0',
        })
      );
      setCurrentTab('price'); // Go back to price tab
      return;
    }

    // Validate location fields before submitting
    const invalid = validateLocationFields();
    if (invalid.length > 0) {
      setInvalidFields(invalid);
      alert(
        intl.formatMessage({
          id: 'ListingConfiguration.invalidLocationError',
          defaultMessage: 'Please fill in all required location fields',
        })
      );
      return;
    }

    // Calculate availableFrom and availableUntil from selectedDates
    let availableFrom = null;
    let availableUntil = null;
    if (selectedDates && selectedDates.length > 0) {
      // Sort dates to get the first and last
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      availableFrom = sortedDates[0];
      availableUntil = sortedDates[sortedDates.length - 1];
    }

    // Build availability plan
    const availabilityPlan = {
      type: 'availability-plan/time',
      timezone,
      entries: [
        { dayOfWeek: 'mon', startTime: '00:00', endTime: '00:00', seats: 1 },
        { dayOfWeek: 'tue', startTime: '00:00', endTime: '00:00', seats: 1 },
        { dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', seats: 1 },
        { dayOfWeek: 'thu', startTime: '00:00', endTime: '00:00', seats: 1 },
        { dayOfWeek: 'fri', startTime: '00:00', endTime: '00:00', seats: 1 },
        { dayOfWeek: 'sat', startTime: '00:00', endTime: '00:00', seats: 1 },
        { dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', seats: 1 },
      ],
    };

    // Build availability exceptions
    const availabilityExceptions = exceptions.flatMap(exc => {
      const dates = exc.dates;
      if (dates.length === 1) {
        const start = new Date(dates[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dates[0]);
        end.setHours(23, 0, 0, 0); // 23:00:00 to satisfy API requirements
        return [
          {
            start: start.toISOString(),
            end: end.toISOString(),
            seats: 0,
          },
        ];
      } else {
        const start = new Date(dates[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dates[dates.length - 1]);
        end.setHours(23, 0, 0, 0); // 23:00:00 to satisfy API requirements
        return [
          {
            start: start.toISOString(),
            end: end.toISOString(),
            seats: 0,
          },
        ];
      }
    });

    // Build pricing data
    const pricingData = {
      price: defaultPrice,
      priceVariationsEnabled: priceVariants.length > 0,
      priceVariants: priceVariants.map(v => ({
        name: `variant_${v.id}`,
        priceInSubunits: v.price,
        type: v.type === 'length' ? 'duration' : 'period', // 'duration' for length-based, 'period' for seasonality
        ...(v.type === 'length' && {
          minLength: v.minLength,
          maxLength: v.maxLength,
        }),
        ...(v.type === 'seasonality' && {
          period: v.dates
            .map(d =>
              d
                .toISOString()
                .split('T')[0]
                .replace(/-/g, '')
            )
            .join(','),
        }),
      })),
    };

    // Build location data with structured address fields
    let addressLine1 = '';
    let addressLine2 = null;
    let city = '';
    let state = '';
    let postalCode = '';
    let country = '';
    let finalGeolocation = null;

    if (showFullForm) {
      // Manual address form
      addressLine1 = `${manualAddress.street}${
        manualAddress.streetNumber ? ' ' + manualAddress.streetNumber : ''
      }`.trim();
      addressLine2 = manualAddress.addressLine2?.trim() || null;
      city = manualAddress.city?.trim() || '';
      state = manualAddress.region?.trim() || '';
      postalCode = manualAddress.postalCode?.trim() || '';
      country = manualAddress.country?.trim() || '';
      
      // Include geolocation if available and fields haven't been changed
      if (geolocation && !addressFieldsChanged) {
        finalGeolocation = {
          lat: geolocation.lat,
          lng: geolocation.lng,
        };
      }
    } else if (locationAutocompleteValue.selectedPlace) {
      // From autocomplete
      const place = locationAutocompleteValue.selectedPlace;
      addressLine1 = place.street && place.streetNumber 
        ? `${place.street} ${place.streetNumber}`.trim()
        : place.street || place.address || '';
      addressLine2 = null;
      city = place.city || '';
      state = place.state || '';
      postalCode = place.postalCode || '';
      country = place.country || '';
      
      // Include geolocation from autocomplete if available
      if (place.origin) {
        finalGeolocation = {
          lat: place.origin.lat,
          lng: place.origin.lng,
        };
      }
    }

    const fullAddress = [addressLine1, city, postalCode, country]
      .filter(Boolean)
      .join(', ');

    const locationData = {
      address: fullAddress,
      building: '',
      locationVisible,
      handByHandAvailable,
      // Structured address fields
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
      country: country || null,
      // Geolocation
      ...(finalGeolocation && {
        geolocation: finalGeolocation,
      }),
    };

    onComplete({
      availability: {
        availabilityPlan,
        availabilityExceptions,
        availableFrom: availableFrom ? availableFrom.toISOString() : null,
        availableUntil: availableUntil ? availableUntil.toISOString() : null,
      },
      pricing: pricingData,
      location: locationData,
    });
  };

  const fees = calculateFees(defaultPrice);

  // Render Tab Content
  const renderTabContent = () => {
    switch (currentTab) {
      case 'availability':
        return renderAvailabilityTab();
      case 'price':
        return renderPriceTab();
      case 'location':
        return renderLocationTab();
      default:
        return null;
    }
  };

  // Availability Tab
  const renderAvailabilityTab = () => {
    // Calculate availableFrom and availableUntil from selectedDates
    let availableFrom = null;
    let availableUntil = null;
    if (selectedDates && selectedDates.length > 0) {
      // Sort dates to get the first and last
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      availableFrom = sortedDates[0].toISOString();
      availableUntil = sortedDates[sortedDates.length - 1].toISOString();
    }

    return (
      <section className={css.section}>
        <div className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>
            <FormattedMessage
              id="ListingConfiguration.availabilityTitle"
              defaultMessage="Calendar Availability"
            />
          </h2>
          <p className={css.sectionDescription}>
            <FormattedMessage
              id="ListingConfiguration.availabilityDescription"
              defaultMessage="Select the dates when your item will be available for rent. All dates from today onwards are selected by default."
            />
          </p>
        </div>

        <div className={css.calendarWrapper}>
          <AvailabilityCalendar
            selectedDates={selectedDates}
            onDatesChange={setSelectedDates}
            marketplaceColor={marketplaceColor}
            availableFrom={availableFrom}
            availableUntil={availableUntil}
          />
        </div>

      {/* Exceptions */}
      <div className={css.exceptionsSection}>
        <div className={css.exceptionsHeader}>
          <button
            type="button"
            className={css.infoIcon}
            style={{
              background: 'transparent',
              border: `2px solid ${marketplaceColor}`,
              color: marketplaceColor,
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
              setNewVariant({ ...newVariant, dates: [] });
              setShowExceptionCalendar(!showExceptionCalendar);
            }}
            className={css.addExceptionLink}
            style={{ color: marketplaceColor }}
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
              marketplaceColor={marketplaceColor}
              availableFrom={availableFrom}
              availableUntil={availableUntil}
              disabledDates={exceptions
                .filter(exc => !editingException || exc.id !== editingException.id)
                .flatMap(exc => exc.dates)}
            />
            <div className={css.exceptionActions}>
              <button
                type="button"
                onClick={() => {
                  handleAddException(newVariant.dates);
                  setNewVariant({ ...newVariant, dates: [] });
                }}
                className={css.saveExceptionButton}
                style={{ background: marketplaceColor }}
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
                  setNewVariant({ ...newVariant, dates: [] });
                }}
                className={css.cancelButton}
              >
                <FormattedMessage id="ListingConfiguration.cancel" defaultMessage="Cancel" />
              </button>
            </div>
          </div>
        )}

        {exceptions.length > 0 && (
          <div className={css.exceptionsList}>
            {exceptions.map(exc => (
              <div
                key={exc.id}
                className={css.exceptionCard}
                onClick={() => handleEditException(exc)}
                style={{ borderColor: marketplaceColor }}
              >
                <span className={css.exceptionDates}>{formatExceptionDates(exc.dates)}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveException(exc.id);
                  }}
                  className={css.removeButton}
                  style={{ 
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'var(--marketplaceColor)',
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
    );
  };

  // Price Tab
  const renderPriceTab = () => (
    <section className={css.section}>
      <div className={css.sectionHeader}>
        <h2 className={css.sectionTitle}>
          <FormattedMessage
            id="ListingConfiguration.pricingTitle"
            defaultMessage="Price Configuration"
          />
        </h2>
        <p className={css.sectionDescription}>
          <FormattedMessage
            id="ListingConfiguration.pricingDescription"
            defaultMessage="Set your daily rental price and optional variants"
          />
        </p>
      </div>

      <div className={css.priceInputWrapper}>
        <label className={css.priceLabel}>
          <FormattedMessage id="ListingConfiguration.priceLabel" defaultMessage="Daily Price" />
        </label>
        <div className={css.priceInputGroup}>
          <span className={css.currencySymbol}>{currencySymbol}</span>
          <input
            type="number"
            value={defaultPrice === 0 ? '' : defaultPrice / 100}
            onChange={e => {
              const value = e.target.value;
              if (value === '' || value === null || value === undefined) {
                setDefaultPrice(0);
              } else {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue > 0) {
                  setDefaultPrice(Math.round(numValue * 100));
                } else {
                  setDefaultPrice(0);
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
          <button
            type="button"
            className={css.infoIcon}
            style={{
              background: 'transparent',
              border: `2px solid ${marketplaceColor}`,
              color: marketplaceColor,
            }}
            title={intl.formatMessage({
              id: 'ListingConfiguration.priceInfo',
              defaultMessage: 'Price information',
            })}
          >
            i
            <div className={css.tooltip}>
              <p className={css.tooltipMessage}>
                <FormattedMessage
                  id="ListingConfiguration.tooltipMessage"
                  defaultMessage="This is not the final amount you will receive, as fees and commissions apply:"
                />
              </p>
              <div className={css.tooltipContent}>
                <div className={css.tooltipRow}>
                  <span>
                    <FormattedMessage
                      id="ListingConfiguration.customerPays"
                      defaultMessage="Customer pays:"
                    />
                  </span>
                  <span>
                    {currency} {(defaultPrice / 100).toFixed(2)}
                  </span>
                </div>
                <div className={css.tooltipRow}>
                  <span>
                    <FormattedMessage
                      id="ListingConfiguration.commission"
                      defaultMessage="Service commission:"
                    />
                  </span>
                  <span>
                    - {currency} {fees.commission}
                  </span>
                </div>
                <div className={css.tooltipRow}>
                  <span>
                    <FormattedMessage
                      id="ListingConfiguration.shipping"
                      defaultMessage="Return shipping:"
                    />{' '}
                    <span className={css.exampleNote}>
                      <FormattedMessage
                        id="ListingConfiguration.shippingExample"
                        defaultMessage="(example)"
                      />
                    </span>
                  </span>
                  <span>
                    - {currency} {fees.shipping}
                  </span>
                </div>
                <div className={classNames(css.tooltipRow, css.tooltipTotal)}>
                  <span>
                    <FormattedMessage
                      id="ListingConfiguration.youReceive"
                      defaultMessage="You receive:"
                    />
                  </span>
                  <span>
                    {currency} {fees.net}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Price Variants */}
      <div className={css.variantsSection}>
        <h3 className={css.variantsTitle}>
          <FormattedMessage
            id="ListingConfiguration.priceVariants"
            defaultMessage="Price Variants (Optional)"
          />
        </h3>

        {priceVariants.length > 0 && (
          <div className={css.variantsList}>
            {priceVariants.map(variant => {
              // Format price variant label
              let variantLabel = '';
              if (variant.type === 'length') {
                if (variant.minLength && variant.maxLength) {
                  variantLabel = intl.formatMessage(
                    {
                      id: 'PreviewListingPage.fromToDays',
                      defaultMessage: 'from {min} to {max} days',
                    },
                    {
                      min: variant.minLength,
                      max: variant.maxLength,
                    }
                  );
                } else if (variant.minLength) {
                  variantLabel = intl.formatMessage(
                    {
                      id: 'PreviewListingPage.fromDays',
                      defaultMessage: 'from {days} days',
                    },
                    {
                      days: variant.minLength,
                    }
                  );
                }
              } else if (variant.type === 'seasonality' && variant.dates && variant.dates.length > 0) {
                variantLabel = formatVariantDates(variant.dates);
              }

              // Format price with currency
              const priceValue = (variant.price / 100).toFixed(2);
              const formattedPrice = `${currencySymbol}${priceValue}`;

              return (
                <div
                  key={variant.id}
                  className={css.variantItem}
                  onClick={() => handleEditVariant(variant)}
                  style={{ borderColor: marketplaceColor }}
                >
                  <div className={css.priceCardPrice}>{formattedPrice}</div>
                  <div className={css.priceCardLabel}>{variantLabel}</div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveVariant(variant.id);
                    }}
                    className={css.removeButton}
                    style={{ 
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--marketplaceColor)',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!showAddVariant ? (
          <button
            type="button"
            onClick={() => setShowAddVariant(true)}
            className={css.addVariantButton}
          >
            <FormattedMessage
              id="ListingConfiguration.addVariant"
              defaultMessage="+ Add Price Variant"
            />
          </button>
        ) : (
          <div className={css.variantForm}>
            <div className={css.variantTypeSelector}>
              <button
                type="button"
                className={`${css.chipCard} ${
                  variantType === 'length' ? css.chipCardSelected : ''
                }`}
                onClick={() => setVariantType('length')}
                style={
                  variantType === 'length'
                    ? {
                        backgroundColor: marketplaceColor,
                        borderColor: marketplaceColor,
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
                className={`${css.chipCard} ${
                  variantType === 'seasonality' ? css.chipCardSelected : ''
                }`}
                onClick={() => setVariantType('seasonality')}
                style={
                  variantType === 'seasonality'
                    ? {
                        backgroundColor: marketplaceColor,
                        borderColor: marketplaceColor,
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

            <div className={css.variantFields}>
              {variantType === 'length' && (
                <div className={css.lengthVariantFields}>
                  <div className={css.fieldGroup}>
                    <label className={css.fieldLabel}>
                      <FormattedMessage
                        id="ListingConfiguration.variantPrice"
                        defaultMessage="Price"
                      />
                    </label>
                    <div className={css.priceInputGroup}>
                      <span className={css.currencySymbol}>{currencySymbol}</span>
                      <input
                        type="number"
                        value={newVariant.price === 0 ? '' : newVariant.price / 100}
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '' || value === null || value === undefined) {
                            setNewVariant({ ...newVariant, price: 0 });
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue > 0) {
                              setNewVariant({
                                ...newVariant,
                                price: Math.round(numValue * 100),
                              });
                            } else {
                              setNewVariant({ ...newVariant, price: 0 });
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
                  <div className={css.fieldGroup}>
                    <label className={css.fieldLabel}>
                      <FormattedMessage
                        id="ListingConfiguration.minLength"
                        defaultMessage="Minimum length (days)"
                      />
                    </label>
                    <input
                      type="number"
                      value={newVariant.minLength}
                      onChange={e =>
                        setNewVariant({ ...newVariant, minLength: parseInt(e.target.value) || 0 })
                      }
                      className={css.input}
                      min="1"
                    />
                  </div>
                  <div className={css.fieldGroup}>
                    <label className={css.fieldLabel}>
                      <FormattedMessage
                        id="ListingConfiguration.maxLength"
                        defaultMessage="Maximum length (days, optional)"
                      />
                    </label>
                    <input
                      type="number"
                      value={newVariant.maxLength}
                      onChange={e =>
                        setNewVariant({ ...newVariant, maxLength: parseInt(e.target.value) || '' })
                      }
                      className={css.input}
                      min={newVariant.minLength || 1}
                      placeholder={intl.formatMessage({
                        id: 'ListingConfiguration.noLimit',
                        defaultMessage: 'No limit',
                      })}
                    />
                  </div>
                </div>
              )}

              {variantType === 'seasonality' && (
                <div className={css.fieldGroup}>
                  <label className={css.fieldLabel}>
                    <FormattedMessage
                      id="ListingConfiguration.variantPrice"
                      defaultMessage="Price"
                    />
                  </label>
                  <div className={css.priceInputGroup}>
                    <span className={css.currencySymbol}>{currencySymbol}</span>
                    <input
                      type="number"
                      value={newVariant.price === 0 ? '' : newVariant.price / 100}
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '' || value === null || value === undefined) {
                          setNewVariant({ ...newVariant, price: 0 });
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue > 0) {
                            setNewVariant({
                              ...newVariant,
                              price: Math.round(numValue * 100),
                            });
                          } else {
                            setNewVariant({ ...newVariant, price: 0 });
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
              )}

              {variantType === 'seasonality' && (
                <div className={css.seasonalityCalendar}>
                  <p className={css.calendarInstructions}>
                    <FormattedMessage
                      id="ListingConfiguration.seasonalityInstructions"
                      defaultMessage="Select dates or a range for this seasonal price"
                    />
                  </p>
                  <AvailabilityCalendar
                    selectedDates={newVariant.dates}
                    onDatesChange={dates => setNewVariant({ ...newVariant, dates })}
                    selectMode="exception"
                    marketplaceColor={marketplaceColor}
                    disabledDates={exceptions.flatMap(exc => exc.dates)}
                    availableFrom={(() => {
                      // Calculate availableFrom from selectedDates in availability tab
                      if (selectedDates && selectedDates.length > 0) {
                        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
                        return sortedDates[0].toISOString();
                      }
                      return null;
                    })()}
                    availableUntil={(() => {
                      // Calculate availableUntil from selectedDates in availability tab
                      if (selectedDates && selectedDates.length > 0) {
                        const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
                        return sortedDates[sortedDates.length - 1].toISOString();
                      }
                      return null;
                    })()}
                  />
                </div>
              )}
            </div>

            <div className={css.variantActions}>
              <button
                type="button"
                onClick={handleAddVariant}
                className={css.saveButton}
                style={{ background: marketplaceColor }}
                disabled={variantType === 'seasonality' && newVariant.dates.length === 0}
              >
                <FormattedMessage id="ListingConfiguration.save" defaultMessage="Save" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddVariant(false);
                  setEditingVariant(null);
                  setNewVariant({
                    price: defaultPriceAmount,
                    minLength: 10,
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
    </section>
  );

  // Location Tab
  const renderLocationTab = () => (
    <section className={css.section}>
      <div className={css.sectionHeader}>
        <h2 className={css.sectionTitle}>
          <FormattedMessage id="ListingConfiguration.locationTitle" defaultMessage="Location" />
        </h2>
        <p className={css.sectionDescription}>
          <FormattedMessage
            id="ListingConfiguration.locationDescription"
            defaultMessage="Specify where the item is located"
          />
        </p>
      </div>

      <div className={css.locationContent}>
        <div className={css.locationFields}>
          {/* Step 1: Initial chip card to start searching */}
          {!showAddressSearch && (
            <div className={css.addressSection}>
              <button
                type="button"
                className={css.chipCard}
                onClick={() => {
                  setShowAddressSearch(true);
                  setShowFullForm(false);
                }}
                style={{
                  backgroundColor: marketplaceColor,
                  borderColor: marketplaceColor,
                  color: 'white',
                }}
              >
                <FormattedMessage
                  id="ListingConfiguration.searchNewAddress"
                  defaultMessage="Ricerca un nuovo indirizzo"
                />
              </button>
            </div>
          )}

          {/* Step 2: Autocomplete search (only if full form not shown) */}
          {showAddressSearch && !showFullForm && (
            <div className={css.addressSection}>
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
                format={identity}
                input={{
                  name: 'location',
                  value: locationAutocompleteValue,
                  onChange: value => {
                    console.log('LocationAutocompleteInput onChange:', value);
                    setLocationAutocompleteValue(value);

                    // When user selects from autocomplete
                    if (value && value.selectedPlace) {
                      const place = value.selectedPlace;
                      console.log('Selected place:', place);
                      console.log('Place components:', {
                        street: place.street,
                        streetNumber: place.streetNumber,
                        city: place.city,
                        state: place.state,
                        postalCode: place.postalCode,
                        country: place.country,
                      });

                      setGeolocation(place.origin);
                      setAddressFromAutocomplete(true);
                      setAddressFieldsChanged(false);

                      // Address components are directly on the place object
                      const newAddress = {
                        street: place.street || '',
                        streetNumber: place.streetNumber || '',
                        addressLine2: '',
                        city: place.city || '',
                        region: place.state || '', // state is the province/region
                        postalCode: place.postalCode || '',
                        country: place.country || '',
                      };
                      setManualAddress(newAddress);

                      // Show full form after selection
                      setShowFullForm(true);

                      // Validate fields after autocomplete to highlight missing ones
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
              <button
                type="button"
                className={css.chipCard}
                onClick={() => {
                  // Switch to manual entry with empty fields
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
                  setGeolocation(null);
                  setAddressFromAutocomplete(false);
                  setAddressFieldsChanged(false);
                }}
                style={{
                  backgroundColor: 'white',
                  borderColor: marketplaceColor,
                  color: marketplaceColor,
                  marginTop: '1rem',
                }}
              >
                <FormattedMessage
                  id="ListingConfiguration.cantFindAddress"
                  defaultMessage="Non trovi l'indirizzo? Procedi con l'inserimento manualmente"
                />
              </button>
            </div>
          )}

          {/* Step 3: Full address form (after autocomplete selection or from profile) */}
          {showAddressSearch && showFullForm && (
            <div className={css.manualAddressForm}>
              <button
                type="button"
                className={css.chipCard}
                onClick={() => {
                  // Go back to autocomplete
                  setShowFullForm(false);
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
                  setGeolocation(null);
                  setAddressFromAutocomplete(false);
                  setAddressFieldsChanged(false);
                }}
                style={{
                  backgroundColor: 'white',
                  borderColor: marketplaceColor,
                  color: marketplaceColor,
                  marginBottom: '20px',
                }}
              >
                <FormattedMessage
                  id="ListingConfiguration.useAutomaticSearch"
                  defaultMessage="Procedi con la ricerca automatica"
                />
              </button>
              {/* Street name and number */}
              <div className={css.twoColumns}>
                <div className={css.fieldGroup}>
                  <label className={css.fieldLabel}>
                    <FormattedMessage id="ListingConfiguration.street" defaultMessage="Street" />
                  </label>
                  <input
                    type="text"
                    value={manualAddress.street}
                    onChange={e => handleManualAddressChange('street', e.target.value)}
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
                    onChange={e => handleManualAddressChange('streetNumber', e.target.value)}
                    className={`${css.input} ${
                      invalidFields.includes('streetNumber') ? css.inputInvalid : ''
                    }`}
                    placeholder="123"
                  />
                </div>
              </div>
              
              {/* Apartment/Address line 2 (optional) */}
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
                  onChange={e => handleManualAddressChange('addressLine2', e.target.value)}
                  className={css.input}
                  placeholder={intl.formatMessage({
                    id: 'ListingConfiguration.apartmentPlaceholder',
                    defaultMessage: 'Apt, Suite, Unit, etc.',
                  })}
                />
              </div>
              
              {/* Cascading dropdowns: Country -> State/Province -> City */}
              <AddressCascadingDropdowns
                locale={currentLocale}
                initialCountry={manualAddress.country}
                initialState={manualAddress.region}
                initialCity={manualAddress.city}
                className={css.cascadingDropdowns}
                labelClassName={css.fieldLabel}
                selectClassName={css.input}
                onCountryChange={(country, translatedName) => {
                  handleManualAddressChange('country', translatedName);
                  handleManualAddressChange('region', '');
                  handleManualAddressChange('city', '');
                }}
                onStateChange={(state, stateName, stateCode) => {
                  // Use state code (e.g., "TA" for Taranto) for consistency with existing data
                  handleManualAddressChange('region', stateCode || stateName);
                  handleManualAddressChange('city', '');
                }}
                onCityChange={(city, cityName) => {
                  handleManualAddressChange('city', cityName);
                }}
              />
              
              {/* Postal Code */}
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
                  onChange={e => handleManualAddressChange('postalCode', e.target.value)}
                  className={`${css.input} ${
                    invalidFields.includes('postalCode') ? css.inputInvalid : ''
                  }`}
                />
              </div>
            </div>
          )}

          {/* Location Options as Chip Cards */}
          <div className={css.locationOptionsSection}>
            <h4 className={css.locationOptionsTitle}>
              <FormattedMessage
                id="ListingConfiguration.locationOptions"
                defaultMessage="Location Options"
              />
            </h4>
            <div className={css.chipCardsGroup}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`${css.chipCard} ${locationVisible ? css.chipCardSelected : ''}`}
                  onClick={() => {
                    // Cannot disable location visibility if hand-by-hand is enabled
                    if (handByHandAvailable) {
                      // Show tooltip when trying to click while disabled
                      setShowLocationTooltip(true);
                      setTimeout(() => setShowLocationTooltip(false), 3000);
                    } else {
                      setLocationVisible(!locationVisible);
                    }
                  }}
                  style={
                    locationVisible
                      ? {
                          backgroundColor: marketplaceColor,
                          borderColor: marketplaceColor,
                          color: 'white',
                        }
                      : handByHandAvailable
                      ? {
                          opacity: 0.6,
                          cursor: 'not-allowed',
                        }
                      : {}
                  }
                >
                  <FormattedMessage
                    id="ListingConfiguration.makeLocationVisible"
                    defaultMessage="Make location visible to other users"
                  />
                </button>
                {showLocationTooltip && handByHandAvailable && (
                  <div className={css.locationTooltip}>
                    <FormattedMessage
                      id="ListingConfiguration.cannotDisableLocationTooltip"
                      defaultMessage="Non puoi disabilitare questa opzione se sei disponibile allo consegna a mano"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`${css.chipCard} ${handByHandAvailable ? css.chipCardSelected : ''}`}
                onClick={() => {
                  const newValue = !handByHandAvailable;
                  setHandByHandAvailable(newValue);
                  // If enabling hand-by-hand, also enable location visibility
                  if (newValue) {
                    setLocationVisible(true);
                  }
                }}
                style={
                  handByHandAvailable
                    ? {
                        backgroundColor: marketplaceColor,
                        borderColor: marketplaceColor,
                        color: 'white',
                      }
                    : {}
                }
              >
                <FormattedMessage
                  id="ListingConfiguration.handByHand"
                  defaultMessage="Available for hand-by-hand exchange"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Map - Only show if we have geolocation */}
        {geolocation && (
          <div className={css.mapContainer}>
            <div className={css.anonymizedMapWrapper}>
              <div className={css.mapWrapper}>
                <Map
                  center={geolocation}
                  obfuscatedCenter={geolocation}
                  address={
                    locationAutocompleteValue.selectedPlace?.address || manualAddress.city || ''
                  }
                  zoom={12}
                  useStaticMap={true}
                  mapsConfig={{
                    ...config.maps,
                    fuzzy: {
                      enabled: true,
                      offset: 0,
                      circleColor: '#c0392b',
                    },
                  }}
                />
              </div>
              <div className={css.anonymizedOverlay}>
                <div className={css.anonymizedCircle} />
                <p className={css.anonymizedText}>
                  <FormattedMessage
                    id="ListingConfiguration.approximateLocation"
                    defaultMessage="Approximate location for privacy"
                  />
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className={css.root} style={{ '--marketplaceColor': marketplaceColor }}>
      <div className={css.header}>
        <h1 className={css.title}>
          <FormattedMessage
            id="ListingConfiguration.title"
            defaultMessage="Configure Your Listing"
          />
        </h1>
        <p className={css.subtitle}>
          <FormattedMessage
            id="ListingConfiguration.subtitle"
            defaultMessage="Set availability, pricing, and location for your rental"
          />
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={css.tabBar}>
        <button
          type="button"
          onClick={() => handleTabChange('availability')}
          className={classNames(css.tab, {
            [css.tabActive]: currentTab === 'availability',
          })}
        >
          <span className={css.tabNumber}>1</span>
          <FormattedMessage
            id="ListingConfiguration.tabAvailability"
            defaultMessage="Availability"
          />
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('price')}
          className={classNames(css.tab, {
            [css.tabActive]: currentTab === 'price',
          })}
        >
          <span className={css.tabNumber}>2</span>
          <FormattedMessage id="ListingConfiguration.tabPrice" defaultMessage="Price" />
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('location')}
          className={classNames(css.tab, {
            [css.tabActive]: currentTab === 'location',
          })}
        >
          <span className={css.tabNumber}>3</span>
          <FormattedMessage id="ListingConfiguration.tabLocation" defaultMessage="Location" />
        </button>
      </div>

      <div className={css.content}>{renderTabContent()}</div>

      {/* Footer Actions */}
      <div className={css.footer}>
        <button
          type="button"
          onClick={handlePreviousTab}
          disabled={isSubmitting}
          className={css.backButton}
        >
          ← <FormattedMessage id="ListingConfiguration.back" defaultMessage="Back" />
        </button>
        {currentTab === 'location' ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isLocationValid()}
            className={css.continueButton}
            style={{ background: marketplaceColor }}
          >
            {isSubmitting ? (
              <>
                <div className={css.spinner} />
                <FormattedMessage id="ListingConfiguration.saving" defaultMessage="Saving..." />
              </>
            ) : (
              <FormattedMessage
                id="ListingConfiguration.continue"
                defaultMessage="Continue to Preview →"
              />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNextTab}
            disabled={isSubmitting}
            className={css.continueButton}
            style={{ background: marketplaceColor }}
          >
            <FormattedMessage id="ListingConfiguration.next" defaultMessage="Next →" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ListingConfigurationPage;
