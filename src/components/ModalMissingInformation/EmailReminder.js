import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { isTooManyEmailVerificationRequestsError } from '../../util/errors';
import { IconEmailAttention, InlineTextButton, NamedLink, PrimaryButton } from '../../components';

import css from './ModalMissingInformation.module.css';

// One-shot flag to allow automatic redirect to Stripe exactly once (consumed in NewSignupStripePage)
const AUTO_STRIPE_REDIRECT_ONCE_KEY = 'autoStripeRedirectOnce';

const EmailReminder = props => {
  const {
    className,
    user,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    onResendVerificationEmail,
  } = props;

  const email = user.id ? <span className={css.email}>{user.attributes.email}</span> : '';
  const pendingStripeOnboarding = user?.attributes?.profile?.privateData?.pendingStripeOnboarding === true;

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.helperLink} onClick={onResendVerificationEmail}>
      <FormattedMessage id="ModalMissingInformation.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <NamedLink className={css.helperLink} name="ContactDetailsPage">
      <FormattedMessage id="ModalMissingInformation.fixEmailLinkText" />
    </NamedLink>
  );

  const resendErrorTranslationId = isTooManyEmailVerificationRequestsError(
    sendVerificationEmailError
  )
    ? 'ModalMissingInformation.resendFailedTooManyRequests'
    : 'ModalMissingInformation.resendFailed';
  const resendErrorMessage = sendVerificationEmailError ? (
    <p className={css.error}>
      <FormattedMessage id={resendErrorTranslationId} />
    </p>
  ) : null;

  const titleId = pendingStripeOnboarding
    ? 'ModalMissingInformation.completeStripeTitle'
    : 'ModalMissingInformation.verifyEmailTitle';

  const textId = pendingStripeOnboarding
    ? 'ModalMissingInformation.completeStripeText'
    : 'ModalMissingInformation.verifyEmailText';

  return (
    <div className={className}>
      <IconEmailAttention className={css.modalIcon} />
      <p className={css.modalTitle}>
        <FormattedMessage id={titleId} />
      </p>
      <p className={css.modalMessage}>
        <FormattedMessage id={textId} />
      </p>
      {pendingStripeOnboarding ? (
        <p className={css.modalMessage}>
          <FormattedMessage id="ModalMissingInformation.completeStripePayoutsNote" />
        </p>
      ) : (
        <p className={css.modalMessage}>
          <FormattedMessage id="ModalMissingInformation.checkInbox" values={{ email }} />
        </p>
      )}
      {resendErrorMessage}

      {pendingStripeOnboarding ? null : (
        <div className={css.bottomWrapper}>
          <p className={css.helperText}>
            {sendVerificationEmailInProgress ? (
              <FormattedMessage id="ModalMissingInformation.sendingEmail" />
            ) : (
              <FormattedMessage
                id="ModalMissingInformation.resendEmail"
                values={{ resendEmailLink }}
              />
            )}
          </p>
          <p className={css.helperText}>
            <FormattedMessage id="ModalMissingInformation.fixEmail" values={{ fixEmailLink }} />
          </p>
        </div>
      )}

      {/* CTA Buttons */}
      <div className={css.ctaButtons}>
        <NamedLink name="LandingPage" className={css.ctaButtonSecondary}>
          <FormattedMessage id="ModalMissingInformation.backToHome" />
        </NamedLink>

        {pendingStripeOnboarding ? (
          <NamedLink
            name="SignupPage"
            state={{ completeStripeOnboarding: true }}
            className={css.ctaButtonPrimary}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(AUTO_STRIPE_REDIRECT_ONCE_KEY, '1');
              }
            }}
          >
            <FormattedMessage id="ModalMissingInformation.completeStripeCta" />
          </NamedLink>
        ) : (
          <PrimaryButton
            onClick={() => window.location.reload()}
            className={css.ctaButtonPrimary}
          >
            <FormattedMessage id="ModalMissingInformation.reload" />
          </PrimaryButton>
        )}
      </div>
    </div>
  );
};

export default EmailReminder;
