import React, { Component } from 'react';
import classNames from 'classnames';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';

import { FormattedMessage } from '../../util/reactIntl';
import { ensureCurrentUser } from '../../util/data';
import { isUserAuthorized } from '../../util/userHelpers';
import { pathByRouteName } from '../../util/routes';

import { Modal } from '../../components';

import EmailReminder from './EmailReminder';
import css from './ModalMissingInformation.module.css';

const MISSING_INFORMATION_MODAL_WHITELIST = [
  'LoginPage',
  'SignupPage',
  'ContactDetailsPage',
  'EmailVerificationPage',
  'PasswordResetPage',
  'StripePayoutPage',
];

const EMAIL_VERIFICATION = 'EMAIL_VERIFICATION';

class ModalMissingInformation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showMissingInformationReminder: null,
      hasSeenMissingInformationReminder: false,
    };
    this.handleMissingInformationReminder = this.handleMissingInformationReminder.bind(this);
  }

  componentDidMount() {
    const { currentUser, currentUserHasListings, currentUserHasOrders, location } = this.props;
    const user = ensureCurrentUser(currentUser);
    this.handleMissingInformationReminder(
      user,
      currentUserHasListings,
      currentUserHasOrders,
      location
    );
  }

  componentDidUpdate(prevProps) {
    const { currentUser, currentUserHasListings, currentUserHasOrders, location } = this.props;
    
    // Only run if relevant props have changed
    const locationChanged = location.pathname !== prevProps.location?.pathname;
    const userChanged = currentUser !== prevProps.currentUser;
    const listingsChanged = currentUserHasListings !== prevProps.currentUserHasListings;
    const ordersChanged = currentUserHasOrders !== prevProps.currentUserHasOrders;
    
    // Check if email verification status changed
    const prevUser = ensureCurrentUser(prevProps.currentUser);
    const currentUserObj = ensureCurrentUser(currentUser);
    const emailVerificationChanged = 
      prevUser.attributes?.emailVerified !== currentUserObj.attributes?.emailVerified;
    
    if (locationChanged || userChanged || listingsChanged || ordersChanged || emailVerificationChanged) {
      this.handleMissingInformationReminder(
        currentUserObj,
        currentUserHasListings,
        currentUserHasOrders,
        location
      );
    }
  }

  handleMissingInformationReminder(
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    newLocation
  ) {
    const routes = this.props.routeConfiguration;
    const whitelistedPaths = MISSING_INFORMATION_MODAL_WHITELIST.map(page =>
      pathByRouteName(page, routes)
    );

    // Is the current page whitelisted?
    const isPageWhitelisted = whitelistedPaths.includes(newLocation.pathname);

    // Check if user is on the AI listing creation page
    const isCreatingListing = newLocation.pathname === '/l/create';
    
    // Track if path changes inside Page level component
    const pathChanged = newLocation.pathname !== this.props.location.pathname;
    const notRemindedYet =
      !this.state.showMissingInformationReminder && !this.state.hasSeenMissingInformationReminder;

    // Is the reminder already shown on current page
    // For /create page, always show if needed (ignore hasSeenMissingInformationReminder)
    const showOnPathChange = isCreatingListing || notRemindedYet || pathChanged;

    if (!isPageWhitelisted && showOnPathChange) {
      // Emails are sent when order is initiated
      // Customer is likely to get email soon when she books something
      // Provider email should work - she should get an email when someone books a listing
      const hasOrders = currentUserHasOrders === true;
      const hasListingsOrOrders = currentUserHasListings || hasOrders;

      const emailUnverified = !!currentUser.id && !currentUser.attributes.emailVerified;
      
      // Show reminder if user has listings/orders OR is trying to create a new listing
      const emailVerificationNeeded = (hasListingsOrOrders || isCreatingListing) && emailUnverified;

      // Show reminder
      if (emailVerificationNeeded) {
        // Always show and reset "seen" flag when on /create page
        if (isCreatingListing) {
          if (this.state.showMissingInformationReminder !== EMAIL_VERIFICATION || 
              this.state.hasSeenMissingInformationReminder !== false) {
            this.setState({ 
              showMissingInformationReminder: EMAIL_VERIFICATION,
              hasSeenMissingInformationReminder: false
            });
          }
        } else if (this.state.showMissingInformationReminder !== EMAIL_VERIFICATION) {
          // Only update if not already showing
          this.setState({ 
            showMissingInformationReminder: EMAIL_VERIFICATION
          });
        }
      } else if (!emailVerificationNeeded && this.state.showMissingInformationReminder) {
        // Clear modal if email is now verified
        this.setState({ showMissingInformationReminder: null });
      }
    } else if (!isPageWhitelisted && isCreatingListing && this.state.showMissingInformationReminder !== EMAIL_VERIFICATION) {
      // Additional check: if on /create page and modal not showing, check if it should be
      const emailUnverified = !!currentUser.id && !currentUser.attributes.emailVerified;
      if (emailUnverified) {
        this.setState({ 
          showMissingInformationReminder: EMAIL_VERIFICATION,
          hasSeenMissingInformationReminder: false
        });
      }
    }
  }

  render() {
    const {
      rootClassName,
      className,
      containerClassName,
      currentUser,
      sendVerificationEmailInProgress,
      sendVerificationEmailError,
      onManageDisableScrolling,
      onResendVerificationEmail,
      location,
    } = this.props;

    const user = ensureCurrentUser(currentUser);
    const classes = classNames(rootClassName || css.root, className);

    let content = null;

    const currentUserLoaded = user && user.id;
    
    // Check if user is on the AI listing creation page - modal should be non-closable there
    const isCreatingListing = location?.pathname === '/l/create';
    const emailUnverified = currentUserLoaded && !user.attributes.emailVerified;
    
    // Force show modal on /create page if email is not verified
    const shouldShowModal = this.state.showMissingInformationReminder === EMAIL_VERIFICATION ||
                           (isCreatingListing && emailUnverified);
    
    if (currentUserLoaded && isUserAuthorized(currentUser)) {
      if (shouldShowModal) {
        content = (
          <EmailReminder
            className={classes}
            user={user}
            onResendVerificationEmail={onResendVerificationEmail}
            sendVerificationEmailInProgress={sendVerificationEmailInProgress}
            sendVerificationEmailError={sendVerificationEmailError}
          />
        );
      }
    }
    
    const closeButtonMessage = !isCreatingListing ? (
      <FormattedMessage id="ModalMissingInformation.closeVerifyEmailReminder" />
    ) : null;

    return (
      <Modal
        id="MissingInformationReminder"
        containerClassName={containerClassName}
        isOpen={shouldShowModal}
        onClose={
          isCreatingListing
            ? () => {} // Non-closable on /create page
            : () => {
                this.setState({
                  showMissingInformationReminder: null,
                  hasSeenMissingInformationReminder: true,
                });
              }
        }
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        closeButtonMessage={closeButtonMessage}
      >
        {content}
      </Modal>
    );
  }
}

/**
 * Modal that tells user that they have not saved all the information the service needs.
 * This is used to remind user that they need to verify their email address.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.containerClassName overwrite components own css.container
 * @param {string} props.id
 * @param {Object} props.currentUser API entity
 * @param {Function} props.onManageDisableScrolling
 * @param {Object?} props.sendVerificationEmailError
 * @param {boolean} props.sendVerificationEmailInProgress
 * @returns {JSX.Element} Modal element if user needs to be reminded
 */
const EnhancedModalMissingInformation = props => {
  const routeConfiguration = useRouteConfiguration();

  return <ModalMissingInformation routeConfiguration={routeConfiguration} {...props} />;
};

export default EnhancedModalMissingInformation;
