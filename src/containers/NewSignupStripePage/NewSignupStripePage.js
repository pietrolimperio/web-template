import React, { useState, useEffect, useRef } from 'react';
import { bool, func, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { isSignupEmailTakenError } from '../../util/errors';
import { createResourceLocatorString } from '../../util/routes';
import { DEFAULT_LOCALE } from '../../config/localeConfig';

import { signup, authenticationInProgress } from '../../ducks/auth.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';
import {
  createStripeAccount,
  getStripeConnectAccountLink,
  fetchStripeAccount,
} from '../../ducks/stripeConnectAccount.duck';
import { updateProfile } from '../ProfileSettingsPage/ProfileSettingsPage.duck';
import { verify as verifyEmail } from '../../ducks/emailVerification.duck';
import { PENDING_VERIFICATION_TOKEN_KEY } from '../EmailVerificationPage/EmailVerificationPage.duck';
import { composeValidators } from '../../util/validators';

import {
  Page,
  Form,
  PrimaryButton,
  FieldTextInput,
  FieldSelect,
  FieldCheckbox,
  NamedLink,
  IconSpinner,
} from '../../components';

import logoImage from '../../assets/logo.png';
import css from './NewSignupStripePage.module.css';

// Constants for Stripe onboarding return URLs
const STRIPE_ONBOARDING_RETURN_URL_SUCCESS = 'success';
const STRIPE_ONBOARDING_RETURN_URL_FAILURE = 'failure';

// Session storage key for temporary signup data
const SIGNUP_DATA_KEY = 'stripe_signup_pending_data';

// Supported countries for Stripe
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
  params,
  history,
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

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);

    // Check if we're returning from Stripe
    console.log('🔄 Mount effect - checking return from Stripe:', {
      returnURLType,
      returnedFromStripeSuccess,
      returnedFromStripeFailure,
      isAuthenticated,
      currentUserLoaded,
    });
    
    if (returnedFromStripeSuccess || returnedFromStripeFailure) {
      const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
      console.log('🔄 Stored signup data:', storedData);
      
      if (storedData) {
        const data = JSON.parse(storedData);
        setCustomerType(data.customerType);
        setSignupEmail(data.email);
        
        if (returnedFromStripeSuccess) {
          console.log('✅ Returned from Stripe SUCCESS, fetching account...');
          setProcessingStripeReturn(true); // Set flag to prevent other effects from interfering
          setStep(STEP_PROCESSING);
          // Fetch the Stripe account data
          onFetchStripeAccount();
        } else {
          // Stripe failure - show form with retry option
          console.log('❌ Returned from Stripe FAILURE - showing retry option');
          setStep(STEP_FORM);
          setErrorMessage(intl.formatMessage({ id: 'NewSignupStripePage.stripeOnboardingFailed' }));
        }
      } else if (isAuthenticated && currentUserLoaded) {
        // User is authenticated but no stored data - reconstruct from user data
        console.log('⚠️ No stored data but user authenticated');
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
        console.log('❌ No stored data and not authenticated');
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
    
    console.log('🔍 Update user effect - conditions:', {
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
        console.log('✅ All conditions met with data, calling updateUserFromStripeData');
        updateUserFromStripeData();
      } else if (fetchRetryCount < MAX_FETCH_RETRIES) {
        // Data not available yet, retry after delay
        console.log(`⏳ stripeAccountData is null, retrying in ${FETCH_RETRY_DELAY}ms (attempt ${fetchRetryCount + 1}/${MAX_FETCH_RETRIES})`);
        const timeoutId = setTimeout(() => {
          setFetchRetryCount(prev => prev + 1);
          onFetchStripeAccount();
        }, FETCH_RETRY_DELAY);
        return () => clearTimeout(timeoutId);
      } else {
        console.log('⚠️ Max retries reached, stripeAccountData still null. Proceeding without update.');
        updateUserFromStripeData(); // Will skip update due to null data
      }
    } else if (step === STEP_PROCESSING) {
      console.log('⚠️ In STEP_PROCESSING but missing:', {
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
  console.log('🔐 NewSignupStripePage - Auth check:', {
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
    console.log('➡️ Redirecting authenticated user to home (Stripe completed)');
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
      console.log('📝 privateData not loaded, forcing user fetch...');
      setUserFetchAttempted(true);
      onFetchCurrentUser({ enforce: true });
    }
  }, [isAuthenticated, currentUserLoaded, privateDataLoaded, userFetchAttempted, onFetchCurrentUser]);

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
      // Get signup data - first try sessionStorage, then fall back to user's privateData
      const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
      let country, storedCustomerType;
      
      if (storedData) {
        // New signup flow - data in sessionStorage
        const signupData = JSON.parse(storedData);
        country = signupData.country;
        storedCustomerType = signupData.customerType;
      } else {
        // Returning user flow - get data from user's publicData
        const userPublicData = user.attributes?.profile?.publicData || {};
        country = userPublicData.country || 'IT'; // Default to IT if not found
        storedCustomerType = userPublicData.customerType || customerType || 'individual';
        
        // Store in sessionStorage for consistency with the rest of the flow
        const signupData = {
          email: user.attributes?.email,
          customerType: storedCustomerType,
          country,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(SIGNUP_DATA_KEY, JSON.stringify(signupData));
        console.log('📝 Created sessionStorage data for returning user:', signupData);
      }

      // Create Stripe Connect account
      const stripePublishableKey = config.stripe?.publishableKey;
      const defaultMCC = config.stripe?.defaultMCC || '5734';

      // Build business profile URL - use test URL for localhost (Stripe doesn't accept localhost)
      const cleanRootURL = rootURL ? rootURL.replace(/\/$/, '') : '';
      const isLocalhost = cleanRootURL.includes('localhost');
      const profilePath = user.id?.uuid ? `/u/${user.id.uuid}` : '/u/new-user';
      const businessProfileURL = isLocalhost
        ? `https://test-marketplace.com${profilePath}?mode=storefront`
        : `${cleanRootURL}${profilePath}?mode=storefront`;

      console.log('🔧 Stripe Setup Debug:', {
        rootURL,
        cleanRootURL,
        isLocalhost,
        profilePath,
        businessProfileURL,
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
      // This handles users who verified email before completing Stripe
      useEffect(() => {
        if (
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
          console.log('📝 Authenticated user needs to complete Stripe onboarding');
          // Get customer type from user's profile publicData
          const userCustomerType = user.attributes?.profile?.publicData?.customerType || 'individual';
          setCustomerType(userCustomerType);
          setReturningUserStripeInitiated(true);
          proceedToStripeSetup();
        }
      }, [isAuthenticated, currentUserLoaded, privateDataLoaded, pendingStripeOnboarding, completeStripeOnboarding, step, returningUserStripeInitiated, returnedFromStripeSuccess, returnedFromStripeFailure, processingStripeReturn]);

  /**
   * Update user profile with data from Stripe account
   */
  const updateUserFromStripeData = async () => {
    console.log('📝 updateUserFromStripeData called');
    setStep(STEP_UPDATING_USER);

    try {
      const stripeAccountData = stripeAccount?.attributes?.stripeAccountData;
      console.log('📝 Stripe account data:', stripeAccountData);
      
      if (!stripeAccountData) {
        console.log('⚠️ No stripeAccountData found, marking for later update');
        // No additional data from Stripe, but mark onboarding as complete
        // Set stripeDataUpdatePending: true to retry update after email verification
        try {
          await onUpdateProfile({
            privateData: {
              pendingStripeOnboarding: false,
              stripeDataUpdatePending: true, // Flag to retry fetching Stripe data after email verification
            },
          });
          console.log('✅ Marked stripeDataUpdatePending for later retry');
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

        if (company.representative) {
          firstName = company.representative.first_name || companyName;
          lastName = company.representative.last_name || '';
        } else {
          firstName = companyName;
          lastName = '';
        }

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

      updateParams.privateData = privateDataUpdate;
      
      // No need to update publicData.pendingStripeOnboarding (it's only in privateData now)

      console.log('📝 Update params to send:', updateParams);

      // Update user profile
      const updateResult = await onUpdateProfile(updateParams);
      console.log('✅ Profile update result:', updateResult);

      // Reset processing flag since we've completed the Stripe return flow
      setProcessingStripeReturn(false);

      // Check for pending email verification and verify now
      await verifyPendingEmail();

      // Clear stored data and show verification
      sessionStorage.removeItem(SIGNUP_DATA_KEY);
      setStep(STEP_VERIFICATION);
    } catch (error) {
      console.error('❌ Error updating user from Stripe data:', error);
      // Even if update fails, try to verify email and show verification - user is created
      await verifyPendingEmail();
      sessionStorage.removeItem(SIGNUP_DATA_KEY);
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
      console.log('📧 Found pending verification token, verifying email now...');
      try {
        await onVerifyEmail(pendingToken);
        sessionStorage.removeItem(PENDING_VERIFICATION_TOKEN_KEY);
        console.log('✅ Email verified successfully');
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
    const { email, password, country, firstName, lastName, companyName, termsAccepted } = values;

    // Store signup data in session storage for later use
    const signupData = {
      email,
      password,
      customerType,
      country,
      firstName,
      lastName,
      companyName,
      termsAccepted,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SIGNUP_DATA_KEY, JSON.stringify(signupData));

    setStep(STEP_CREATING_USER);
    setSignupEmail(email);
    setErrorMessage(null);

    // Determine firstName and lastName based on customer type
    let finalFirstName, finalLastName;
    if (customerType === 'company' && companyName) {
      finalFirstName = companyName;
      finalLastName = '';
    } else {
      finalFirstName = firstName || email.split('@')[0];
      finalLastName = lastName || 'User';
    }

    // Create user on Sharetribe with minimal info
    // The signup action will auto-login the user
    const params = {
      email,
      password,
      firstName: finalFirstName,
      lastName: finalLastName,
      publicData: {
        userType: 'customer',
        locale: currentLocale,
        country, // Store country in publicData
        customerType, // Store customerType in publicData
      },
      privateData: {
        pendingStripeOnboarding: true, // Only in privateData
      },
      protectedData: {
        terms: termsAccepted ? ['tos-and-privacy'] : [],
      },
    };

    // Set flag to proceed to Stripe after auth completes
    setPendingStripeSetup(true);

    // This will trigger the signup and auto-login
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

                <div className={css.verificationHelp}>
                  <p className={css.verificationHelpText}>
                    <FormattedMessage id="NewSignupStripePage.verificationHelp" />
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
              {isAuthenticated && currentUserLoaded && (pendingStripeOnboarding || (!privateDataLoaded && userFetchAttempted)) ? (
                <div className={css.retryStripeContainer}>
                  {/* Read-only name fields - BEFORE email */}
                  {userPublicData?.customerType === 'company' ? (
                    <div className={css.readOnlyField}>
                      <label className={css.readOnlyLabel}>
                        <FormattedMessage id="NewSignupStripePage.companyNameLabel" />
                      </label>
                      <div className={css.readOnlyValue}>
                        {user.attributes?.profile?.firstName || ''}
                      </div>
                    </div>
                  ) : (
                    <div className={css.readOnlyFieldsRow}>
                      <div className={css.readOnlyField}>
                        <label className={css.readOnlyLabel}>
                          <FormattedMessage id="NewSignupStripePage.firstNameLabel" />
                        </label>
                        <div className={css.readOnlyValue}>
                          {user.attributes?.profile?.firstName || ''}
                        </div>
                      </div>
                      <div className={css.readOnlyField}>
                        <label className={css.readOnlyLabel}>
                          <FormattedMessage id="NewSignupStripePage.lastNameLabel" />
                        </label>
                        <div className={css.readOnlyValue}>
                          {user.attributes?.profile?.lastName || ''}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Read-only email */}
                  <div className={css.readOnlyField}>
                    <label className={css.readOnlyLabel}>
                      <FormattedMessage id="NewSignupStripePage.emailLabel" />
                    </label>
                    <div className={css.readOnlyValue}>
                      {user.attributes?.email || ''}
                    </div>
                  </div>

                  {/* Read-only country */}
                  <div className={css.readOnlyField}>
                    <label className={css.readOnlyLabel}>
                      <FormattedMessage id="NewSignupStripePage.countryLabel" />
                    </label>
                    <div className={css.readOnlyValue}>
                      {(() => {
                        const countryCode = userPublicData?.country || 'IT';
                        const countryObj = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
                        return countryObj ? countryObj.name : countryCode;
                      })()}
                    </div>
                  </div>

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
                initialValues={{ country: getDefaultCountryFromLocale(currentLocale) }}
                render={({ handleSubmit, invalid, pristine, values }) => {
                  const submitInProgress =
                    authInProgress ||
                    createStripeAccountInProgress ||
                    getAccountLinkInProgress;
                  const submitDisabled = invalid || submitInProgress;

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

                      {/* Country */}
                      <FieldSelect
                        className={css.field}
                        id="country"
                        name="country"
                        label={intl.formatMessage({ id: 'NewSignupStripePage.countryLabel' })}
                        validate={validators.required(
                          intl.formatMessage({ id: 'NewSignupStripePage.countryRequired' })
                        )}
                      >
                        <option disabled value="">
                          {intl.formatMessage({ id: 'NewSignupStripePage.countryPlaceholder' })}
                        </option>
                        {SUPPORTED_COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </FieldSelect>

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
  const { currentUser } = state.user;
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
  onGetStripeConnectAccountLink: params => dispatch(getStripeConnectAccountLink(params)),
  onFetchStripeAccount: () => dispatch(fetchStripeAccount()),
  onVerifyEmail: token => dispatch(verifyEmail(token)),
  onFetchCurrentUser: options => dispatch(fetchCurrentUser(options)),
});

const NewSignupStripePage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(NewSignupStripePageComponent);

export default NewSignupStripePage;
