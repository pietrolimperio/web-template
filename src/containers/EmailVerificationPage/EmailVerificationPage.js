import React, { useEffect, useState } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import { verify } from '../../ducks/emailVerification.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { isGuestListingPendingPublish } from '../../util/guestListingStorage';
import { useGuestListingAfterAuth } from '../../util/useGuestListingAfterAuth';
import {
  Page,
  NamedRedirect,
  IconSpinner,
} from '../../components';
import { PENDING_VERIFICATION_TOKEN_KEY } from './EmailVerificationPage.duck';
import devLog from '../../util/devLog';

import css from './EmailVerificationPage.module.css';

// One-shot flag to allow automatic redirect to Stripe exactly once (when coming from EmailVerificationPage)
const AUTO_STRIPE_REDIRECT_ONCE_KEY = 'autoStripeRedirectOnce';

/**
  Parse verification token from URL

  Returns stringified token, if the token is provided.

  Returns `null` if verification token is not provided.

  Please note that we need to explicitely stringify the token, because
  the unwanted result of the `parse` method is that it automatically
  parses the token to number.
*/
const parseVerificationToken = search => {
  const urlParams = parse(search);
  const verificationToken = urlParams.t;

  if (verificationToken) {
    return `${verificationToken}`;
  }

  return null;
};

/**
 * The EmailVerificationPage component.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @param {Function} props.submitVerification - The submit verification function
 * @param {boolean} props.isVerified - Whether the email is verified
 * @param {boolean} props.emailVerificationInProgress - Whether the email verification is in progress
 * @param {propTypes.error} props.verificationError - The verification error
 * @param {Object} props.location - The location object
 * @param {string} props.location.search - The search object
 * @returns {JSX.Element} email verification page component
 */
export const EmailVerificationPageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    scrollingDisabled,
    submitVerification,
    isVerified,
    emailVerificationInProgress,
    verificationError,
    location,
    onFetchCurrentUser,
    isAuthenticated,
    dispatch,
  } = props;
  
  // Use hook to handle guest listing creation after email verification
  useGuestListingAfterAuth(isAuthenticated, currentUser, dispatch);

  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState(null);
  const [userFetchAttempted, setUserFetchAttempted] = useState(false);
  const [userFetchInProgress, setUserFetchInProgress] = useState(false);
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  const MAX_FETCH_RETRIES = 5;
  const FETCH_RETRY_DELAY = 500; // 500ms between retries

  const token = parseVerificationToken(location ? location.search : null);
  const initialValues = { verificationToken: token };
  
  const user = ensureCurrentUser(currentUser);
  const { email, emailVerified, pendingEmail, profile } = user.attributes || {};
  const name = profile?.firstName;

  // Access privateData from profile (pendingStripeOnboarding is only in privateData)
  const profilePrivateData = profile?.privateData;
  
  // Check privateData only (pendingStripeOnboarding is only in privateData)
  const pendingStripeOnboarding = profilePrivateData?.pendingStripeOnboarding;

  // Effect: Force fetch current user to get privateData with retry mechanism
  useEffect(() => {
    // Only trigger if we need to fetch and haven't exceeded max retries
    if (user.id && profilePrivateData === undefined && !userFetchInProgress && fetchRetryCount < MAX_FETCH_RETRIES) {
      devLog(`📧 profilePrivateData undefined, forcing user fetch (attempt ${fetchRetryCount + 1}/${MAX_FETCH_RETRIES})...`);
      setUserFetchAttempted(true);
      setUserFetchInProgress(true);
      
      onFetchCurrentUser({ enforce: true })
        .then(() => {
          devLog('✅ User fetch completed, waiting for Redux to update...');
          // Wait a bit for Redux to update
          setTimeout(() => {
            // If we haven't exceeded retries, retry (the effect will check if profilePrivateData is available)
            if (fetchRetryCount < MAX_FETCH_RETRIES - 1) {
              devLog(`⚠️ Will retry fetch (attempt ${fetchRetryCount + 2}/${MAX_FETCH_RETRIES})...`);
              setUserFetchInProgress(false);
              // Increment retry count to trigger retry
              setTimeout(() => {
                setFetchRetryCount(prev => prev + 1);
              }, FETCH_RETRY_DELAY);
            } else {
              devLog('⚠️ Max retries reached, profilePrivateData still undefined');
              setUserFetchInProgress(false);
            }
          }, FETCH_RETRY_DELAY);
        })
        .catch(err => {
          console.error('❌ User fetch failed:', err);
          if (fetchRetryCount < MAX_FETCH_RETRIES - 1) {
            devLog(`⚠️ Fetch failed, will retry (attempt ${fetchRetryCount + 2}/${MAX_FETCH_RETRIES})...`);
            setUserFetchInProgress(false);
            // Increment retry count to trigger retry
            setTimeout(() => {
              setFetchRetryCount(prev => prev + 1);
            }, FETCH_RETRY_DELAY);
          } else {
            console.error('❌ Max retries reached, giving up');
            setUserFetchInProgress(false);
          }
        });
    }
  }, [user.id, profilePrivateData, userFetchInProgress, fetchRetryCount, onFetchCurrentUser]);

  // Effect: Handle verification logic based on pendingStripeOnboarding
  useEffect(() => {
    if (!user.id || verificationAttempted) return;

    // CRITICAL: Do NOT proceed with verification if we don't have profilePrivateData yet
    // We need to be sure about the Stripe onboarding status
    if (profilePrivateData === undefined && userFetchAttempted) {
      devLog('📧 Waiting for profilePrivateData to be available before proceeding...');
      return;
    }

    // If fetch is in progress, wait
    if (userFetchInProgress) {
      devLog('📧 User fetch in progress, waiting...');
      return;
    }

    // Debug logging
    devLog('📧 EmailVerificationPage effect - checking conditions:', {
      userId: user.id,
      pendingStripeOnboarding,
      emailVerified,
      pendingEmail,
      hasToken: !!token,
      profilePrivateData: user.attributes?.profile?.privateData,
      userFetchAttempted,
      userFetchInProgress,
      fetchRetryCount,
    });

    // If Stripe onboarding is pending, redirect to complete it first
    // Token is already stored in sessionStorage by loadData
    if (pendingStripeOnboarding === true) {
      devLog('📧 Stripe onboarding pending - redirecting to complete Stripe first');
      // Ensure token is stored
      if (token) {
        sessionStorage.setItem(PENDING_VERIFICATION_TOKEN_KEY, token);
      }
      // Allow NewSignupStripePage to auto-start Stripe exactly once
      sessionStorage.setItem(AUTO_STRIPE_REDIRECT_ONCE_KEY, '1');
      setRedirectTarget({ name: 'SignupPage', state: { completeStripeOnboarding: true } });
      setShouldRedirect(true);
      setVerificationAttempted(true);
      return;
    }

    // If email is already verified, check if there's a pending guest listing
    if (emailVerified && !pendingEmail) {
      devLog('📧 Email already verified');
      
      // If there's a pending guest listing, let useGuestListingAfterAuth handle the redirect
      // Don't redirect to landing page - the hook will redirect to preview page after creating draft
      if (isGuestListingPendingPublish()) {
        devLog('📧 Guest listing pending - will be handled by useGuestListingAfterAuth hook');
        // Don't set redirect - let the hook handle it
        setVerificationAttempted(true);
        return;
      }
      
      // No pending guest listing, redirect to landing page as usual
      setRedirectTarget({ 
        name: 'LandingPage', 
        state: { emailVerification: 'success', userName: name, userEmail: email } 
      });
      setShouldRedirect(true);
      setVerificationAttempted(true);
      return;
    }

    // Verify the email now (no pending Stripe)
    // Only proceed if we have profilePrivateData available (we're sure about the status)
    if (token && !emailVerificationInProgress && profilePrivateData !== undefined) {
      devLog('📧 Verifying email now (pendingStripeOnboarding is false or undefined, and we have profilePrivateData)...');
      setVerificationAttempted(true);
      submitVerification({ verificationToken: token })
        .then(() => {
          devLog('✅ Email verified successfully');
          // Clear token from sessionStorage
          sessionStorage.removeItem(PENDING_VERIFICATION_TOKEN_KEY);
          
          // If there's a pending guest listing, let useGuestListingAfterAuth handle the redirect
          // Don't redirect to landing page - the hook will redirect to preview page after creating draft
          if (isGuestListingPendingPublish()) {
            devLog('📧 Guest listing pending - will be handled by useGuestListingAfterAuth hook');
            // Don't set redirect - let the hook handle it after user data is refreshed
            // The hook will trigger when emailVerified becomes true
            return;
          }
          
          // No pending guest listing, redirect to landing page as usual
          setRedirectTarget({ 
            name: 'LandingPage', 
            state: { emailVerification: 'success', userName: name, userEmail: email } 
          });
          setShouldRedirect(true);
        })
        .catch(err => {
          console.error('❌ Email verification failed:', err);
          setRedirectTarget({ 
            name: 'LandingPage', 
            state: { emailVerification: 'error', userName: name, userEmail: email } 
          });
          setShouldRedirect(true);
        });
    } else if (token && profilePrivateData === undefined) {
      devLog('📧 Cannot verify email yet - profilePrivateData not available');
    }
  }, [user.id, user.attributes?.profile?.privateData, pendingStripeOnboarding, emailVerified, pendingEmail, token, verificationAttempted, emailVerificationInProgress, userFetchAttempted, userFetchInProgress, profilePrivateData, fetchRetryCount]);

  // Handle redirect
  if (shouldRedirect && redirectTarget) {
    return <NamedRedirect name={redirectTarget.name} state={redirectTarget.state} />;
  }

  // PASS-THROUGH UI: always show a minimal white page with spinner while logic runs.
  // Also show an error if max retries reached and privateData is still unavailable.
  const showError =
    user.id &&
    fetchRetryCount >= MAX_FETCH_RETRIES &&
    profilePrivateData === undefined &&
    !userFetchInProgress;

  const loadingMessageId =
    userFetchInProgress || (profilePrivateData === undefined && userFetchAttempted)
      ? 'EmailVerificationPage.loadingUserData'
      : 'EmailVerificationPage.verifying';

  return (
    <Page
      title={intl.formatMessage({ id: 'EmailVerificationPage.title' })}
      scrollingDisabled={scrollingDisabled}
      referrer="origin"
    >
      <div className={css.loadingContainer}>
        {!showError && <IconSpinner />}
        <p>
          {showError ? (
            <FormattedMessage
              id="EmailVerificationPage.fetchError"
              defaultMessage="Impossibile caricare i dati utente. Per favore aggiorna la pagina."
            />
          ) : (
            <>
              <FormattedMessage
                id={loadingMessageId}
                defaultMessage={userFetchInProgress ? 'Caricamento dati utente...' : 'Verifica in corso...'}
              />
              {userFetchInProgress && fetchRetryCount > 0 ? (
                <span>{` (${fetchRetryCount}/${MAX_FETCH_RETRIES})`}</span>
              ) : null}
            </>
          )}
        </p>
      </div>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const { isVerified, verificationError, verificationInProgress } = state.emailVerification;
  const { isAuthenticated } = state.auth;
  return {
    isVerified,
    verificationError,
    emailVerificationInProgress: verificationInProgress,
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
    isAuthenticated,
  };
};

const mapDispatchToProps = dispatch => ({
  submitVerification: ({ verificationToken }) => {
    return dispatch(verify(verificationToken));
  },
  onFetchCurrentUser: options => dispatch(fetchCurrentUser(options)),
  dispatch, // Add dispatch for useGuestListingAfterAuth
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const EmailVerificationPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EmailVerificationPageComponent);

export default EmailVerificationPage;
