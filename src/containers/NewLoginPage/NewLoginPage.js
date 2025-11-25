import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';

import { login, authenticationInProgress } from '../../ducks/auth.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, Form, PrimaryButton, FieldTextInput, NamedLink, IconSpinner } from '../../components';

import logoImage from '../../assets/logo.png';
import css from './NewLoginPage.module.css';

/**
 * NewLoginPage - A modern, Webflow-inspired login page
 */
export const NewLoginPageComponent = props => {
  const {
    authInProgress,
    currentUser,
    isAuthenticated,
    location,
    loginError,
    scrollingDisabled,
    submitLogin,
  } = props;

  const config = useConfiguration();
  const intl = useIntl();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, []);

  const user = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!user.id;

  // Get redirect location from state
  const from = location.state?.from || null;

  // Redirect if already authenticated
  const shouldRedirectToFrom = isAuthenticated && from;
  const shouldRedirectToLandingPage = isAuthenticated && currentUserLoaded;

  if (!mounted && shouldRedirectToLandingPage) {
    return (
      <Page
        title={intl.formatMessage({ id: 'NewLoginPage.title' })}
        scrollingDisabled={scrollingDisabled}
      >
        <div className={css.spinnerContainer}>
          <IconSpinner />
        </div>
      </Page>
    );
  }

  if (shouldRedirectToFrom) {
    return <Redirect to={from} />;
  } else if (shouldRedirectToLandingPage) {
    return <Redirect to="/" />;
  }

  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage(
    { id: 'NewLoginPage.schemaTitle' },
    { marketplaceName }
  );

  const handleSubmit = values => {
    const { email, password } = values;
    submitLogin({ email, password });
  };

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

        {/* Right side - Login form */}
        <div className={css.rightSide}>
          <div className={css.formContainer}>
            <div className={css.formWrapper}>
              {/* Logo at the top */}
              <div className={css.logoContainer}>
                <img src={logoImage} alt={marketplaceName} className={css.logo} />
              </div>
              <h2 className={css.formTitle}>
                <FormattedMessage id="NewLoginPage.loginTitle" />
              </h2>
              <p className={css.formSubtitle}>
                <FormattedMessage id="NewLoginPage.loginSubtitle" />
              </p>

              {loginError && (
                <div className={css.error}>
                  <FormattedMessage id="NewLoginPage.loginFailed" />
                </div>
              )}

              <FinalForm
                onSubmit={handleSubmit}
                render={({ handleSubmit, invalid, pristine }) => {
                  const emailLabel = intl.formatMessage({
                    id: 'NewLoginPage.emailLabel',
                  });
                  const emailPlaceholder = intl.formatMessage({
                    id: 'NewLoginPage.emailPlaceholder',
                  });
                  const emailRequiredMessage = intl.formatMessage({
                    id: 'NewLoginPage.emailRequired',
                  });
                  const emailRequired = validators.required(emailRequiredMessage);
                  const emailInvalidMessage = intl.formatMessage({
                    id: 'NewLoginPage.emailInvalid',
                  });
                  const emailValid = validators.emailFormatValid(emailInvalidMessage);

                  const passwordLabel = intl.formatMessage({
                    id: 'NewLoginPage.passwordLabel',
                  });
                  const passwordPlaceholder = intl.formatMessage({
                    id: 'NewLoginPage.passwordPlaceholder',
                  });
                  const passwordRequiredMessage = intl.formatMessage({
                    id: 'NewLoginPage.passwordRequired',
                  });
                  const passwordRequired = validators.requiredStringNoTrim(passwordRequiredMessage);

                  const submitInProgress = authInProgress;
                  const submitDisabled = invalid || submitInProgress;

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
                      />

                      <FieldTextInput
                        className={css.field}
                        type="password"
                        id="password"
                        name="password"
                        autoComplete="current-password"
                        label={passwordLabel}
                        placeholder={passwordPlaceholder}
                        validate={passwordRequired}
                      />

                      <div className={css.forgotPasswordContainer}>
                        <NamedLink
                          name="PasswordRecoveryPage"
                          className={css.forgotPasswordLink}
                        >
                          <FormattedMessage id="NewLoginPage.forgotPassword" />
                        </NamedLink>
                      </div>

                      <PrimaryButton
                        className={css.submitButton}
                        type="submit"
                        inProgress={submitInProgress}
                        disabled={submitDisabled}
                      >
                        <FormattedMessage id="NewLoginPage.logIn" />
                      </PrimaryButton>
                    </Form>
                  );
                }}
              />

              {/* Sign up and back links without dividers */}
              <div className={css.signupContainer}>
                <span className={css.signupText}>
                  <FormattedMessage id="NewLoginPage.dontHaveAccount" />
                </span>
                <NamedLink name="SignupPage" className={css.signupLink}>
                  <FormattedMessage id="NewLoginPage.signUp" />
                </NamedLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

const mapStateToProps = state => {
  const { isAuthenticated, loginError } = state.auth;
  const { currentUser } = state.user;

  return {
    authInProgress: authenticationInProgress(state),
    currentUser,
    isAuthenticated,
    loginError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  submitLogin: ({ email, password }) => dispatch(login(email, password)),
});

const NewLoginPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(NewLoginPageComponent);

export default NewLoginPage;
