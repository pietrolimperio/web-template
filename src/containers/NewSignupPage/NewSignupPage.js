import React, { useState, useEffect, useRef } from 'react';
import { bool, func, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { isSignupEmailTakenError } from '../../util/errors';
import { types as sdkTypes } from '../../util/sdkLoader';
import { DEFAULT_LOCALE } from '../../config/localeConfig';

import { signup, authenticationInProgress } from '../../ducks/auth.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  autocompleteSearchRequired,
  autocompletePlaceSelected,
  composeValidators,
} from '../../util/validators';

import {
  Page,
  Form,
  PrimaryButton,
  FieldTextInput,
  FieldSelect,
  FieldCheckbox,
  FieldLocationAutocompleteInput,
  NamedLink,
  IconSpinner,
  IconLocation,
  AddressCascadingDropdowns,
} from '../../components';

import logoImage from '../../assets/logo.png';
import css from './NewSignupPage.module.css';

const { LatLng } = sdkTypes;

const identity = v => v;

/**
 * Geocode an address using Mapbox Geocoding API
 * @param {Object} addressData - Address components
 * @param {string} addressData.street - Street name
 * @param {string} addressData.streetNumber - Street number
 * @param {string} addressData.city - City
 * @param {string} addressData.state - State/Province
 * @param {string} addressData.country - Country
 * @param {string} addressData.postalCode - Postal code
 * @param {string} countryCode - ISO country code for limiting results (e.g., 'IT')
 * @returns {Promise<LatLng|null>} - Geolocation coordinates or null if not found
 */
const geocodeAddress = async (addressData, countryCode) => {
  const { street, streetNumber, city, state, country, postalCode } = addressData;

  // Check if Mapbox SDK is available
  if (typeof window === 'undefined' || !window.mapboxgl || !window.mapboxSdk || !window.mapboxgl.accessToken) {
    console.warn('Mapbox SDK not available for geocoding');
    return null;
  }

  // Build query string from address components
  const addressParts = [
    street,
    streetNumber,
    city,
    state,
    country,
    postalCode,
  ].filter(Boolean); // Remove empty parts

  if (addressParts.length === 0) {
    return null;
  }

  const query = addressParts.join(', ');

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
        query: query,
      },
      query: queryParams,
    });

    const response = await request.send();

    if (response.body && response.body.features && response.body.features.length > 0) {
      const feature = response.body.features[0];
      if (feature.center && Array.isArray(feature.center) && feature.center.length === 2) {
        // Mapbox returns coordinates as [longitude, latitude]
        const [lng, lat] = feature.center;
        return new LatLng(lat, lng);
      }
    }

    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

// Phone number validation using libphonenumber-js
const phoneNumberValid = (message, phonePrefix) => value => {
  if (!value) return null; // Let required validator handle empty values

  try {
    // Combine prefix and number for validation
    const fullNumber = `${phonePrefix}${value}`;
    const isValid = isValidPhoneNumber(fullNumber);
    return isValid ? null : message;
  } catch (error) {
    return message;
  }
};

// Date of birth validation - not in the future
const dateNotInFuture = message => value => {
  if (!value) return null; // Let required validator handle empty values

  const today = new Date();
  const selectedDate = new Date(value);

  // Check if date is valid
  if (isNaN(selectedDate.getTime())) {
    return message;
  }

  // Check if date is not in the future
  if (selectedDate > today) {
    return message;
  }

  return null;
};

// Age validation (18+ years old)
const ageAtLeast18 = message => value => {
  if (!value) return null; // Let required validator handle empty values

  const today = new Date();
  const birthDate = new Date(value);

  // Check if date is valid
  if (isNaN(birthDate.getTime())) {
    return null; // Other validator will handle invalid dates
  }

  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 18 ? null : message;
};

// Tax ID regex patterns by country
const TAX_ID_PATTERNS = {
  IT: /^(?:[A-Z][AEIOUX][AEIOUX]|[B-DF-HJ-NP-TV-Z]{2}[A-Z]){2}(?:[\dLMNP-V]{2}(?:[A-EHLMPR-T](?:[04LQ][1-9MNP-V]|[15MR][\dLMNP-V]|[26NS][0-8LMNP-U])|[DHPS][37PT][0L]|[ACELMRT][37PT][01LM]|[AC-EHLMPR-T][26NS][9V])|(?:[02468LNQSU][048LQU]|[13579MPRTV][26NS])B[26NS][9V])(?:[A-MZ][1-9MNP-V][\dLMNP-V]{2}|[A-M][0L](?:[1-9MNP-V][\dLMNP-V]|[0L][1-9MNP-V]))[A-Z]$/, // Italy - Codice Fiscale
  FR: /^(\d{13}|\d{14})$/, // France - NIF
  ES: /^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])$/, // Spain - NIF/NIE
  DE: /^\d{11}$/, // Germany - IdNr
  GB: /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]{1}$/, // UK - NINO
  PT: /^[1-9]\d{8}$/, // Portugal - NIF
  AT: /^\d{10}$/, // Austria - Steuernummer
};

// Get tax ID regex based on locale
const getTaxIdPattern = locale => {
  const baseLocale = locale ? locale.split('-')[0].toUpperCase() : 'IT';
  return TAX_ID_PATTERNS[baseLocale] || TAX_ID_PATTERNS.IT;
};

// Tax ID validation (country-specific)
const taxIdValid = (message, locale) => value => {
  if (!value) return null; // Let required validator handle empty values
  const pattern = getTaxIdPattern(locale);
  return pattern.test(value.toUpperCase()) ? null : message;
};

// Phone prefixes by country
const PHONE_PREFIXES = [
  { code: '+1', country: 'US/CA', label: '+1 (US/CA)' },
  { code: '+44', country: 'GB', label: '+44 (UK)' },
  { code: '+49', country: 'DE', label: '+49 (DE)' },
  { code: '+33', country: 'FR', label: '+33 (FR)' },
  { code: '+39', country: 'IT', label: '+39 (IT)' },
  { code: '+34', country: 'ES', label: '+34 (ES)' },
  { code: '+351', country: 'PT', label: '+351 (PT)' },
  { code: '+31', country: 'NL', label: '+31 (NL)' },
  { code: '+32', country: 'BE', label: '+32 (BE)' },
  { code: '+43', country: 'AT', label: '+43 (AT)' },
  { code: '+41', country: 'CH', label: '+41 (CH)' },
];

// Get default phone prefix based on locale
const getDefaultPhonePrefix = locale => {
  // Extract base locale (e.g., 'it' from 'it-IT')
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'en';
  const localeMap = {
    en: '+44',
    de: '+49',
    fr: '+33',
    it: '+39',
    es: '+34',
    pt: '+351',
  };
  return localeMap[baseLocale] || '+1';
};

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
 * NewSignupPage - A modern signup page with essential user information
 */
export const NewSignupPageComponent = ({
  authInProgress,
  currentUser = null,
  isAuthenticated,
  location,
  signupError = null,
  scrollingDisabled,
  submitSignup,
  sendVerificationEmailInProgress = false,
  sendVerificationEmailError = null,
  onResendVerificationEmail,
}) => {
  const config = useConfiguration();
  const intl = useIntl();
  const [mounted, setMounted] = useState(false);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [selectedAddressComponents, setSelectedAddressComponents] = useState(null);
  const [selectedGeolocation, setSelectedGeolocation] = useState(null);
  const [manualFieldsChanged, setManualFieldsChanged] = useState(false);
  const [autocompleteUsed, setAutocompleteUsed] = useState(false); // Track if autocomplete was used
  const [isGeocoding, setIsGeocoding] = useState(false); // Track geocoding in progress
  const errorRef = useRef(null);
  
  // Cascading dropdown state for manual address entry
  const [cascadingCountry, setCascadingCountry] = useState('');
  const [cascadingState, setCascadingState] = useState('');
  const [cascadingCity, setCascadingCity] = useState('');

  // Get marketplace color from config
  const marketplaceColor = config.branding?.marketplaceColor || '#0c9fa7';

  // Get current locale from localStorage (default: it-IT)
  // Safe for server-side rendering: check if localStorage is available
  const currentLocale =
    typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
      : DEFAULT_LOCALE;

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  // Scroll to error message when it appears
  useEffect(() => {
    if (signupError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Reset verification screen flag if there's an error
      setShowVerification(false);
    }
  }, [signupError]);

  const user = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!user.id;

  // Get redirect location from state
  const from = location.state?.from || null;

  // Check if user just signed up and needs to verify email
  const [signupEmail, setSignupEmail] = useState(null);
  const [showVerification, setShowVerification] = useState(false);

  // Check if user is authenticated but email not verified
  const isUnverifiedUser = isAuthenticated && currentUserLoaded && !user.attributes.emailVerified;

  // Show verification screen if: just signed up OR authenticated but unverified
  const showVerificationPending = showVerification || (signupEmail && isUnverifiedUser);

  // If user is authenticated and email is verified, redirect them
  const isVerifiedUser = isAuthenticated && currentUserLoaded && user.attributes.emailVerified;

  if (!mounted && isVerifiedUser) {
    return (
      <Page
        title={intl.formatMessage({ id: 'NewSignupPage.title' })}
        scrollingDisabled={scrollingDisabled}
      >
        <div className={css.spinnerContainer}>
          <IconSpinner />
        </div>
      </Page>
    );
  }

  if (isVerifiedUser) {
    if (from) {
      return <Redirect to={from} />;
    }
    return <Redirect to="/" />;
  }

  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage({ id: 'NewSignupPage.schemaTitle' }, { marketplaceName });

  const handleSubmit = async values => {
    const {
      email,
      password,
      firstName,
      lastName,
      phonePrefix,
      phoneNumber,
      dateOfBirth,
      location: locationData,
      street,
      streetNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      taxId,
      termsAccepted,
    } = values;

    // Combine phone prefix and number
    const fullPhoneNumber =
      phonePrefix && phoneNumber ? `${phonePrefix}${phoneNumber.trim()}` : phoneNumber?.trim();

    // Process location data
    let addressInfo = {};
    let geolocation = null;

    if (useManualAddress || autocompleteUsed) {
      // Manual address entry OR autocomplete with expanded form
      // Combine street and street number for addressLine1 if using new fields
      let fullStreetAddress = addressLine1?.trim() || '';
      if (street || streetNumber) {
        const streetParts = [street?.trim(), streetNumber?.trim()].filter(Boolean);
        fullStreetAddress = streetParts.join(' ');
      }

      addressInfo = {
        addressLine1: fullStreetAddress,
        addressLine2: addressLine2?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        postalCode: postalCode?.trim(),
        country: country?.trim(),
      };

      // Include geolocation only if user didn't modify any fields after autocomplete selection
      if (selectedGeolocation && !manualFieldsChanged && autocompleteUsed) {
        geolocation = selectedGeolocation;
      } else if (!geolocation) {
        // If we don't have geolocation, try to geocode the address
        // Only if we have all required address components
        if (street && city && country) {
          setIsGeocoding(true);
          try {
            const geocodedLocation = await geocodeAddress(
              {
                street: street.trim(),
                streetNumber: streetNumber?.trim() || '',
                city: city.trim(),
                state: state?.trim() || '',
                country: country.trim(),
                postalCode: postalCode?.trim() || '',
              },
              searchCountry
            );
            if (geocodedLocation) {
              geolocation = geocodedLocation;
            }
          } catch (error) {
            console.error('Error during geocoding:', error);
            // Continue without geolocation if geocoding fails
          } finally {
            setIsGeocoding(false);
          }
        }
      }
    } else if (locationData && locationData.selectedPlace) {
      // Direct autocomplete submission (shouldn't happen with new flow, but kept for safety)
      const place = locationData.selectedPlace;

      // Combine street name and number for addressLine1
      const streetName = place.street || '';
      const streetNumber = place.streetNumber || '';
      const fullAddress = streetNumber ? `${streetName} ${streetNumber}` : streetName;

      // Extract coordinates from origin (lat, lng)
      geolocation = place.origin ? new LatLng(place.origin.lat, place.origin.lng) : null;

      addressInfo = {
        addressLine1: fullAddress.trim(),
        addressLine2: '', // Empty for autocomplete
        city: place.city || '',
        state: place.state || '',
        postalCode: place.postalCode || '',
        country: place.country || '',
        geolocation: geolocation,
      };
    }

    // Add geolocation to addressInfo if we have it
    if (geolocation) {
      addressInfo.geolocation = geolocation;
    }

    const params = {
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      publicData: {
        userType: 'customer', // Default user type
        locale: currentLocale, // Store locale for email localization
      },
      privateData: {
        phoneNumber: fullPhoneNumber,
        dateOfBirth: dateOfBirth?.trim(),
        address: addressInfo,
        taxId: taxId?.trim(),
      },
      protectedData: {
        terms: termsAccepted ? ['tos-and-privacy'] : [],
      },
    };

    // Store email to show verification pending screen
    setSignupEmail(email);
    setShowVerification(true);

    submitSignup(params);
  };

  const defaultPhonePrefix = getDefaultPhonePrefix(currentLocale);
  const searchCountry = getCountryForLocale(currentLocale);

  // Show verification pending screen if user just signed up
  if (showVerificationPending && !signupError) {
    return (
      <Page
        title={schemaTitle}
        scrollingDisabled={scrollingDisabled}
        schema={{
          '@context': 'http://schema.org',
          '@type': 'WebPage',
          name: schemaTitle,
        }}
      >
        <div className={css.root}>
          <div className={css.leftSide}>
            <div className={css.formContainer}>
              <div className={css.verificationPendingContent}>
                <div className={css.logoContainer}>
                  <img src={logoImage} alt={marketplaceName} className={css.logo} />
                </div>

                <h1 className={css.verificationTitle}>
                  <FormattedMessage id="NewSignupPage.verificationTitle" />
                </h1>

                <p className={css.verificationMessage}>
                  <FormattedMessage
                    id="NewSignupPage.verificationMessage"
                    values={{ email: <strong>{signupEmail}</strong> }}
                  />
                </p>

                <p className={css.verificationInstructions}>
                  <FormattedMessage id="NewSignupPage.verificationInstructions" />
                </p>

                <div className={css.verificationHelp}>
                  <p className={css.verificationHelpText}>
                    <FormattedMessage id="NewSignupPage.verificationHelp" />
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={css.rightSide}></div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
      }}
    >
      <div className={css.root}>
        {/* Left side - Signup form */}
        <div className={css.leftSide}>
          <div className={css.formContainer}>
            <div className={css.formWrapper}>
              {/* Logo at the top */}
              <div className={css.logoContainer}>
                <img src={logoImage} alt={marketplaceName} className={css.logo} />
              </div>
              <h2 className={css.formTitle}>
                <FormattedMessage id="NewSignupPage.signupTitle" />
              </h2>
              <div className={css.loginContainerTitle}>
                <span className={css.loginText}>
                  <FormattedMessage id="NewSignupPage.alreadyHaveAccount" />
                </span>
                <NamedLink name="LoginPage" className={css.loginLink}>
                  <FormattedMessage id="NewSignupPage.logIn" />
                </NamedLink>
              </div>

              {signupError && (
                <div ref={errorRef} className={css.error}>
                  {isSignupEmailTakenError(signupError) ? (
                    <FormattedMessage
                      id="NewSignupPage.signupFailedEmailAlreadyTaken"
                      values={{
                        loginLink: (
                          <NamedLink name="LoginPage" className={css.errorLink}>
                            <FormattedMessage id="NewSignupPage.logIn" />
                          </NamedLink>
                        ),
                      }}
                    />
                  ) : (
                    <FormattedMessage id="NewSignupPage.signupFailed" />
                  )}
                </div>
              )}

              <FinalForm
                onSubmit={handleSubmit}
                initialValues={{ phonePrefix: defaultPhonePrefix }}
                render={({ handleSubmit, invalid, pristine, values, form }) => {
                  const submitInProgress = authInProgress;
                  
                  // Check if address fields are complete when using manual address
                  const addressFieldsIncomplete = (useManualAddress || autocompleteUsed) && (
                    !values.street?.trim() ||
                    !values.streetNumber?.trim() ||
                    !values.city?.trim() ||
                    !values.state?.trim() ||
                    !values.postalCode?.trim() ||
                    !values.country?.trim()
                  );
                  
                  const submitDisabled = invalid || submitInProgress || isGeocoding || addressFieldsIncomplete;

                  // Extract and store address components when location is selected
                  React.useEffect(() => {
                    const locationData = values.location;
                    if (locationData && locationData.selectedPlace && !autocompleteUsed) {
                      const place = locationData.selectedPlace;

                      // Combine street name and number
                      const streetName = place.street || '';
                      const streetNumber = place.streetNumber || '';

                      const components = {
                        street: streetName,
                        streetNumber: streetNumber,
                        addressLine1: '', // Will be constructed from street + streetNumber
                        city: place.city || '',
                        state: place.state || '',
                        postalCode: place.postalCode || '',
                        country: place.country || '',
                      };

                      // Store components and geolocation
                      setSelectedAddressComponents(components);

                      if (place.origin) {
                        const geolocation = new LatLng(place.origin.lat, place.origin.lng);
                        setSelectedGeolocation(geolocation);
                      }

                      // Automatically show expanded form with prefilled data
                      setAutocompleteUsed(true);
                      setManualFieldsChanged(false); // Reset modification tracker

                      // Prefill all form fields
                      form.batch(() => {
                        form.change('street', streetName);
                        form.change('streetNumber', streetNumber);
                        form.change('city', components.city);
                        form.change('state', components.state);
                        form.change('postalCode', components.postalCode);
                        form.change('country', components.country);
                      });
                    }
                  }, [values.location, autocompleteUsed]);

                  // Handler for manual address toggle
                  const handleManualAddressToggle = () => {
                    setUseManualAddress(true);
                    setAutocompleteUsed(false); // Reset autocomplete flag
                    setManualFieldsChanged(false); // Reset manual fields changed flag

                    // Clear location autocomplete field when switching to manual
                    form.change('location', null);
                  };

                  // Handler to go back to autocomplete
                  const handleBackToAutocomplete = () => {
                    setUseManualAddress(false);
                    setAutocompleteUsed(false);
                    setManualFieldsChanged(false);

                    // Clear location autocomplete field to prevent re-triggering the form expansion
                    form.change('location', null);

                    // Clear all manual address fields
                    form.change('street', '');
                    form.change('streetNumber', '');
                    form.change('addressLine2', '');
                    form.change('city', '');
                    form.change('state', '');
                    form.change('postalCode', '');
                    form.change('country', '');
                  };

                  // Handler for manual address field changes
                  const handleManualFieldChange = (fieldName, value) => {
                    // Mark that manual fields have been changed (important for geolocation decision)
                    if (!manualFieldsChanged) {
                      setManualFieldsChanged(true);
                    }
                    form.change(fieldName, value);
                  };

                  // Custom date input handler to prevent year overflow
                  const handleDateChange = e => {
                    const input = e.target;
                    let value = input.value;

                    // Check if we're dealing with a date input
                    if (input.type === 'date' && value) {
                      const parts = value.split('-');
                      if (parts[0] && parts[0].length > 4) {
                        // If year has more than 4 digits, keep only the last 4 digits
                        parts[0] = parts[0].slice(-4);
                        value = parts.join('-');
                        form.change('dateOfBirth', value);
                        return;
                      }
                    }

                    form.change('dateOfBirth', value);
                  };

                  // Custom tax ID input handler to convert to uppercase in real-time
                  const handleTaxIdChange = e => {
                    const value = e.target.value;
                    form.change('taxId', value.toUpperCase());
                  };

                  return (
                    <Form className={css.form} onSubmit={handleSubmit}>
                      {/* Basic Information */}
                      <div className={css.sectionTitle}>
                        <FormattedMessage id="NewSignupPage.basicInformation" />
                      </div>

                      <FieldTextInput
                        className={css.field}
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="username email"
                        label={intl.formatMessage({ id: 'NewSignupPage.emailLabel' })}
                        placeholder={intl.formatMessage({ id: 'NewSignupPage.emailPlaceholder' })}
                        validate={composeValidators(
                          validators.required(
                            intl.formatMessage({ id: 'NewSignupPage.emailRequired' })
                          ),
                          validators.emailFormatValid(
                            intl.formatMessage({ id: 'NewSignupPage.emailInvalid' })
                          )
                        )}
                      />

                      <div className={css.nameFields}>
                        <FieldTextInput
                          className={css.halfField}
                          type="text"
                          id="firstName"
                          name="firstName"
                          autoComplete="given-name"
                          label={intl.formatMessage({ id: 'NewSignupPage.firstNameLabel' })}
                          placeholder={intl.formatMessage({
                            id: 'NewSignupPage.firstNamePlaceholder',
                          })}
                          validate={validators.required(
                            intl.formatMessage({ id: 'NewSignupPage.firstNameRequired' })
                          )}
                        />

                        <FieldTextInput
                          className={css.halfField}
                          type="text"
                          id="lastName"
                          name="lastName"
                          autoComplete="family-name"
                          label={intl.formatMessage({ id: 'NewSignupPage.lastNameLabel' })}
                          placeholder={intl.formatMessage({
                            id: 'NewSignupPage.lastNamePlaceholder',
                          })}
                          validate={validators.required(
                            intl.formatMessage({ id: 'NewSignupPage.lastNameRequired' })
                          )}
                        />
                      </div>

                      <FieldTextInput
                        className={css.field}
                        type="password"
                        id="new-password"
                        name="password"
                        autoComplete="new-password"
                        label={intl.formatMessage({ id: 'NewSignupPage.passwordLabel' })}
                        placeholder={intl.formatMessage({
                          id: 'NewSignupPage.passwordPlaceholder',
                        })}
                        validate={composeValidators(
                          validators.requiredStringNoTrim(
                            intl.formatMessage({ id: 'NewSignupPage.passwordRequired' })
                          ),
                          validators.minLength(
                            intl.formatMessage(
                              { id: 'NewSignupPage.passwordTooShort' },
                              { minLength: validators.PASSWORD_MIN_LENGTH }
                            ),
                            validators.PASSWORD_MIN_LENGTH
                          )
                        )}
                      />

                      <div className={css.phoneFields}>
                        <FieldSelect
                          className={css.phonePrefixField}
                          id="phonePrefix"
                          name="phonePrefix"
                          label={intl.formatMessage({ id: 'NewSignupPage.phonePrefixLabel' })}
                        >
                          {PHONE_PREFIXES.map(prefix => (
                            <option key={prefix.code} value={prefix.code}>
                              {prefix.label}
                            </option>
                          ))}
                        </FieldSelect>

                        <FieldTextInput
                          className={css.phoneNumberField}
                          type="tel"
                          id="phoneNumber"
                          name="phoneNumber"
                          autoComplete="tel"
                          label={intl.formatMessage({ id: 'NewSignupPage.phoneNumberLabel' })}
                          placeholder={intl.formatMessage({
                            id: 'NewSignupPage.phoneNumberPlaceholder',
                          })}
                          validate={composeValidators(
                            validators.required(
                              intl.formatMessage({ id: 'NewSignupPage.phoneNumberRequired' })
                            ),
                            phoneNumberValid(
                              intl.formatMessage({ id: 'NewSignupPage.phoneNumberInvalid' }),
                              values.phonePrefix || defaultPhonePrefix
                            )
                          )}
                        />
                      </div>

                      {/* Personal Information */}
                      <div className={css.sectionTitle}>
                        <FormattedMessage id="NewSignupPage.personalInformation" />
                      </div>

                      <FieldTextInput
                        className={css.field}
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        label={intl.formatMessage({ id: 'NewSignupPage.dateOfBirthLabel' })}
                        placeholder={intl.formatMessage({
                          id: 'NewSignupPage.dateOfBirthPlaceholder',
                        })}
                        onChange={handleDateChange}
                        validate={composeValidators(
                          validators.required(
                            intl.formatMessage({ id: 'NewSignupPage.dateOfBirthRequired' })
                          ),
                          dateNotInFuture(
                            intl.formatMessage({ id: 'NewSignupPage.dateNotInFuture' })
                          ),
                          ageAtLeast18(intl.formatMessage({ id: 'NewSignupPage.ageAtLeast18' }))
                        )}
                      />

                      {/* Address fields */}
                      {!useManualAddress && !autocompleteUsed ? (
                        <>
                          {/* Initial autocomplete field */}
                          <FieldLocationAutocompleteInput
                            rootClassName={css.locationFieldRoot}
                            className={css.field}
                            inputClassName={css.locationAutocompleteInput}
                            iconClassName={css.locationAutocompleteInputIcon}
                            predictionsClassName={css.predictionsRoot}
                            validClassName={css.validLocation}
                            CustomIcon={IconLocation}
                            name="location"
                            id="location"
                            label={intl.formatMessage({ id: 'NewSignupPage.addressLabel' })}
                            placeholder={intl.formatMessage({
                              id: 'NewSignupPage.addressPlaceholder',
                            })}
                            format={identity}
                            valueFromForm={values.location}
                            countryLimit={searchCountry}
                            useDefaultPredictions={false}
                            validate={composeValidators(
                              autocompleteSearchRequired(
                                intl.formatMessage({ id: 'NewSignupPage.addressRequired' })
                              ),
                              autocompletePlaceSelected(
                                intl.formatMessage({ id: 'NewSignupPage.addressNotRecognized' })
                              )
                            )}
                          />
                        </>
                      ) : (
                        <>
                          {/* Chip card to go back to autocomplete */}
                          <button
                            type="button"
                            className={css.chipCard}
                            onClick={handleBackToAutocomplete}
                            style={{
                              backgroundColor: 'white',
                              borderColor: marketplaceColor,
                              color: marketplaceColor,
                              marginBottom: '20px',
                            }}
                          >
                            <FormattedMessage
                              id="NewSignupPage.backToAutocomplete"
                              defaultMessage="Procedi con la ricerca automatica dell'indirizzo"
                            />
                          </button>

                          {/* Expanded form - shown after autocomplete selection OR manual toggle */}
                          {/* Street name and number */}
                          <div className={css.addressFields}>
                            <FieldTextInput
                              className={css.streetField}
                              type="text"
                              id="street"
                              name="street"
                              autoComplete="address-line1"
                              label={intl.formatMessage({ id: 'NewSignupPage.streetLabel' })}
                              placeholder={intl.formatMessage({
                                id: 'NewSignupPage.streetPlaceholder',
                              })}
                              onChange={e => handleManualFieldChange('street', e.target.value)}
                              validate={validators.required(
                                intl.formatMessage({ id: 'NewSignupPage.streetRequired' })
                              )}
                            />

                            <FieldTextInput
                              className={css.streetNumberField}
                              type="text"
                              id="streetNumber"
                              name="streetNumber"
                              autoComplete="off"
                              label={intl.formatMessage({ id: 'NewSignupPage.streetNumberLabel' })}
                              placeholder={intl.formatMessage({
                                id: 'NewSignupPage.streetNumberPlaceholder',
                              })}
                              onChange={e =>
                                handleManualFieldChange('streetNumber', e.target.value)
                              }
                              validate={validators.required(
                                intl.formatMessage({ id: 'NewSignupPage.streetNumberRequired' })
                              )}
                            />
                          </div>

                          {/* Address line 2 (optional) */}
                          <FieldTextInput
                            className={css.field}
                            type="text"
                            id="addressLine2"
                            name="addressLine2"
                            autoComplete="address-line2"
                            label={intl.formatMessage({ id: 'NewSignupPage.addressLine2Label' })}
                            placeholder={intl.formatMessage({
                              id: 'NewSignupPage.addressLine2Placeholder',
                            })}
                            onChange={e => handleManualFieldChange('addressLine2', e.target.value)}
                          />

                          {/* Cascading dropdowns: Country -> State -> City -> Postal Code (2x2 grid) */}
                          <AddressCascadingDropdowns
                            locale={currentLocale}
                            initialCountry={values.country || cascadingCountry}
                            initialState={values.state || cascadingState}
                            initialCity={values.city || cascadingCity}
                            initialPostalCode={values.postalCode || ''}
                            className={css.cascadingDropdowns}
                            onCountryChange={(country, translatedName) => {
                              setCascadingCountry(translatedName);
                              setCascadingState('');
                              setCascadingCity('');
                              form.change('country', translatedName);
                              form.change('state', '');
                              form.change('city', '');
                              handleManualFieldChange('country', translatedName);
                            }}
                            onStateChange={(state, stateName, stateCode) => {
                              // Use state code (e.g., "TA" for Taranto) for consistency
                              setCascadingState(stateCode || stateName);
                              setCascadingCity('');
                              form.change('state', stateCode || stateName);
                              form.change('city', '');
                              handleManualFieldChange('state', stateCode || stateName);
                            }}
                            onCityChange={(city, cityName) => {
                              setCascadingCity(cityName);
                              form.change('city', cityName);
                              handleManualFieldChange('city', cityName);
                            }}
                            onPostalCodeChange={(postalCode) => {
                              form.change('postalCode', postalCode);
                              handleManualFieldChange('postalCode', postalCode);
                            }}
                          />
                        </>
                      )}

                      {/* Chip card to switch to manual address - only show when using autocomplete */}
                      {!useManualAddress && !autocompleteUsed && (
                        <button
                          type="button"
                          className={css.chipCard}
                          onClick={handleManualAddressToggle}
                          style={{
                            backgroundColor: 'white',
                            borderColor: marketplaceColor,
                            color: marketplaceColor,
                            marginBottom: '20px',
                          }}
                        >
                          <FormattedMessage
                            id="NewSignupPage.useManualAddress"
                            defaultMessage="Non trovi l'indirizzo? Procedi con l'inserimento manualmente"
                          />
                        </button>
                      )}

                      {/* Tax ID Field */}
                      <FieldTextInput
                        className={css.field}
                        type="text"
                        id="taxId"
                        name="taxId"
                        label={intl.formatMessage({ id: 'NewSignupPage.taxIdLabel' })}
                        placeholder={intl.formatMessage({ id: 'NewSignupPage.taxIdPlaceholder' })}
                        onChange={handleTaxIdChange}
                        validate={composeValidators(
                          validators.required(
                            intl.formatMessage({ id: 'NewSignupPage.taxIdRequired' })
                          ),
                          taxIdValid(
                            intl.formatMessage({ id: 'NewSignupPage.taxIdInvalid' }),
                            currentLocale
                          )
                        )}
                      />

                      {/* Terms and Conditions Checkbox */}
                      <FieldCheckbox
                        className={css.termsCheckbox}
                        id="termsAccepted"
                        name="termsAccepted"
                        label={
                          <span className={css.termsLabel}>
                            <FormattedMessage
                              id="NewSignupPage.termsAndConditions"
                              values={{
                                termsLink: (
                                  <NamedLink name="CMSPage" params={{ pageId: 'terms-of-service' }}>
                                    <FormattedMessage id="NewSignupPage.termsOfService" />
                                  </NamedLink>
                                ),
                                privacyLink: (
                                  <NamedLink name="CMSPage" params={{ pageId: 'privacy-policy' }}>
                                    <FormattedMessage id="NewSignupPage.privacyPolicy" />
                                  </NamedLink>
                                ),
                              }}
                            />
                          </span>
                        }
                        validate={validators.requiredBoolean(
                          intl.formatMessage({ id: 'NewSignupPage.termsRequired' })
                        )}
                      />

                      <PrimaryButton
                        className={css.submitButton}
                        type="submit"
                        inProgress={submitInProgress}
                        disabled={submitDisabled}
                      >
                        <FormattedMessage id="NewSignupPage.signUp" />
                      </PrimaryButton>
                    </Form>
                  );
                }}
              />

              {/* Login link */}
              <div className={css.loginContainer}>
                <span className={css.loginText}>
                  <FormattedMessage id="NewSignupPage.alreadyHaveAccount" />
                </span>
                <NamedLink name="LoginPage" className={css.loginLink}>
                  <FormattedMessage id="NewSignupPage.logIn" />
                </NamedLink>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Background image only */}
        <div className={css.rightSide}></div>
      </div>
    </Page>
  );
};

NewSignupPageComponent.propTypes = {
  authInProgress: bool.isRequired,
  currentUser: propTypes.currentUser,
  isAuthenticated: bool.isRequired,
  location: object.isRequired,
  signupError: propTypes.error,
  scrollingDisabled: bool.isRequired,
  submitSignup: func.isRequired,
};

const mapStateToProps = state => {
  const { isAuthenticated, signupError } = state.auth;
  const { currentUser } = state.user;

  return {
    authInProgress: authenticationInProgress(state),
    currentUser,
    isAuthenticated,
    signupError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  submitSignup: params => dispatch(signup(params)),
});

const NewSignupPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(NewSignupPageComponent);

export default NewSignupPage;
