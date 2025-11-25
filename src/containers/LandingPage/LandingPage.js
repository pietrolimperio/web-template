import React, { useState, useEffect } from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';
import { useIntl } from '../../util/reactIntl';

import { NotificationBanner } from '../../components';
import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error, location } = props;
  const intl = useIntl();
  const [notificationTitle, setNotificationTitle] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState(null);
  const [notificationType, setNotificationType] = useState('success');

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
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  return { pageAssetsData, inProgress, error };
};

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(
  withRouter,
  connect(mapStateToProps)
)(LandingPageComponent);

export default LandingPage;
