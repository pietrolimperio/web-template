import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Form as FinalForm } from 'react-final-form';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { propTypes } from '../../util/types';
import { isPasswordRecoveryEmailNotFoundError } from '../../util/errors';

import { Page, Form, PrimaryButton, FieldTextInput, NamedLink, IconKeys } from '../../components';

import logoImage from '../../assets/logo.png';

import {
  recoverPassword,
  retypePasswordRecoveryEmail,
  clearPasswordRecoveryError,
} from './PasswordRecoveryPage.duck';
import css from './PasswordRecoveryPage.module.css';

/**
 * PasswordRecoveryPage - Modern password recovery page with the same layout as NewLoginPage
 */
export const PasswordRecoveryPageComponent = props => {
  const {
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
    scrollingDisabled,
    onChange,
    onSubmitEmail,
    onRetypeEmail,
  } = props;

  const config = useConfiguration();
  const intl = useIntl();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email');
  const emailToUse = emailParam || initialEmail;
  const alreadyRequested = submittedEmail || passwordRequested;

  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage({ id: 'PasswordRecoveryPage.title' }, { marketplaceName });

  const handleSubmit = values => {
    onSubmitEmail(values.email);
  };

  // Email submission form
  const renderPasswordRecoveryForm = () => {
    const emailLabel = intl.formatMessage({
      id: 'PasswordRecoveryForm.emailLabel',
    });
    const emailPlaceholder = intl.formatMessage({
      id: 'PasswordRecoveryForm.emailPlaceholder',
    });
    const emailRequiredMessage = intl.formatMessage({
      id: 'PasswordRecoveryForm.emailRequired',
    });
    const emailNotFoundMessage = intl.formatMessage({
      id: 'PasswordRecoveryForm.emailNotFound',
    });
    const emailInvalidMessage = intl.formatMessage({
      id: 'PasswordRecoveryForm.emailInvalid',
    });

    const emailRequired = validators.required(emailRequiredMessage);
    const emailValid = validators.emailFormatValid(emailInvalidMessage);

    // In case a given email is not found, pass a custom error message
    const customErrorText = isPasswordRecoveryEmailNotFoundError(recoveryError)
      ? emailNotFoundMessage
      : null;

    return (
      <div className={css.contentWrapper}>
        <IconKeys className={css.iconKeys} />
        <h2 className={css.formTitle}>
          <FormattedMessage id="PasswordRecoveryPage.forgotPasswordTitle" />
        </h2>
        <p className={css.formSubtitle}>
          <FormattedMessage id="PasswordRecoveryPage.forgotPasswordMessage" />
        </p>

        {recoveryError && !isPasswordRecoveryEmailNotFoundError(recoveryError) && (
          <div className={css.error}>
            <FormattedMessage id="PasswordRecoveryPage.actionFailedMessage" />
          </div>
        )}

        <FinalForm
          onSubmit={handleSubmit}
          initialValues={{ email: emailToUse }}
          render={({ handleSubmit, invalid, pristine, values }) => {
            const submitDisabled = invalid || recoveryInProgress;

            return (
              <Form className={css.form} onSubmit={handleSubmit}>
                <FieldTextInput
                  className={css.field}
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  label={emailLabel}
                  placeholder={emailPlaceholder}
                  validate={validators.composeValidators(emailRequired, emailValid)}
                  customErrorText={customErrorText}
                />

                <PrimaryButton
                  className={css.submitButton}
                  type="submit"
                  inProgress={recoveryInProgress}
                  disabled={submitDisabled}
                >
                  <FormattedMessage id="PasswordRecoveryForm.sendInstructions" />
                </PrimaryButton>

                <div className={css.loginContainer}>
                  <NamedLink name="LoginPage" className={css.loginLink}>
                    <FormattedMessage id="PasswordRecoveryForm.loginLinkText" />
                  </NamedLink>
                </div>
              </Form>
            );
          }}
        />
      </div>
    );
  };

  // Email submitted success screen
  const renderEmailSubmittedContent = () => {
    const submittedEmailText = (
      <span className={css.emailHighlight}>
        {passwordRequested ? initialEmail : submittedEmail}
      </span>
    );

    const resendEmailLink = (
      <button
        type="button"
        className={css.helperLink}
        onClick={() => onSubmitEmail(submittedEmail)}
        disabled={recoveryInProgress}
      >
        <FormattedMessage id="PasswordRecoveryPage.resendEmailLinkText" />
      </button>
    );

    const fixEmailLink = (
      <button type="button" className={css.helperLink} onClick={onRetypeEmail}>
        <FormattedMessage id="PasswordRecoveryPage.fixEmailLinkText" />
      </button>
    );

    return (
      <div className={css.contentWrapper}>
        <IconKeys className={css.iconKeys} />
        <h2 className={css.formTitle}>
          <FormattedMessage id="PasswordRecoveryPage.emailSubmittedTitle" />
        </h2>
        <p className={css.formSubtitle}>
          <FormattedMessage
            id="PasswordRecoveryPage.emailSubmittedMessage"
            values={{ submittedEmailText }}
          />
        </p>

        <div className={css.helpTextContainer}>
          <p className={css.helpText}>
            {recoveryInProgress ? (
              <FormattedMessage id="PasswordRecoveryPage.resendingEmailInfo" />
            ) : (
              <FormattedMessage
                id="PasswordRecoveryPage.resendEmailInfo"
                values={{ resendEmailLink }}
              />
            )}
          </p>
          <p className={css.helpText}>
            <FormattedMessage id="PasswordRecoveryPage.fixEmailInfo" values={{ fixEmailLink }} />
          </p>
        </div>

        <div className={css.loginContainer}>
          <NamedLink name="LoginPage" className={css.loginLink}>
            <FormattedMessage id="PasswordRecoveryForm.loginLinkText" />
          </NamedLink>
        </div>
      </div>
    );
  };

  // Generic error screen
  const renderGenericError = () => {
    return (
      <div className={css.contentWrapper}>
        <IconKeys className={css.iconKeys} />
        <h2 className={css.formTitle}>
          <FormattedMessage id="PasswordRecoveryPage.actionFailedTitle" />
        </h2>
        <p className={css.formSubtitle}>
          <FormattedMessage id="PasswordRecoveryPage.actionFailedMessage" />
        </p>

        <div className={css.loginContainer}>
          <NamedLink name="LoginPage" className={css.loginLink}>
            <FormattedMessage id="PasswordRecoveryForm.loginLinkText" />
          </NamedLink>
        </div>
      </div>
    );
  };

  // Determine which content to show
  let content;
  if (isPasswordRecoveryEmailNotFoundError(recoveryError)) {
    content = renderPasswordRecoveryForm();
  } else if (recoveryError) {
    content = renderGenericError();
  } else if (alreadyRequested) {
    content = renderEmailSubmittedContent();
  } else {
    content = renderPasswordRecoveryForm();
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
        {/* Left side - Background image only */}
        <div className={css.leftSide}></div>

        {/* Right side - Password recovery content */}
        <div className={css.rightSide}>
          <div className={css.formContainer}>
            <div className={css.formWrapper}>
              {/* Logo at the top */}
              <div className={css.logoContainer}>
                <img src={logoImage} alt={marketplaceName} className={css.logo} />
              </div>

              {content}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

const mapStateToProps = state => {
  const {
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
  } = state.PasswordRecoveryPage;
  return {
    initialEmail,
    submittedEmail,
    recoveryError,
    recoveryInProgress,
    passwordRequested,
    scrollingDisabled: false,
  };
};

const mapDispatchToProps = dispatch => ({
  onChange: () => dispatch(clearPasswordRecoveryError()),
  onSubmitEmail: email => dispatch(recoverPassword(email)),
  onRetypeEmail: () => dispatch(retypePasswordRecoveryEmail()),
});

const PasswordRecoveryPage = compose(connect(mapStateToProps, mapDispatchToProps))(
  PasswordRecoveryPageComponent
);

export default PasswordRecoveryPage;
