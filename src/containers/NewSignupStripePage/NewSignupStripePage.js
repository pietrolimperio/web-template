import React, { useState, useEffect, useRef } from 'react';
import { bool, func, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';
import { isValidPhoneNumber } from 'libphonenumber-js';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { isSignupEmailTakenError, isTooManyEmailVerificationRequestsError } from '../../util/errors';
import { createResourceLocatorString } from '../../util/routes';
import { DEFAULT_LOCALE } from '../../config/localeConfig';
import { types as sdkTypes } from '../../util/sdkLoader';

import { signup, authenticationInProgress } from '../../ducks/auth.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchCurrentUser, sendVerificationEmail } from '../../ducks/user.duck';
import { useGuestListingAfterAuth } from '../../util/useGuestListingAfterAuth';
import {
  createStripeAccount,
  getStripeConnectAccountLink,
  fetchStripeAccount,
} from '../../ducks/stripeConnectAccount.duck';
import { updateProfile } from '../ProfileSettingsPage/ProfileSettingsPage.duck';
import { verify as verifyEmail } from '../../ducks/emailVerification.duck';
import { PENDING_VERIFICATION_TOKEN_KEY } from '../EmailVerificationPage/EmailVerificationPage.duck';
import devLog from '../../util/devLog';
import {
  composeValidators,
  autocompleteSearchRequired,
} from '../../util/validators';
import { getISODateString } from '../../components/DatePicker/DatePickers/DatePicker.helpers';

// One-shot flag to allow automatic redirect to Stripe exactly once (when coming from EmailVerificationPage)
const AUTO_STRIPE_REDIRECT_ONCE_KEY = 'autoStripeRedirectOnce';

const { LatLng } = sdkTypes;
const identity = v => v;

// Phone number validation using libphonenumber-js
const phoneNumberValid = (message, phonePrefix) => value => {
  if (!value) return null;
  try {
    const fullNumber = `${phonePrefix}${value}`;
    return isValidPhoneNumber(fullNumber) ? null : message;
  } catch (error) {
    return message;
  }
};

// Date of birth validation - not in the future
const dateNotInFuture = message => value => {
  if (!value) return null;
  const today = new Date();
  const selectedDate = new Date(value);
  if (isNaN(selectedDate.getTime())) return message;
  return selectedDate > today ? message : null;
};

// Format/parse for date of birth: form stores "YYYY-MM-DD", FieldSingleDatePicker uses { date: Date }
const formatDateOfBirth = v => (v ? { date: new Date(v) } : null);
const parseDateOfBirth = v => (v?.date ? getISODateString(v.date) : null);

// Format/parse for website URL: form stores full URL (https://...), input shows only domain part
const WEBSITE_URL_PREFIX = 'https://';
const formatWebsiteUrl = v => {
  if (!v || typeof v !== 'string') return '';
  const trimmed = v.trim();
  if (trimmed.startsWith('https://')) return trimmed.slice(8);
  if (trimmed.startsWith('http://')) return trimmed.slice(7);
  return trimmed;
};
const parseWebsiteUrl = v => {
  if (!v || typeof v !== 'string') return '';
  const trimmed = v.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().startsWith('https://')) return trimmed;
  if (trimmed.toLowerCase().startsWith('http://')) return `https://${trimmed.slice(7)}`;
  return `${WEBSITE_URL_PREFIX}${trimmed}`;
};

// isOutsideRange for birth date: only allow past dates (from 120 years ago to today)
const BIRTH_DATE_MIN_YEARS_AGO = 120;
const isBirthDateOutsideRange = day => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setFullYear(minDate.getFullYear() - BIRTH_DATE_MIN_YEARS_AGO);
  return day > today || day < minDate;
};

// Age validation (18+ years old)
// Street number: numbers only, or numbers + single letter, or only "snc" (case insensitive)
const STREET_NUMBER_REGEX = /^(\d+[a-zA-Z]?|snc)$/i;
const streetNumberValid = message => value => {
  if (!value) return null;
  const trimmed = value.trim();
  return STREET_NUMBER_REGEX.test(trimmed) ? null : message;
};

const ageAtLeast18 = message => value => {
  if (!value) return null;
  const today = new Date();
  const birthDate = new Date(value);
  if (isNaN(birthDate.getTime())) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 18 ? null : message;
};

// Phone prefixes by country (flag images from flagcdn.com)
const PHONE_PREFIXES = [
  { code: '+1', country: 'US' },
  { code: '+44', country: 'GB' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+39', country: 'IT' },
  { code: '+34', country: 'ES' },
  { code: '+351', country: 'PT' },
  { code: '+31', country: 'NL' },
  { code: '+32', country: 'BE' },
  { code: '+43', country: 'AT' },
  { code: '+41', country: 'CH' },
];

const getDefaultPhonePrefix = locale => {
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'en';
  const localeMap = { en: '+44', de: '+49', fr: '+33', it: '+39', es: '+34', pt: '+351' };
  return localeMap[baseLocale] || '+39';
};

const getCountryForLocale = locale => {
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'en';
  const countryMap = { en: 'GB', de: 'DE', fr: 'FR', it: 'IT', es: 'ES', pt: 'PT' };
  return countryMap[baseLocale] || 'IT';
};

const geocodeAddress = async (addressData, countryCode) => {
  const { street, streetNumber, city, state, country, postalCode } = addressData;
  if (typeof window === 'undefined' || !window.mapboxgl || !window.mapboxSdk || !window.mapboxgl.accessToken) {
    return null;
  }
  const addressParts = [street, streetNumber, city, state, country, postalCode].filter(Boolean);
  if (addressParts.length === 0) return null;
  const query = addressParts.join(', ');
  try {
    const client = window.mapboxSdk({ accessToken: window.mapboxgl.accessToken });
    const queryParams = { limit: 1, types: 'address' };
    if (countryCode) queryParams.country = countryCode.toLowerCase();
    const request = client.createRequest({
      method: 'GET',
      path: '/geocoding/v5/mapbox.places/:query.json',
      params: { query },
      query: queryParams,
    });
    const response = await request.send();
    if (response.body?.features?.length > 0) {
      const [lng, lat] = response.body.features[0].center || [];
      if (lat && lng) return new LatLng(lat, lng);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }
  return null;
};

import {
  Page,
  Form,
  PrimaryButton,
  FieldTextInput,
  FieldSelect,
  FieldCheckbox,
  FieldSingleDatePicker,
  FieldPhonePrefixSelect,
  NamedLink,
  InlineTextButton,
  IconSpinner,
  IconLocation,
  FieldLocationAutocompleteInput,
  AddressCascadingDropdowns,
} from '../../components';

import logoImage from '../../assets/logo.png';
import css from './NewSignupStripePage.module.css';

// Constants for Stripe onboarding return URLs
const STRIPE_ONBOARDING_RETURN_URL_SUCCESS = 'success';
const STRIPE_ONBOARDING_RETURN_URL_FAILURE = 'failure';

// Session storage key for temporary signup data
const SIGNUP_DATA_KEY = 'stripe_signup_pending_data';

// Supported countries for Stripe (country derived from address)
const SUPPORTED_COUNTRIES = [
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Germania' },
  { code: 'FR', name: 'Francia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'GB', name: 'Regno Unito' },
  { code: 'PT', name: 'Portogallo' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgio' },
  { code: 'NL', name: 'Paesi Bassi' },
  { code: 'CH', name: 'Svizzera' },
];

// Map country names (from Mapbox/geocoder) to ISO codes for Stripe
const COUNTRY_NAME_TO_ISO = {
  italy: 'IT', italia: 'IT',
  germany: 'DE', germania: 'DE', deutschland: 'DE',
  france: 'FR', francia: 'FR', frankreich: 'FR',
  spain: 'ES', spagna: 'ES', espana: 'ES', españa: 'ES',
  'united kingdom': 'GB', 'regno unito': 'GB', 'reino unido': 'GB', uk: 'GB', england: 'GB',
  portugal: 'PT', portogallo: 'PT',
  austria: 'AT', österreich: 'AT',
  belgium: 'BE', belgio: 'BE', belgique: 'BE', belgië: 'BE',
  netherlands: 'NL', 'paesi bassi': 'NL', niederlande: 'NL', holland: 'NL',
  switzerland: 'CH', svizzera: 'CH', suisse: 'CH', schweiz: 'CH',
};

const resolveCountryToIso = (raw, defaultLocale) => {
  const s = (raw || '').trim();
  if (!s) return defaultLocale ? getCountryForLocale(defaultLocale) : null;
  if (s.length === 2 && s === s.toUpperCase()) return s;
  const fromMap = COUNTRY_NAME_TO_ISO[s.toLowerCase()];
  if (fromMap) return fromMap;
  const byName = SUPPORTED_COUNTRIES.find(x => x.name?.toLowerCase() === s?.toLowerCase());
  return byName?.code || (defaultLocale ? getCountryForLocale(defaultLocale) : null);
};

// Map locale to country code
const getDefaultCountryFromLocale = locale => {
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'it';
  const localeToCountry = {
    it: 'IT',
    de: 'DE',
    fr: 'FR',
    es: 'ES',
    en: 'GB',
    pt: 'PT',
  };
  return localeToCountry[baseLocale] || 'IT';
};

// Steps in the signup flow
const STEP_FORM = 'form';
const STEP_CREATING_USER = 'creating_user';
const STEP_STRIPE_SETUP = 'stripe_setup';
const STEP_STRIPE_REDIRECT = 'stripe_redirect';
const STEP_PROCESSING = 'processing';
const STEP_UPDATING_USER = 'updating_user';
const STEP_VERIFICATION = 'verification';
const STEP_ERROR = 'error';

/**
 * NewSignupStripePage - Experimental signup page that uses Stripe onboarding
 * to collect additional user information.
 * 
 * CORRECTED Flow:
 * 1. User fills minimal form (customerType, email, password, country)
 * 2. Create user on Sharetribe (with minimal info) -> auto-login happens
 * 3. Now authenticated, create Stripe Connect account
 * 4. Redirect to Stripe onboarding (Stripe collects: name, address, phone, DOB, tax ID, etc.)
 * 5. On return from Stripe, fetch account data
 * 6. Update Sharetribe user with data from Stripe
 * 7. Show email verification screen
 */
export const NewSignupStripePageComponent = ({
  authInProgress,
  currentUser = null,
  isAuthenticated,
  location,
  signupError = null,
  scrollingDisabled,
  submitSignup,
  onUpdateProfile,
  stripeAccount,
  stripeAccountFetched,
  createStripeAccountError,
  createStripeAccountInProgress,
  getAccountLinkInProgress,
  getAccountLinkError,
  onCreateStripeAccount,
  onGetStripeConnectAccountLink,
  onFetchStripeAccount,
  onVerifyEmail,
  onFetchCurrentUser,
  onResendVerificationEmail,
  sendVerificationEmailInProgress = false,
  sendVerificationEmailError = null,
  params,
  history,
  dispatch,
}) => {
  const config = useConfiguration();
  const routes = useRouteConfiguration();
  const intl = useIntl();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(STEP_FORM);
  const [customerType, setCustomerType] = useState('individual');
  const [signupEmail, setSignupEmail] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingStripeSetup, setPendingStripeSetup] = useState(false);
  const [selectedGeolocation, setSelectedGeolocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [cascadingCountry, setCascadingCountry] = useState('');
  const [cascadingState, setCascadingState] = useState('');
  const [cascadingCity, setCascadingCity] = useState('');
  const errorRef = useRef(null);

  // Get marketplace color from config
  const marketplaceColor = config.branding?.marketplaceColor || '#0c9fa7';
  const marketplaceName = config.marketplaceName;
  const rootURL = config.marketplaceRootURL;

  // Get current locale
  const currentLocale =
    typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
      : DEFAULT_LOCALE;

  // Check return URL type from params (after Stripe redirect)
  const { returnURLType } = params || {};
  const returnedFromStripeSuccess = returnURLType === STRIPE_ONBOARDING_RETURN_URL_SUCCESS;
  const returnedFromStripeFailure = returnURLType === STRIPE_ONBOARDING_RETURN_URL_FAILURE;

  // Flag to track if we're processing Stripe return (to prevent other effects from interfering)
  const [processingStripeReturn, setProcessingStripeReturn] = useState(false);

  const user = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!user.id;

  // Handle guest listing creation after authentication
  useGuestListingAfterAuth(isAuthenticated, currentUser, dispatch);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);

    // Check if we're returning from Stripe
    devLog('🔄 Mount effect - checking return from Stripe:', {
      returnURLType,
      returnedFromStripeSuccess,
      returnedFromStripeFailure,
      isAuthenticated,
      currentUserLoaded,
    });
    
    if (returnedFromStripeSuccess || returnedFromStripeFailure) {
      const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
      devLog('🔄 Stored signup data:', storedData);
      
      if (storedData) {
        const data = JSON.parse(storedData);
        setCustomerType(data.customerType);
        setSignupEmail(data.email);
        
        if (returnedFromStripeSuccess) {
          devLog('✅ Returned from Stripe SUCCESS, fetching account...');
          setProcessingStripeReturn(true); // Set flag to prevent other effects from interfering
          setStep(STEP_PROCESSING);
          // Fetch the Stripe account data
          onFetchStripeAccount();
        } else {
          // Stripe failure - show form with retry option
          devLog('❌ Returned from Stripe FAILURE - showing retry option');
          setStep(STEP_FORM);
          setErrorMessage(intl.formatMessage({ id: 'NewSignupStripePage.stripeOnboardingFailed' }));
        }
      } else if (isAuthenticated && currentUserLoaded) {
        // User is authenticated but no stored data - reconstruct from user data
        devLog('⚠️ No stored data but user authenticated');
        const userPublicData = user.attributes?.profile?.publicData || {};
        setCustomerType(userPublicData.customerType || 'individual');
        
        if (returnedFromStripeSuccess) {
          setProcessingStripeReturn(true); // Set flag to prevent other effects from interfering
          setStep(STEP_PROCESSING);
          onFetchStripeAccount();
        } else {
          // Show retry option
          setStep(STEP_FORM);
          setErrorMessage(intl.formatMessage({ id: 'NewSignupStripePage.stripeOnboardingFailed' }));
        }
      } else {
        devLog('❌ No stored data and not authenticated');
        setStep(STEP_ERROR);
        setErrorMessage(intl.formatMessage({ id: 'NewSignupStripePage.sessionExpired' }));
      }
    }
  }, [returnURLType]);

  // Effect: After user signup completes and user is authenticated, proceed to Stripe setup
  // Only proceed if: 
  // - we're waiting for stripe setup (pendingStripeSetup)
  // - user is now authenticated
  // - we're in the creating user step
  // - there's no signup error (signup succeeded)
  // - the authenticated user's email matches what we're signing up (not a stale session)
  useEffect(() => {
    const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
    const signupData = storedData ? JSON.parse(storedData) : null;
    const signupEmailMatches = signupData && user.attributes?.email === signupData.email;
    
    if (
      pendingStripeSetup && 
      isAuthenticated && 
      currentUserLoaded && 
      step === STEP_CREATING_USER && 
      !signupError &&
      signupEmailMatches
    ) {
      setPendingStripeSetup(false);
      proceedToStripeSetup();
    }
  }, [isAuthenticated, currentUserLoaded, pendingStripeSetup, step, signupError, user.attributes?.email]);

  // Track retry attempts for fetching Stripe data
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  const MAX_FETCH_RETRIES = 3;
  const FETCH_RETRY_DELAY = 2000; // 2 seconds

  // Effect: After Stripe account data is fetched, update user profile
  useEffect(() => {
    const stripeAccountData = stripeAccount?.attributes?.stripeAccountData;
    
    devLog('🔍 Update user effect - conditions:', {
      step,
      isProcessingStep: step === STEP_PROCESSING,
      stripeAccountFetched,
      hasStripeAccount: !!stripeAccount,
      isAuthenticated,
      stripeAccountData,
      fetchRetryCount,
    });
    
    if (step === STEP_PROCESSING && stripeAccountFetched && stripeAccount && isAuthenticated) {
      // Check if stripeAccountData is available
      if (stripeAccountData) {
        devLog('✅ All conditions met with data, calling updateUserFromStripeData');
        updateUserFromStripeData();
      } else if (fetchRetryCount < MAX_FETCH_RETRIES) {
        // Data not available yet, retry after delay
        devLog(`⏳ stripeAccountData is null, retrying in ${FETCH_RETRY_DELAY}ms (attempt ${fetchRetryCount + 1}/${MAX_FETCH_RETRIES})`);
        const timeoutId = setTimeout(() => {
          setFetchRetryCount(prev => prev + 1);
          onFetchStripeAccount();
        }, FETCH_RETRY_DELAY);
        return () => clearTimeout(timeoutId);
      } else {
        devLog('⚠️ Max retries reached, stripeAccountData still null. Proceeding without update.');
        updateUserFromStripeData(); // Will skip update due to null data
      }
    } else if (step === STEP_PROCESSING) {
      devLog('⚠️ In STEP_PROCESSING but missing:', {
        stripeAccountFetched: !stripeAccountFetched ? 'MISSING' : 'OK',
        stripeAccount: !stripeAccount ? 'MISSING' : 'OK',
        isAuthenticated: !isAuthenticated ? 'MISSING' : 'OK',
      });
    }
  }, [step, stripeAccountFetched, stripeAccount, isAuthenticated, fetchRetryCount]);

  // Scroll to error
  useEffect(() => {
    if (errorMessage && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMessage]);

  // Handle signup error
  useEffect(() => {
    if (signupError) {
      setStep(STEP_FORM);
      setErrorMessage(null); // Let the form show the signup error
    }
  }, [signupError]);

  // Check if user needs to complete Stripe onboarding (came from LandingPage after email verification)
  const completeStripeOnboarding = location?.state?.completeStripeOnboarding;
  const profile = user.attributes?.profile;
  const userPrivateData = profile?.privateData;
  const userPublicData = profile?.publicData;
  // Check privateData only (pendingStripeOnboarding is only in privateData now)
  const pendingStripeOnboarding = userPrivateData?.pendingStripeOnboarding;
  const privateDataLoaded = userPrivateData !== undefined;

  // Debug logging
  devLog('🔐 NewSignupStripePage - Auth check:', {
    isAuthenticated,
    currentUserLoaded,
    privateDataLoaded,
    pendingStripeOnboarding,
    completeStripeOnboarding,
    step,
  });

  // If user is already authenticated, redirect them away from signup
  // Exceptions:
  // - if they're returning from Stripe onboarding, let them complete the flow
  // - if they have pendingStripeOnboarding: true (need to complete Stripe)
  // - if they came from LandingPage with completeStripeOnboarding state
  // - if privateData is not loaded yet (wait for it)
  const shouldRedirectAuthenticatedUser = 
    isAuthenticated && 
    currentUserLoaded && 
    privateDataLoaded && // IMPORTANT: Wait for privateData to be loaded
    step === STEP_FORM && 
    !returnedFromStripeSuccess && 
    !returnedFromStripeFailure &&
    !pendingStripeSetup &&
    pendingStripeOnboarding !== true && // Explicitly check for true (not undefined)
    !completeStripeOnboarding;

  if (shouldRedirectAuthenticatedUser) {
    devLog('➡️ Redirecting authenticated user to home (Stripe completed)');
    // User is already logged in and has completed Stripe - redirect to home
    return <Redirect to="/" />;
  }

  // Flag to track if we've initiated Stripe setup for returning user
  const [returningUserStripeInitiated, setReturningUserStripeInitiated] = useState(false);
  
  // Flag to track if we've attempted to fetch full user data
  const [userFetchAttempted, setUserFetchAttempted] = useState(false);

  // Effect: Force fetch current user when privateData is not loaded
  useEffect(() => {
    if (isAuthenticated && currentUserLoaded && !privateDataLoaded && !userFetchAttempted) {
      devLog('📝 privateData not loaded, forcing user fetch...');
      setUserFetchAttempted(true);
      onFetchCurrentUser({ enforce: true });
    }
  }, [isAuthenticated, currentUserLoaded, privateDataLoaded, userFetchAttempted, onFetchCurrentUser]);

  // Effect: If user lands on /signup as authenticated and pendingStripeOnboarding is true,
  // do NOT auto-redirect to Stripe unless they came from EmailVerificationPage AND the one-shot flag is present,
  // or completeStripeOnboarding is explicitly set. Otherwise, keep them on the page and show review UI.
  useEffect(() => {
    const hasAutoStripeRedirectOnce =
      typeof window !== 'undefined' && !!sessionStorage.getItem(AUTO_STRIPE_REDIRECT_ONCE_KEY);

    if (
      isAuthenticated &&
      currentUserLoaded &&
      privateDataLoaded &&
      pendingStripeOnboarding === true &&
      !returnedFromStripeSuccess &&
      !returnedFromStripeFailure &&
      step === STEP_FORM &&
      !returnURLType && // Not a Stripe return URL
      history.location?.pathname === '/signup'
    ) {
      devLog('📝 Authenticated user landed on /signup with pendingStripeOnboarding=true');

      // If the user came from EmailVerificationPage (token stored) or we have explicit completeStripeOnboarding,
      // we allow the auto-redirect effect to proceed. Otherwise, keep them here for review.
      if (!hasAutoStripeRedirectOnce && completeStripeOnboarding !== true) {
        setErrorMessage(intl.formatMessage({ id: 'NewSignupStripePage.stripeOnboardingIncomplete' }));
      }
    }
  }, [isAuthenticated, currentUserLoaded, privateDataLoaded, pendingStripeOnboarding, returnedFromStripeSuccess, returnedFromStripeFailure, step, returnURLType, history, intl, completeStripeOnboarding]);

  const schemaTitle = intl.formatMessage(
    { id: 'NewSignupStripePage.schemaTitle' },
    { marketplaceName }
  );

  /**
   * Proceed to Stripe account creation after user is authenticated
   */
  const proceedToStripeSetup = async () => {
    setStep(STEP_STRIPE_SETUP);
    setErrorMessage(null);

    try {
      const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
      let country, storedCustomerType, signupData;

      if (storedData) {
        signupData = JSON.parse(storedData);
        country = signupData.country;
        storedCustomerType = signupData.customerType;
      } else {
        const userPublicData = user.attributes?.profile?.publicData || {};
        country = userPublicData.country || 'IT';
        storedCustomerType = userPublicData.customerType || customerType || 'individual';
        signupData = {
          email: user.attributes?.email,
          customerType: storedCustomerType,
          country,
          timestamp: Date.now(),
          ...(storedCustomerType === 'company' && {
            websiteUrl: userPublicData.websiteUrl,
            companyName: user.attributes?.profile?.firstName || userPublicData.companyName,
          }),
        };
        sessionStorage.setItem(SIGNUP_DATA_KEY, JSON.stringify(signupData));
        devLog('📝 Created sessionStorage data for returning user:', signupData);
      }

      // Create Stripe Connect account
      const stripePublishableKey = config.stripe?.publishableKey;
      const defaultMCC = config.stripe?.defaultMCC || '5734';

      // Build business profile URL for Stripe onboarding
      // For company: use the company website URL entered during signup (Stripe shows this as business website)
      // For individual / fallback: use marketplace profile URL (test URL for localhost - Stripe doesn't accept localhost)
      const cleanRootURL = rootURL ? rootURL.replace(/\/$/, '') : '';
      const isLocalhost = cleanRootURL.includes('localhost');
      const profilePath = user.id?.uuid ? `/u/${user.id.uuid}` : '/u/new-user';
      const marketplaceProfileURL = isLocalhost
        ? `https://test-marketplace.com${profilePath}?mode=storefront`
        : `${cleanRootURL}${profilePath}?mode=storefront`;

      const companyWebsite =
        storedCustomerType === 'company' && signupData?.websiteUrl?.trim()
          ? (signupData.websiteUrl.trim().toLowerCase().startsWith('http')
              ? signupData.websiteUrl.trim()
              : `https://${signupData.websiteUrl.trim()}`)
          : null;
      const businessProfileURL = companyWebsite || marketplaceProfileURL;

      devLog('🔧 Stripe Setup Debug:', {
        rootURL,
        cleanRootURL,
        isLocalhost,
        profilePath,
        businessProfileURL,
        companyWebsite: companyWebsite || '(using marketplace profile)',
        userId: user.id?.uuid,
        country,
        customerType: storedCustomerType,
      });

      const accountParams = {
        country,
        accountType: storedCustomerType === 'company' ? 'company' : 'individual',
        businessProfileMCC: defaultMCC,
        businessProfileURL,
        stripePublishableKey,
      };

      if (signupData) {
        accountParams.email = signupData.email;
        accountParams.phone = signupData.phoneNumber;
        accountParams.address = signupData.address;
        if (storedCustomerType === 'company') {
          accountParams.companyName = signupData.companyName;
        } else {
          accountParams.firstName = signupData.firstName;
          accountParams.lastName = signupData.lastName;
          accountParams.dateOfBirth = signupData.dateOfBirth;
        }
      }

      const createdAccount = await onCreateStripeAccount(accountParams);

      if (!createdAccount) {
        throw new Error('Failed to create Stripe account');
      }

      setStep(STEP_STRIPE_REDIRECT);

      // Get the onboarding link
      const successURL = `${rootURL}${createResourceLocatorString(
        'NewSignupStripePageReturn',
        routes,
        { returnURLType: STRIPE_ONBOARDING_RETURN_URL_SUCCESS },
        {}
      )}`;
      const failureURL = `${rootURL}${createResourceLocatorString(
        'NewSignupStripePageReturn',
        routes,
        { returnURLType: STRIPE_ONBOARDING_RETURN_URL_FAILURE },
        {}
      )}`;

      // For new account onboarding, don't pass accountId
      // The API handles this automatically based on the authenticated user
      // Note: Sharetribe doesn't support 'locale' parameter for Stripe account links
      const linkUrl = await onGetStripeConnectAccountLink({
        successURL,
        failureURL,
        type: 'account_onboarding',
      });

      if (linkUrl) {
        // Redirect to Stripe
        window.location.href = linkUrl;
      } else {
        throw new Error('Failed to get Stripe onboarding link');
      }
    } catch (error) {
      console.error('Error in Stripe setup:', error);
      setStep(STEP_ERROR);
      setErrorMessage(
        intl.formatMessage({ id: 'NewSignupStripePage.stripeSetupFailed' })
      );
    }
  };

      // Effect: If authenticated user needs to complete Stripe onboarding, start the process
      // IMPORTANT: auto-redirect to Stripe is allowed only when:
      // - user explicitly came with completeStripeOnboarding=true (from verify-email / landing), OR
      // - the one-shot flag is present (set by EmailVerificationPage) -> consumed here before redirect
      // Otherwise, user must click the CTA (review/confirmation UX), even on /signup.
      useEffect(() => {
        const allowAutoRedirect =
          completeStripeOnboarding === true ||
          (typeof window !== 'undefined' &&
            !!sessionStorage.getItem(AUTO_STRIPE_REDIRECT_ONCE_KEY));

        if (
          allowAutoRedirect &&
          isAuthenticated && 
          currentUserLoaded && 
          privateDataLoaded &&
          (pendingStripeOnboarding || completeStripeOnboarding) &&
          step === STEP_FORM &&
          !returningUserStripeInitiated &&
          !returnedFromStripeSuccess && // Don't redirect if we're returning from Stripe success
          !returnedFromStripeFailure && // Don't redirect if we're returning from Stripe failure
          !processingStripeReturn // Don't redirect if we're processing Stripe return
        ) {
          devLog('📝 Authenticated user needs to complete Stripe onboarding (auto-redirect allowed)');
          // Consume the one-shot flag so back-button won't trigger another auto-redirect
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(AUTO_STRIPE_REDIRECT_ONCE_KEY);
          }
          // Get customer type from user's profile publicData
          const userCustomerType = user.attributes?.profile?.publicData?.customerType || 'individual';
          setCustomerType(userCustomerType);
          setReturningUserStripeInitiated(true);
          proceedToStripeSetup();
        }
      }, [isAuthenticated, currentUserLoaded, privateDataLoaded, pendingStripeOnboarding, completeStripeOnboarding, step, returningUserStripeInitiated, returnedFromStripeSuccess, returnedFromStripeFailure, processingStripeReturn, history]);

  /**
   * Validate that all mandatory Stripe data is present
   * Mandatory fields:
   * - Individual: firstName, lastName, phone, email, dateOfBirth, address
   * - Company: companyName, phone, email, address
   */
  const validateMandatoryStripeData = (stripeAccountData, userEmail) => {
    if (!stripeAccountData) {
      return { isValid: false, missingFields: ['stripeAccountData'] };
    }

    const missingFields = [];

    // IMPORTANT:
    // If Stripe requirements are not met, the account is not enabled yet
    // (e.g. missing document verification). In that case, treat it as NOT a success.
    const eventuallyDue = stripeAccountData.requirements?.eventually_due;
    if (Array.isArray(eventuallyDue) && eventuallyDue.length > 0) {
      // We don't need to list every requirement in UI; just mark as incomplete.
      missingFields.push('stripeRequirements');
      return { isValid: false, missingFields };
    }
    
    if (stripeAccountData.business_type === 'individual' && stripeAccountData.individual) {
      const individual = stripeAccountData.individual;
      if (!individual.first_name) missingFields.push('firstName');
      if (!individual.last_name) missingFields.push('lastName');
      if (!individual.phone) missingFields.push('phone');
      if (!userEmail) missingFields.push('email');
      if (!individual.dob || !individual.dob.year || !individual.dob.month || !individual.dob.day) {
        missingFields.push('dateOfBirth');
      }
      if (!individual.address || !individual.address.line1 || !individual.address.city || !individual.address.postal_code) {
        missingFields.push('address');
      }
    } else if (stripeAccountData.business_type === 'company' && stripeAccountData.company) {
      const company = stripeAccountData.company;
      if (!company.name) missingFields.push('companyName');
      if (!company.phone && !stripeAccountData.business_profile?.support_phone) missingFields.push('phone');
      if (!userEmail) missingFields.push('email');
      if (!company.address || !company.address.line1 || !company.address.city || !company.address.postal_code) {
        missingFields.push('address');
      }
    } else {
      return { isValid: false, missingFields: ['business_type'] };
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  /**
   * Update user profile with data from Stripe account
   */
  const updateUserFromStripeData = async () => {
    devLog('📝 updateUserFromStripeData called');
    setStep(STEP_UPDATING_USER);

    try {
      const stripeAccountData = stripeAccount?.attributes?.stripeAccountData;
      devLog('📝 Stripe account data:', stripeAccountData);
      
      const userEmail = user.attributes?.email;
      
      // Validate mandatory data (Caso 3: Skip o dati incompleti)
      const validation = validateMandatoryStripeData(stripeAccountData, userEmail);
      
      if (!validation.isValid) {
        devLog('❌ Mandatory Stripe data missing:', validation.missingFields);
        // Change location to /signup/failure with error message
        setErrorMessage(
          intl.formatMessage(
            { id: 'NewSignupStripePage.registrationIncomplete' },
            { missingFields: validation.missingFields.join(', ') }
          )
        );
        // Update history to /signup/failure
        history.replace(`/signup/failure`);
        setStep(STEP_FORM);
        setProcessingStripeReturn(false);
        return;
      }
      
      if (!stripeAccountData) {
        devLog('⚠️ No stripeAccountData found, marking for later update');
        // No additional data from Stripe, but mark onboarding as complete
        // Set stripeDataUpdatePending: true to retry update after email verification
        try {
          await onUpdateProfile({
            privateData: {
              pendingStripeOnboarding: false,
              stripeDataUpdatePending: true, // Flag to retry fetching Stripe data after email verification
            },
          });
          devLog('✅ Marked stripeDataUpdatePending for later retry');
        } catch (err) {
          console.error('Failed to update pendingStripeOnboarding:', err);
        }
        
        // Verify email if there was a pending token
        await verifyPendingEmail();
        
        setStep(STEP_VERIFICATION);
        sessionStorage.removeItem(SIGNUP_DATA_KEY);
        return;
      }

      // Get stored signup data for reference
      const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
      const signupData = storedData ? JSON.parse(storedData) : {};
      const { country } = signupData;

      // Extract data based on business type
      let firstName, lastName, companyName, phoneNumber, dateOfBirth, taxId, vatNumber;
      let addressInfo = {};

      if (stripeAccountData.business_type === 'individual' && stripeAccountData.individual) {
        const individual = stripeAccountData.individual;
        firstName = individual.first_name || '';
        lastName = individual.last_name || '';
        phoneNumber = individual.phone || '';
        
        if (individual.dob) {
          const { year, month, day } = individual.dob;
          if (year && month && day) {
            dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }

        if (individual.id_number_provided) {
          taxId = 'PROVIDED_TO_STRIPE';
        }

        if (individual.address) {
          addressInfo = {
            addressLine1: individual.address.line1 || '',
            addressLine2: individual.address.line2 || '',
            city: individual.address.city || '',
            state: individual.address.state || '',
            postalCode: individual.address.postal_code || '',
            country: individual.address.country || country,
          };
        }
      } else if (stripeAccountData.business_type === 'company' && stripeAccountData.company) {
        const company = stripeAccountData.company;
        companyName = company.name || '';
        phoneNumber = company.phone || stripeAccountData.business_profile?.support_phone || '';

        // Always use companyName as firstName and 'Company' as lastName
        firstName = companyName;
        lastName = 'Company'; // Sharetribe SDK requires lastName even for companies

        if (company.tax_id_provided) {
          vatNumber = 'PROVIDED_TO_STRIPE';
        }

        if (company.address) {
          addressInfo = {
            addressLine1: company.address.line1 || '',
            addressLine2: company.address.line2 || '',
            city: company.address.city || '',
            state: company.address.state || '',
            postalCode: company.address.postal_code || '',
            country: company.address.country || country,
          };
        }
      }

      // Build update params - only include fields that have values
      const updateParams = {};
      
      if (firstName) updateParams.firstName = firstName;
      if (lastName) updateParams.lastName = lastName;

      // Build privateData update
      const privateDataUpdate = {
        stripeDataSource: true,
        pendingStripeOnboarding: false, // Onboarding completed
        stripeDataUpdatePending: false, // Data successfully retrieved and updated
      };

      if (phoneNumber) privateDataUpdate.phoneNumber = phoneNumber;
      if (Object.keys(addressInfo).length > 0) privateDataUpdate.address = addressInfo;
      if (dateOfBirth) privateDataUpdate.dateOfBirth = dateOfBirth;
      if (taxId) privateDataUpdate.taxId = taxId;
      if (vatNumber) privateDataUpdate.vatNumber = vatNumber;
      if (companyName) privateDataUpdate.companyName = companyName;
      
      // Store company.representative in privateData if present
      if (stripeAccountData.business_type === 'company' && stripeAccountData.company?.representative) {
        privateDataUpdate.companyRepresentative = {
          first_name: stripeAccountData.company.representative.first_name || '',
          last_name: stripeAccountData.company.representative.last_name || '',
        };
      }

      updateParams.privateData = privateDataUpdate;
      
      // No need to update publicData.pendingStripeOnboarding (it's only in privateData now)

      devLog('📝 Update params to send:', updateParams);

      // Update user profile
      const updateResult = await onUpdateProfile(updateParams);
      devLog('✅ Profile update result:', updateResult);

      // Reset processing flag since we've completed the Stripe return flow
      setProcessingStripeReturn(false);

      // Check for pending email verification and verify now (Caso 1: Completamento corretto)
      const hadPendingToken = !!sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);
      await verifyPendingEmail();

      // Clear stored data
      sessionStorage.removeItem(SIGNUP_DATA_KEY);

      // Fetch updated user data to check email verification status
      await onFetchCurrentUser({ enforce: true });
      
      // Wait a bit for Redux to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if we should redirect to LandingPage:
      // 1. If we verified a token (hadPendingToken and token was removed)
      // 2. OR if email is already verified on Sharetribe
      const updatedUser = ensureCurrentUser(currentUser);
      const emailVerified = updatedUser.attributes?.emailVerified;
      const tokenWasVerified = hadPendingToken && !sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);
      
      if (tokenWasVerified || emailVerified) {
        // Email verified (either via token or already verified) - redirect to LandingPage
        devLog('✅ Email verified (token verified or already verified), redirecting to LandingPage');
        const userName = updatedUser.attributes?.profile?.firstName || updatedUser.attributes?.email?.split('@')[0];
        const userEmail = updatedUser.attributes?.email;
        // Use history.push to redirect to LandingPage with state
        history.push({
          pathname: '/',
          state: { 
            emailVerification: 'success', 
            userName, 
            userEmail 
          }
        });
        return;
      }

      // Email not verified yet - show verification screen
      setStep(STEP_VERIFICATION);
    } catch (error) {
      console.error('❌ Error updating user from Stripe data:', error);
      // Even if update fails, try to verify email and show verification - user is created
      const hadPendingToken = !!sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);
      await verifyPendingEmail();
      sessionStorage.removeItem(SIGNUP_DATA_KEY);
      
      // Fetch updated user data to check email verification status
      await onFetchCurrentUser({ enforce: true });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedUser = ensureCurrentUser(currentUser);
      const emailVerified = updatedUser.attributes?.emailVerified;
      const tokenWasVerified = hadPendingToken && !sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);
      
      if (tokenWasVerified || emailVerified) {
        devLog('✅ Email verified (token verified or already verified), redirecting to LandingPage');
        const userName = updatedUser.attributes?.profile?.firstName || updatedUser.attributes?.email?.split('@')[0];
        const userEmail = updatedUser.attributes?.email;
        history.push({
          pathname: '/',
          state: { 
            emailVerification: 'success', 
            userName, 
            userEmail 
          }
        });
        return;
      }
      
      setStep(STEP_VERIFICATION);
    }
  };

  /**
   * Verify email if there's a pending verification token
   * This handles the case where user clicked verification link before completing Stripe
   */
  const verifyPendingEmail = async () => {
    const pendingToken = sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);
    if (pendingToken) {
      devLog('📧 Found pending verification token, verifying email now...');
      try {
        await onVerifyEmail(pendingToken);
        sessionStorage.removeItem(PENDING_VERIFICATION_TOKEN_KEY);
        devLog('✅ Email verified successfully');
      } catch (err) {
        console.error('❌ Failed to verify email:', err);
        // Don't block the flow if verification fails
      }
    }
  };

  /**
   * Handle form submission - create user on Sharetribe first
   */
  const handleSubmit = async values => {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      phonePrefix,
      phoneNumber,
      dateOfBirth,
      street,
      streetNumber,
      addressLine2,
      city,
      state,
      postalCode,
      country: formCountry,
      location: locationData,
      termsAccepted,
      websiteUrl,
    } = values;

    const fullPhoneNumber =
      phonePrefix && phoneNumber ? `${phonePrefix}${phoneNumber.trim()}` : phoneNumber?.trim();

    let addressLine1 = '';
    let addressCountryRaw = formCountry;
    const hasSelectedPlace = locationData?.selectedPlace;
    if (hasSelectedPlace) {
      const streetParts = [street?.trim(), streetNumber?.trim()].filter(Boolean);
      addressLine1 = streetParts.join(' ');
      addressCountryRaw = formCountry;
    } else if (locationData?.selectedPlace) {
      const place = locationData.selectedPlace;
      const streetName = place.street || '';
      const streetNum = place.streetNumber || '';
      addressLine1 = streetNum ? `${streetName} ${streetNum}`.trim() : streetName;
      addressCountryRaw = place.country || formCountry;
    }

    const resolvedCountry =
      resolveCountryToIso(addressCountryRaw, currentLocale) || getCountryForLocale(currentLocale);

    const addressForStripe =
      addressLine1 || city || postalCode
        ? {
            line1: addressLine1,
            line2: addressLine2?.trim(),
            city: city?.trim(),
            state: state?.trim(),
            postal_code: postalCode?.trim(),
            country: resolvedCountry,
          }
        : null;

    const signupData = {
      email,
      password,
      customerType,
      country: resolvedCountry,
      firstName,
      lastName,
      companyName,
      phoneNumber: fullPhoneNumber,
      dateOfBirth: dateOfBirth?.trim(),
      address: addressForStripe,
      termsAccepted,
      timestamp: Date.now(),
    };
    if (customerType === 'company') {
      signupData.websiteUrl = websiteUrl?.trim();
    }
    sessionStorage.setItem(SIGNUP_DATA_KEY, JSON.stringify(signupData));

    setStep(STEP_CREATING_USER);
    setSignupEmail(email);
    setErrorMessage(null);

    let finalFirstName, finalLastName;
    if (customerType === 'company' && companyName) {
      finalFirstName = companyName;
      finalLastName = 'Company';
    } else {
      finalFirstName = firstName || email.split('@')[0];
      finalLastName = lastName || 'User';
    }

    const params = {
      email,
      password,
      firstName: finalFirstName,
      lastName: finalLastName,
      publicData: {
        userType: 'customer',
        locale: currentLocale,
        country: resolvedCountry,
        customerType,
        ...(customerType === 'company' && {
          websiteUrl: websiteUrl?.trim(),
        }),
      },
      privateData: {
        pendingStripeOnboarding: true,
      },
      protectedData: {
        terms: termsAccepted ? ['tos-and-privacy'] : [],
      },
    };

    setPendingStripeSetup(true);
    submitSignup(params);
  };

  // Render loading/spinner states
  if (!mounted) {
    return (
      <Page title={schemaTitle} scrollingDisabled={scrollingDisabled}>
        <div className={css.spinnerContainer}>
          <IconSpinner />
        </div>
      </Page>
    );
  }

  // Render verification pending screen
  if (step === STEP_VERIFICATION) {
    const displayEmail = signupEmail || user.attributes?.email;
    const hasPendingVerificationToken =
      typeof window !== 'undefined' && !!sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);

    const resendEmailLink = (
      <InlineTextButton rootClassName={css.verificationHelperLink} onClick={onResendVerificationEmail}>
        <FormattedMessage id="ModalMissingInformation.resendEmailLinkText" />
      </InlineTextButton>
    );

    const fixEmailLink = (
      <NamedLink className={css.verificationHelperLink} name="ContactDetailsPage">
        <FormattedMessage id="ModalMissingInformation.fixEmailLinkText" />
      </NamedLink>
    );

    const resendErrorTranslationId = isTooManyEmailVerificationRequestsError(sendVerificationEmailError)
      ? 'ModalMissingInformation.resendFailedTooManyRequests'
      : 'ModalMissingInformation.resendFailed';

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
                  <FormattedMessage id="NewSignupStripePage.verificationTitle" />
                </h1>

                <p className={css.verificationMessage}>
                  <FormattedMessage
                    id="NewSignupStripePage.verificationMessage"
                    values={{ email: <strong>{displayEmail}</strong> }}
                  />
                </p>

                <p className={css.verificationInstructions}>
                  <FormattedMessage id="NewSignupStripePage.verificationInstructions" />
                </p>

                {/* If this is the linear flow (no pending token stored), show the same resend/fix helpers as the modal */}
                {!hasPendingVerificationToken ? (
                  <>
                    {sendVerificationEmailError ? (
                      <p className={css.verificationError}>
                        <FormattedMessage id={resendErrorTranslationId} />
                      </p>
                    ) : null}

                    <div className={css.verificationBottomWrapper}>
                      <p className={css.verificationHelperText}>
                        {sendVerificationEmailInProgress ? (
                          <FormattedMessage id="ModalMissingInformation.sendingEmail" />
                        ) : (
                          <FormattedMessage
                            id="ModalMissingInformation.resendEmail"
                            values={{ resendEmailLink }}
                          />
                        )}
                      </p>
                      <p className={css.verificationHelperText}>
                        <FormattedMessage id="ModalMissingInformation.fixEmail" values={{ fixEmailLink }} />
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className={css.rightSide}></div>
        </div>
      </Page>
    );
  }

  // Render processing/loading states
  if (
    step === STEP_CREATING_USER ||
    step === STEP_STRIPE_SETUP ||
    step === STEP_STRIPE_REDIRECT ||
    step === STEP_PROCESSING ||
    step === STEP_UPDATING_USER
  ) {
    const messageId =
      step === STEP_CREATING_USER
        ? 'NewSignupStripePage.creatingAccount'
        : step === STEP_STRIPE_SETUP
        ? 'NewSignupStripePage.settingUpStripe'
        : step === STEP_STRIPE_REDIRECT
        ? 'NewSignupStripePage.redirectingToStripe'
        : step === STEP_UPDATING_USER
        ? 'NewSignupStripePage.updatingProfile'
        : 'NewSignupStripePage.processingStripeData';

    return (
      <Page title={schemaTitle} scrollingDisabled={scrollingDisabled}>
        <div className={css.root}>
          <div className={css.leftSide}>
            <div className={css.formContainer}>
              <div className={css.loadingContent}>
                <div className={css.logoContainer}>
                  <img src={logoImage} alt={marketplaceName} className={css.logo} />
                </div>
                <IconSpinner className={css.loadingSpinner} />
                <p className={css.loadingMessage}>
                  <FormattedMessage id={messageId} />
                </p>
              </div>
            </div>
          </div>
          <div className={css.rightSide}></div>
        </div>
      </Page>
    );
  }

  // Main form render
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
            <div className={css.formWrapper}>
              {/* Logo */}
              <div className={css.logoContainer}>
                <img src={logoImage} alt={marketplaceName} className={css.logo} />
              </div>
              {isAuthenticated && currentUserLoaded && (pendingStripeOnboarding || (!privateDataLoaded && userFetchAttempted)) ? (
                              <h2 className={css.formTitle}>
                              <FormattedMessage id="NewSignupStripePage.signupTitleAuthenticatedUser" />
                            </h2>) : (    
              <h2 className={css.formTitle}>
                <FormattedMessage id="NewSignupStripePage.signupTitle" />
              </h2>
              )}

              <p className={css.subtitle}>
                <FormattedMessage id="NewSignupStripePage.subtitle" />
              </p>
              {isAuthenticated && currentUserLoaded && (pendingStripeOnboarding || (!privateDataLoaded && userFetchAttempted)) ? (<></>) : (
              <div className={css.loginContainerTitle}>
                <span className={css.loginText}>
                  <FormattedMessage id="NewSignupStripePage.alreadyHaveAccount" />
                </span>
                <NamedLink name="LoginPage" className={css.loginLink}>
                  <FormattedMessage id="NewSignupStripePage.logIn" />
                </NamedLink>
              </div>
              )}

              {/* Error messages */}
              {(errorMessage || signupError || step === STEP_ERROR) && (
                <div ref={errorRef} className={css.error}>
                  {errorMessage || (
                    isSignupEmailTakenError(signupError) ? (
                      <FormattedMessage
                        id="NewSignupStripePage.signupFailedEmailAlreadyTaken"
                        values={{
                          loginLink: (
                            <NamedLink name="LoginPage" className={css.errorLink}>
                              <FormattedMessage id="NewSignupStripePage.logIn" />
                            </NamedLink>
                          ),
                        }}
                      />
                    ) : (
                      <FormattedMessage id="NewSignupStripePage.signupFailed" />
                    )
                  )}
                </div>
              )}

              {/* Simplified retry form for authenticated users who need to complete Stripe */}
              {/* Show read-only form if:
                  - User is authenticated
                  - Has pendingStripeOnboarding (or privateData not loaded yet)
                  - Step is FORM
                  - Either returned from Stripe failure OR no returnURLType (back button case)
              */}
              {isAuthenticated && 
               currentUserLoaded && 
               step === STEP_FORM &&
               (pendingStripeOnboarding === true || (!privateDataLoaded && userFetchAttempted)) &&
               (returnedFromStripeFailure || !returnURLType) ? (
                <div className={css.retryStripeContainer}>
                  {/* Info box */}
                  <div className={css.infoBox}>
                    <FormattedMessage 
                      id={userPublicData?.customerType === 'company' 
                        ? 'NewSignupStripePage.stripeInfoMessageCompany' 
                        : 'NewSignupStripePage.stripeInfoMessageIndividual'
                      } 
                    />
                  </div>
                  
                  <PrimaryButton
                    type="button"
                    className={css.submitButton}
                    inProgress={createStripeAccountInProgress || getAccountLinkInProgress}
                    disabled={createStripeAccountInProgress || getAccountLinkInProgress}
                    onClick={() => {
                      setReturningUserStripeInitiated(true);
                      proceedToStripeSetup();
                    }}
                  >
                    <FormattedMessage 
                      id="NewSignupStripePage.retryStripeButton" 
                      defaultMessage="Completa verifica Stripe"
                    />
                  </PrimaryButton>
                </div>
              ) : (
              <FinalForm
                onSubmit={handleSubmit}
                initialValues={{
                  phonePrefix: getDefaultPhonePrefix(currentLocale),
                }}
                render={({ handleSubmit, invalid, pristine, values, form }) => {
                  const submitInProgress =
                    authInProgress ||
                    createStripeAccountInProgress ||
                    getAccountLinkInProgress;
                  const addressCountryFromForm =
                    values.country?.trim() ||
                    (values.location?.selectedPlace && values.location.selectedPlace.country);
                  const hasSelectedPlace = !!values.location?.selectedPlace;
                  const addressFieldsIncomplete =
                    hasSelectedPlace &&
                    (!values.street?.trim() ||
                      !values.streetNumber?.trim() ||
                      !values.city?.trim() ||
                      !values.state?.trim() ||
                      !values.postalCode?.trim() ||
                      !addressCountryFromForm);
                  const companyFieldsIncomplete =
                    customerType === 'company' && !values.websiteUrl?.trim();
                  const submitDisabled =
                    invalid ||
                    submitInProgress ||
                    isGeocoding ||
                    !!addressFieldsIncomplete ||
                    !!companyFieldsIncomplete;

                  const searchCountry = getCountryForLocale(currentLocale);

                  React.useEffect(() => {
                    const locationData = values.location;
                    if (locationData?.selectedPlace) {
                      const place = locationData.selectedPlace;
                      const streetName = place.street || '';
                      const streetNum = place.streetNumber || '';
                      form.batch(() => {
                        form.change('street', streetName);
                        form.change('streetNumber', streetNum);
                        form.change('city', place.city || '');
                        form.change('state', place.state || '');
                        form.change('postalCode', place.postalCode || '');
                        form.change('country', place.country || values.country);
                      });
                      if (place.origin) {
                        setSelectedGeolocation(
                          new LatLng(place.origin.lat, place.origin.lng)
                        );
                      }
                    }
                  }, [values.location]);

                  return (
                    <Form className={css.form} onSubmit={handleSubmit}>
                      {/* Customer Type Selection */}
                      <div className={css.sectionTitle}>
                        <FormattedMessage id="NewSignupStripePage.accountType" />
                      </div>

                      <div className={css.customerTypeContainer}>
                        <button
                          type="button"
                          className={classNames(css.customerTypeChip, {
                            [css.customerTypeChipActive]: customerType === 'individual',
                          })}
                          onClick={() => setCustomerType('individual')}
                          style={
                            customerType === 'individual'
                              ? {
                                  backgroundColor: marketplaceColor,
                                  borderColor: marketplaceColor,
                                }
                              : {
                                  borderColor: marketplaceColor,
                                  color: marketplaceColor,
                                }
                          }
                        >
                          <FormattedMessage id="NewSignupStripePage.customerTypeIndividual" />
                        </button>
                        <button
                          type="button"
                          className={classNames(css.customerTypeChip, {
                            [css.customerTypeChipActive]: customerType === 'company',
                          })}
                          onClick={() => setCustomerType('company')}
                          style={
                            customerType === 'company'
                              ? {
                                  backgroundColor: marketplaceColor,
                                  borderColor: marketplaceColor,
                                }
                              : {
                                  borderColor: marketplaceColor,
                                  color: marketplaceColor,
                                }
                          }
                        >
                          <FormattedMessage id="NewSignupStripePage.customerTypeCompany" />
                        </button>
                      </div>

                      {/* Name fields based on customer type - BEFORE email */}
                      {customerType === 'company' ? (
                        <>
                          <FieldTextInput
                            className={css.field}
                            type="text"
                            id="companyName"
                            name="companyName"
                            autoComplete="organization"
                            label={intl.formatMessage({ id: 'NewSignupStripePage.companyNameLabel' })}
                            placeholder={intl.formatMessage({
                              id: 'NewSignupStripePage.companyNamePlaceholder',
                            })}
                            validate={validators.required(
                              intl.formatMessage({ id: 'NewSignupStripePage.companyNameRequired' })
                            )}
                          />
                          <div className={css.websiteUrlField}>
                            <label htmlFor="websiteUrl">
                              {intl.formatMessage({ id: 'NewSignupStripePage.websiteUrlLabel' })}
                            </label>
                            <div className={css.websiteUrlInputWrapper}>
                              <span className={css.websiteUrlPrefix}>https://</span>
                              <FieldTextInput
                                rootClassName={css.websiteUrlInputRoot}
                                type="text"
                                id="websiteUrl"
                                name="websiteUrl"
                                autoComplete="url"
                                placeholder={intl.formatMessage({
                                  id: 'NewSignupStripePage.websiteUrlPlaceholderNoProtocol',
                                })}
                                format={formatWebsiteUrl}
                                parse={parseWebsiteUrl}
                                validate={composeValidators(
                                  validators.required(
                                    intl.formatMessage({ id: 'NewSignupStripePage.websiteUrlRequired' })
                                  ),
                                  validators.validBusinessURL(
                                    intl.formatMessage({ id: 'NewSignupStripePage.websiteUrlInvalid' })
                                  )
                                )}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className={css.fieldsRow}>
                          <FieldTextInput
                            className={css.field}
                            type="text"
                            id="firstName"
                            name="firstName"
                            autoComplete="given-name"
                            label={intl.formatMessage({ id: 'NewSignupStripePage.firstNameLabel' })}
                            placeholder={intl.formatMessage({
                              id: 'NewSignupStripePage.firstNamePlaceholder',
                            })}
                            validate={validators.required(
                              intl.formatMessage({ id: 'NewSignupStripePage.firstNameRequired' })
                            )}
                          />
                          <FieldTextInput
                            className={css.field}
                            type="text"
                            id="lastName"
                            name="lastName"
                            autoComplete="family-name"
                            label={intl.formatMessage({ id: 'NewSignupStripePage.lastNameLabel' })}
                            placeholder={intl.formatMessage({
                              id: 'NewSignupStripePage.lastNamePlaceholder',
                            })}
                            validate={validators.required(
                              intl.formatMessage({ id: 'NewSignupStripePage.lastNameRequired' })
                            )}
                          />
                        </div>
                      )}

                      {/* Email */}
                      <FieldTextInput
                        className={css.field}
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="username email"
                        label={intl.formatMessage({ id: 'NewSignupStripePage.emailLabel' })}
                        placeholder={intl.formatMessage({
                          id: 'NewSignupStripePage.emailPlaceholder',
                        })}
                        validate={composeValidators(
                          validators.required(
                            intl.formatMessage({ id: 'NewSignupStripePage.emailRequired' })
                          ),
                          validators.emailFormatValid(
                            intl.formatMessage({ id: 'NewSignupStripePage.emailInvalid' })
                          )
                        )}
                      />

                      {/* Password */}
                      <FieldTextInput
                        className={css.field}
                        type="password"
                        id="new-password"
                        name="password"
                        autoComplete="new-password"
                        label={intl.formatMessage({ id: 'NewSignupStripePage.passwordLabel' })}
                        placeholder={intl.formatMessage({
                          id: 'NewSignupStripePage.passwordPlaceholder',
                        })}
                        validate={composeValidators(
                          validators.requiredStringNoTrim(
                            intl.formatMessage({ id: 'NewSignupStripePage.passwordRequired' })
                          ),
                          validators.minLength(
                            intl.formatMessage(
                              { id: 'NewSignupStripePage.passwordTooShort' },
                              { minLength: validators.PASSWORD_MIN_LENGTH }
                            ),
                            validators.PASSWORD_MIN_LENGTH
                          )
                        )}
                      />

                      {/* Phone */}
                      <div className={css.phoneFields}>
                        <FieldPhonePrefixSelect
                          className={css.phonePrefixField}
                          id="phonePrefix"
                          name="phonePrefix"
                          label={intl.formatMessage({ id: 'NewSignupPage.phonePrefixLabel' })}
                          options={PHONE_PREFIXES}
                        />
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
                              values.phonePrefix || getDefaultPhonePrefix(currentLocale)
                            )
                          )}
                        />
                      </div>

                      {/* Date of birth - individual only */}
                      {customerType === 'individual' && (
                        <FieldSingleDatePicker
                          className={css.field}
                          id="dateOfBirth"
                          name="dateOfBirth"
                          label={intl.formatMessage({ id: 'NewSignupPage.dateOfBirthLabel' })}
                          placeholderText={intl.formatMessage({
                            id: 'NewSignupPage.dateOfBirthPlaceholder',
                          })}
                          format={formatDateOfBirth}
                          parse={parseDateOfBirth}
                          isOutsideRange={isBirthDateOutsideRange}
                          theme="light"
                          showYearStepper={true}
                          showErrorMessage={true}
                          validate={composeValidators(
                            validators.required(
                              intl.formatMessage({ id: 'NewSignupPage.dateOfBirthRequired' })
                            ),
                            dateNotInFuture(
                              intl.formatMessage({ id: 'NewSignupPage.dateNotInFuture' })
                            ),
                            ageAtLeast18(
                              intl.formatMessage({ id: 'NewSignupPage.ageAtLeast18' })
                            )
                          )}
                        />
                      )}

                      {/* Address - single FieldLocationAutocompleteInput keeps focus when switching views */}
                      <div
                        className={classNames(
                          values.location?.selectedPlace ? css.addressFields : css.addressSectionSingle
                        )}
                      >
                        <div
                          className={classNames(
                            values.location?.selectedPlace ? css.streetField : css.addressFieldFullWidth
                          )}
                        >
                          <FieldLocationAutocompleteInput
                            rootClassName={css.locationFieldRoot}
                            className={css.field}
                            inputClassName={css.locationAutocompleteInput}
                            iconClassName={
                              values.location?.selectedPlace
                                ? css.locationAutocompleteInputIconHidden
                                : css.locationAutocompleteInputIcon
                            }
                            predictionsClassName={css.predictionsRoot}
                            validClassName={css.validLocation}
                            CustomIcon={IconLocation}
                            name="location"
                            id="location"
                            label={intl.formatMessage({ id: 'NewSignupPage.addressLabel' })}
                            placeholder={intl.formatMessage({
                              id:
                                customerType === 'company'
                                  ? 'NewSignupPage.addressPlaceholderCompany'
                                  : 'NewSignupPage.addressPlaceholder',
                            })}
                            format={identity}
                            valueFromForm={values.location}
                            countryLimit={searchCountry}
                            useDefaultPredictions={false}
                            addManualEntryOption
                            manualEntryLabelId="LocationAutocompleteInput.useTypedAddress"
                            validate={autocompleteSearchRequired(
                              intl.formatMessage({ id: 'NewSignupPage.addressRequired' })
                            )}
                          />
                        </div>
                        {values.location?.selectedPlace && (
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
                            validate={composeValidators(
                              validators.required(
                                intl.formatMessage({ id: 'NewSignupPage.streetNumberRequired' })
                              ),
                              streetNumberValid(
                                intl.formatMessage({ id: 'NewSignupPage.streetNumberInvalid' })
                              )
                            )}
                          />
                        )}
                      </div>

                      {values.location?.selectedPlace && (
                        <>
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
                          />
                          <AddressCascadingDropdowns
                            locale={currentLocale}
                            initialCountry={
                              values.country
                                ? (SUPPORTED_COUNTRIES.find(c => c.code === values.country)?.name ||
                                    values.country)
                                : SUPPORTED_COUNTRIES.find(
                                    c => c.code === getCountryForLocale(currentLocale)
                                  )?.name || 'Italia'
                            }
                            initialState={values.state || cascadingState}
                            initialCity={values.city || cascadingCity}
                            initialPostalCode={values.postalCode || ''}
                            className={css.cascadingDropdowns}
                            onCountryChange={(countryObj, translatedName) => {
                              setCascadingCountry(translatedName);
                              setCascadingState('');
                              setCascadingCity('');
                              form.change('country', countryObj?.iso2 || values.country);
                            }}
                            onStateChange={(stateVal, stateName, stateCode) => {
                              setCascadingState(stateCode || stateName);
                              setCascadingCity('');
                              form.change('state', stateCode || stateName);
                              form.change('city', '');
                            }}
                            onCityChange={(cityVal, cityName) => {
                              setCascadingCity(cityName);
                              form.change('city', cityName);
                            }}
                            onPostalCodeChange={postalCode => {
                              form.change('postalCode', postalCode);
                            }}
                          />
                        </>
                      )}

                      {/* Info box about Stripe */}
                      <div className={css.infoBox}>
                        <FormattedMessage 
                          id={customerType === 'company' 
                            ? 'NewSignupStripePage.stripeInfoMessageCompany' 
                            : 'NewSignupStripePage.stripeInfoMessageIndividual'
                          } 
                        />
                      </div>

                      {/* Terms and Conditions */}
                      <FieldCheckbox
                        className={css.termsCheckbox}
                        id="termsAccepted"
                        name="termsAccepted"
                        label={
                          <span className={css.termsLabel}>
                            <FormattedMessage
                              id="NewSignupStripePage.termsAndConditions"
                              values={{
                                termsLink: (
                                  <NamedLink name="CMSPage" params={{ pageId: 'terms-of-service' }}>
                                    <FormattedMessage id="NewSignupStripePage.termsOfService" />
                                  </NamedLink>
                                ),
                                privacyLink: (
                                  <NamedLink name="CMSPage" params={{ pageId: 'privacy-policy' }}>
                                    <FormattedMessage id="NewSignupStripePage.privacyPolicy" />
                                  </NamedLink>
                                ),
                              }}
                            />
                          </span>
                        }
                        validate={validators.requiredBoolean(
                          intl.formatMessage({ id: 'NewSignupStripePage.termsRequired' })
                        )}
                      />

                      <PrimaryButton
                        className={css.submitButton}
                        type="submit"
                        inProgress={submitInProgress}
                        disabled={submitDisabled}
                      >
                        <FormattedMessage id="NewSignupStripePage.continueToStripe" />
                      </PrimaryButton>
                    </Form>
                  );
                }}
              />
              )}
            </div>
          </div>
        </div>

        <div className={css.rightSide}></div>
      </div>
    </Page>
  );
};

NewSignupStripePageComponent.propTypes = {
  authInProgress: bool.isRequired,
  currentUser: propTypes.currentUser,
  isAuthenticated: bool.isRequired,
  location: object.isRequired,
  signupError: propTypes.error,
  scrollingDisabled: bool.isRequired,
  submitSignup: func.isRequired,
  params: object,
};

const mapStateToProps = state => {
  const { isAuthenticated, signupError } = state.auth;
  const { currentUser, sendVerificationEmailInProgress, sendVerificationEmailError } = state.user;
  const {
    stripeAccount,
    stripeAccountFetched,
    createStripeAccountError,
    createStripeAccountInProgress,
    getAccountLinkInProgress,
    getAccountLinkError,
  } = state.stripeConnectAccount;

  return {
    authInProgress: authenticationInProgress(state),
    currentUser,
    isAuthenticated,
    signupError,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    scrollingDisabled: isScrollingDisabled(state),
    stripeAccount,
    stripeAccountFetched,
    createStripeAccountError,
    createStripeAccountInProgress,
    getAccountLinkInProgress,
    getAccountLinkError,
  };
};

const mapDispatchToProps = dispatch => ({
  submitSignup: params => dispatch(signup(params)),
  onUpdateProfile: params => dispatch(updateProfile(params)),
  onCreateStripeAccount: params => dispatch(createStripeAccount(params)),
  dispatch, // Add dispatch to props for useGuestListingAfterAuth
  onGetStripeConnectAccountLink: params => dispatch(getStripeConnectAccountLink(params)),
  onFetchStripeAccount: () => dispatch(fetchStripeAccount()),
  onVerifyEmail: token => dispatch(verifyEmail(token)),
  onFetchCurrentUser: options => dispatch(fetchCurrentUser(options)),
  onResendVerificationEmail: () => dispatch(sendVerificationEmail()),
  dispatch,
});

const NewSignupStripePage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(NewSignupStripePageComponent);

export default NewSignupStripePage;
