import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Form as FinalForm } from 'react-final-form';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { propTypes } from '../../util/types';
import { parse } from '../../util/urlHelpers';

import { Page, Form, PrimaryButton, FieldTextInput, NamedLink, IconKeys, IconKeysSuccess } from '../../components';

import logoImage from '../../assets/logo.png';

import { resetPassword } from './PasswordResetPage.duck';
import css from './PasswordResetPage.module.css';

const parseUrlParams = location => {
  const params = parse(location.search);
  const { t: token, e: email } = params;
  return { token, email };
};

/**
 * PasswordResetPage - Modern password reset page with the same layout as NewLoginPage
 */
export const PasswordResetPageComponent = props => {
  const [state, setState] = useState({ newPasswordSubmitted: false });
  const [mounted, setMounted] = useState(false);

  const config = useConfiguration();
  const intl = useIntl();

  const {
    scrollingDisabled,
    location,
    resetPasswordInProgress,
    resetPasswordError,
    onSubmitPassword,
  } = props;

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  const { token, email } = parseUrlParams(location);
  const hasParams = !!(token && email);
  const isPasswordSubmitted = state.newPasswordSubmitted && !resetPasswordError;

  const handleSubmit = values => {
    const { password } = values;
    setState({ newPasswordSubmitted: false });
    onSubmitPassword(email, token, password).then(() => {
      setState({ newPasswordSubmitted: true });
    });
  };

  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage(
    { id: 'PasswordResetPage.title' },
    { marketplaceName }
  );

  // Invalid URL params content
  const renderParamsMissingContent = () => {
    const recoveryLink = (
      <NamedLink name="PasswordRecoveryPage" className={css.recoveryLink}>
        <FormattedMessage id="PasswordResetPage.recoveryLinkText" />
      </NamedLink>
    );

    return (
      <div className={css.contentWrapper}>
        <IconKeys className={css.iconKeys} />
        <h2 className={css.formTitle}>
          <FormattedMessage id="PasswordResetPage.invalidUrlTitle" />
        </h2>
        <p className={css.formSubtitle}>
          <FormattedMessage id="PasswordResetPage.invalidUrlParams" values={{ recoveryLink }} />
        </p>

        <div className={css.loginContainer}>
          <NamedLink name="LoginPage" className={css.loginLink}>
            <FormattedMessage id="PasswordResetPage.backToLogin" />
          </NamedLink>
        </div>
      </div>
    );
  };

  // Password reset form
  const renderResetFormContent = () => {
    const passwordLabel = intl.formatMessage({
      id: 'PasswordResetForm.passwordLabel',
    });
    const passwordPlaceholder = intl.formatMessage({
      id: 'PasswordResetForm.passwordPlaceholder',
    });
    const passwordRequiredMessage = intl.formatMessage({
      id: 'PasswordResetForm.passwordRequired',
    });
    const passwordMinLengthMessage = intl.formatMessage(
      {
        id: 'PasswordResetForm.passwordTooShort',
      },
      {
        minLength: validators.PASSWORD_MIN_LENGTH,
      }
    );
    const passwordMaxLengthMessage = intl.formatMessage(
      {
        id: 'PasswordResetForm.passwordTooLong',
      },
      {
        maxLength: validators.PASSWORD_MAX_LENGTH,
      }
    );

    const passwordRequired = validators.requiredStringNoTrim(passwordRequiredMessage);
    const passwordMinLength = validators.minLength(
      passwordMinLengthMessage,
      validators.PASSWORD_MIN_LENGTH
    );
    const passwordMaxLength = validators.maxLength(
      passwordMaxLengthMessage,
      validators.PASSWORD_MAX_LENGTH
    );

    return (
      <div className={css.contentWrapper}>
        <IconKeys className={css.iconKeys} />
        <h2 className={css.formTitle}>
          <FormattedMessage id="PasswordResetPage.mainHeading" />
        </h2>
        <p className={css.formSubtitle}>
          <FormattedMessage id="PasswordResetPage.helpText" />
        </p>

        {resetPasswordError && (
          <div className={css.error}>
            <FormattedMessage id="PasswordResetPage.resetFailed" />
          </div>
        )}

        <FinalForm
          onSubmit={handleSubmit}
          render={({ handleSubmit, invalid }) => {
            const submitDisabled = invalid || resetPasswordInProgress;

            return (
              <Form className={css.form} onSubmit={handleSubmit}>
                <FieldTextInput
                  className={css.field}
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  label={passwordLabel}
                  placeholder={passwordPlaceholder}
                  validate={validators.composeValidators(
                    passwordRequired,
                    passwordMinLength,
                    passwordMaxLength
                  )}
                />

                <PrimaryButton
                  className={css.submitButton}
                  type="submit"
                  inProgress={resetPasswordInProgress}
                  disabled={submitDisabled}
                >
                  <FormattedMessage id="PasswordResetForm.submitButtonText" />
                </PrimaryButton>
              </Form>
            );
          }}
        />
      </div>
    );
  };

  // Success screen
  const renderResetDoneContent = () => {
    return (
      <div className={css.contentWrapper}>
        <IconKeysSuccess className={css.iconKeysSuccess} />
        <h2 className={css.formTitle}>
          <FormattedMessage id="PasswordResetPage.passwordChangedHeading" />
        </h2>
        <p className={css.formSubtitle}>
          <FormattedMessage id="PasswordResetPage.passwordChangedHelpText" />
        </p>

        <NamedLink name="LoginPage" className={css.submitButton}>
          <FormattedMessage id="PasswordResetPage.loginButtonText" />
        </NamedLink>
      </div>
    );
  };

  // Determine which content to show
  let content;
  if (!hasParams) {
    content = renderParamsMissingContent();
  } else if (isPasswordSubmitted) {
    content = renderResetDoneContent();
  } else {
    content = renderResetFormContent();
  }

  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      referrer="origin"
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
      }}
    >
      <div className={css.root}>
        {/* Left side - Background image only */}
        <div className={css.leftSide}></div>

        {/* Right side - Password reset content */}
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
  const { resetPasswordInProgress, resetPasswordError } = state.PasswordResetPage;
  return {
    scrollingDisabled: false,
    resetPasswordInProgress,
    resetPasswordError,
  };
};

const mapDispatchToProps = dispatch => ({
  onSubmitPassword: (email, token, password) => dispatch(resetPassword(email, token, password)),
});

const PasswordResetPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(PasswordResetPageComponent);

export default PasswordResetPage;
