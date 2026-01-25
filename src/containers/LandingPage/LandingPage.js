import React, { useState, useEffect } from 'react';
import loadable from '@loadable/component';

import { bool, func, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';
import { useIntl } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';

import { NotificationBanner, NamedRedirect } from '../../components';
import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';
import { fetchStripeAccount } from '../../ducks/stripeConnectAccount.duck';
import { updateProfile } from '../ProfileSettingsPage/ProfileSettingsPage.duck';
import { verify as verifyEmail } from '../../ducks/emailVerification.duck';
import { PENDING_VERIFICATION_TOKEN_KEY } from '../EmailVerificationPage/EmailVerificationPage.duck';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { 
    pageAssetsData, 
    inProgress, 
    error, 
    location, 
    currentUser,
    stripeAccount,
    stripeAccountFetched,
    onFetchStripeAccount,
    onUpdateProfile,
    onVerifyEmail,
  } = props;
  const intl = useIntl();
  const [notificationTitle, setNotificationTitle] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [notificationType, setNotificationType] = useState('success');
  const [stripeUpdateAttempted, setStripeUpdateAttempted] = useState(false);

  const user = ensureCurrentUser(currentUser);
  const profile = user.attributes?.profile;
  const stripeDataUpdatePending = profile?.privateData?.stripeDataUpdatePending;
  // Check privateData only (pendingStripeOnboarding is only in privateData)
  const pendingStripeOnboarding = profile?.privateData?.pendingStripeOnboarding;

  // Check if user needs to complete Stripe onboarding
  // This can happen in two cases:
  // 1. User clicked verification link but had pendingStripeOnboarding (status: 'pending-stripe')
  // 2. User verified email successfully but still has pendingStripeOnboarding (status: 'success')
  const emailVerificationStatus = location?.state?.emailVerification;
  const isEmailVerificationSuccess = emailVerificationStatus === 'success';
  const isPendingStripe = emailVerificationStatus === 'pending-stripe';
  
  if ((isEmailVerificationSuccess || isPendingStripe) && pendingStripeOnboarding && user.id) {
    console.log('⚠️ User needs to complete Stripe onboarding, redirecting...');
    return (
      <NamedRedirect 
        name="SignupPage" 
        state={{ completeStripeOnboarding: true }}
      />
    );
  }

  // Effect: Check if we need to retry Stripe data update after email verification
  useEffect(() => {
    if (
      isEmailVerificationSuccess && 
      stripeDataUpdatePending && 
      user.id && 
      !stripeUpdateAttempted
    ) {
      console.log('📝 stripeDataUpdatePending detected after email verification, fetching Stripe account...');
      setStripeUpdateAttempted(true);
      onFetchStripeAccount();
    }
  }, [isEmailVerificationSuccess, stripeDataUpdatePending, user.id, stripeUpdateAttempted, onFetchStripeAccount]);

  // Effect: Update user profile with Stripe data after fetch
  useEffect(() => {
    const updateUserWithStripeData = async () => {
      const stripeAccountData = stripeAccount?.attributes?.stripeAccountData;
      
      if (!stripeAccountData) {
        console.log('⚠️ Still no stripeAccountData available');
        return;
      }

      console.log('📝 Stripe account data retrieved, updating user profile...');

      try {
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
              country: individual.address.country || '',
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
              country: company.address.country || '',
            };
          }
        }

        // Build update params
        const updateParams = {};
        if (firstName) updateParams.firstName = firstName;
        if (lastName) updateParams.lastName = lastName;

        const privateDataUpdate = {
          stripeDataSource: true,
          stripeDataUpdatePending: false, // Mark as completed
        };

        if (phoneNumber) privateDataUpdate.phoneNumber = phoneNumber;
        if (Object.keys(addressInfo).length > 0) privateDataUpdate.address = addressInfo;
        if (dateOfBirth) privateDataUpdate.dateOfBirth = dateOfBirth;
        if (taxId) privateDataUpdate.taxId = taxId;
        if (vatNumber) privateDataUpdate.vatNumber = vatNumber;
        if (companyName) privateDataUpdate.companyName = companyName;

        updateParams.privateData = privateDataUpdate;

        console.log('📝 Updating user with Stripe data:', updateParams);
        await onUpdateProfile(updateParams);
        console.log('✅ User profile updated successfully with Stripe data');

        // Verify email if there was a pending token
        const pendingToken = sessionStorage.getItem(PENDING_VERIFICATION_TOKEN_KEY);
        if (pendingToken) {
          console.log('📧 Found pending verification token, verifying email now...');
          try {
            await onVerifyEmail(pendingToken);
            sessionStorage.removeItem(PENDING_VERIFICATION_TOKEN_KEY);
            console.log('✅ Email verified successfully');
          } catch (verifyErr) {
            console.error('❌ Failed to verify email:', verifyErr);
          }
        }
      } catch (err) {
        console.error('❌ Failed to update user with Stripe data:', err);
      }
    };

    if (stripeUpdateAttempted && stripeAccountFetched && stripeAccount) {
      updateUserWithStripeData();
    }
  }, [stripeUpdateAttempted, stripeAccountFetched, stripeAccount, onUpdateProfile, onVerifyEmail]);

  useEffect(() => {
    // Check if we have email verification status from redirect
    if (location?.state?.emailVerification) {
      const { emailVerification, userName, userEmail } = location.state;

      let title = '';
      let message = '';
      let type = 'success';

      if (emailVerification === 'success') {
        title = intl.formatMessage(
          { id: 'EmailVerificationForm.successTitle' },
          { name: userName }
        );
        message = intl.formatMessage({ id: 'EmailVerificationForm.successText' });
        type = 'success';
      } else if (emailVerification === 'no-pending') {
        title = intl.formatMessage(
          { id: 'EmailVerificationForm.noPendingTitle' },
          { name: userName }
        );
        message = intl.formatMessage(
          { id: 'EmailVerificationForm.noPendingText' },
          { email: userEmail }
        );
        type = 'info';
      } else if (emailVerification === 'error') {
        title = intl.formatMessage({ id: 'EmailVerificationForm.verificationFailed' });
        message = '';
        type = 'error';
      }

      setNotificationTitle(title);
      setNotificationMessage(message);
      setNotificationType(type);

      // Clear the location state to prevent showing the notification on refresh
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, intl]);

  const handleNotificationClose = () => {
    setNotificationTitle(null);
    setNotificationMessage(null);
  };

  return (
    <>
      <NotificationBanner
        title={notificationTitle}
        message={notificationMessage}
        type={notificationType}
        duration={5000}
        onClose={handleNotificationClose}
      />
      <PageBuilder
        pageAssetsData={pageAssetsData?.[camelize(ASSET_NAME)]?.data}
        inProgress={inProgress}
        error={error}
        fallbackPage={<FallbackPage error={error} />}
      />
    </>
  );
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
  location: object,
  currentUser: propTypes.currentUser,
  stripeAccount: object,
  stripeAccountFetched: bool,
  onFetchStripeAccount: func.isRequired,
  onUpdateProfile: func.isRequired,
  onVerifyEmail: func.isRequired,
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  const { currentUser } = state.user;
  const { stripeAccount, stripeAccountFetched } = state.stripeConnectAccount;
  return { 
    pageAssetsData, 
    inProgress, 
    error,
    currentUser,
    stripeAccount,
    stripeAccountFetched,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchStripeAccount: () => dispatch(fetchStripeAccount()),
  onUpdateProfile: params => dispatch(updateProfile(params)),
  onVerifyEmail: token => dispatch(verifyEmail(token)),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(LandingPageComponent);

export default LandingPage;
