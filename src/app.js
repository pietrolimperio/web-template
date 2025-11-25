import React from 'react';
import { any, string } from 'prop-types';

import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, StaticRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import loadable from '@loadable/component';
import difference from 'lodash/difference';
import mapValues from 'lodash/mapValues';
import moment from 'moment';

// Configs and store setup
import defaultConfig from './config/configDefault';
import appSettings from './config/settings';
import configureStore from './store';

// utils
import { RouteConfigurationProvider } from './context/routeConfigurationContext';
import { ConfigurationProvider } from './context/configurationContext';
import { mergeConfig } from './util/configHelpers';
import { IntlProvider } from './util/reactIntl';
import { includeCSSProperties } from './util/style';
import { IncludeScripts } from './util/includeScripts';

import { MaintenanceMode } from './components';

// routing
import routeConfiguration from './routing/routeConfiguration';
import Routes from './routing/Routes';

// Sharetribe Web Template uses English translations as default translations.
import defaultMessages from './translations/en.json';

// Multi-language support: Dynamic translation loading based on user's locale
import { DEFAULT_LOCALE, TRANSLATION_FILE_MAP } from './config/localeConfig';

// Import all translation files dynamically
import itMessages from './translations/it.json';
import frMessages from './translations/fr.json';
import esMessages from './translations/es.json';
import deMessages from './translations/de.json';
import ptMessages from './translations/pt.json';
import enMessages from './translations/en.json';

// Translation file registry
const TRANSLATION_FILES = {
  it: itMessages,
  fr: frMessages,
  es: esMessages,
  de: deMessages,
  pt: ptMessages,
  en: enMessages,
};

/**
 * Get current locale from localStorage (default: it-IT)
 * Falls back to DEFAULT_LOCALE (it-IT) if not set
 * Safe for server-side rendering: checks if localStorage is available
 */
const getCurrentLocale = () => {
  // Check if we're in a browser environment (localStorage is not available in Node.js)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
  }
  // Server-side rendering: return default locale
  return DEFAULT_LOCALE;
};

/**
 * Load appropriate translation file based on current locale
 * Maps locale codes to translation files: it-IT → it.json, ch-FR → fr.json, etc.
 */
const loadTranslations = () => {
  const currentLocale = getCurrentLocale();
  const translationFileName = TRANSLATION_FILE_MAP[currentLocale];

  // Get translation file (defaults to English if not found)
  const messagesInLocale = TRANSLATION_FILES[translationFileName] || TRANSLATION_FILES.en;

  console.info(
    `Loading translations for locale: ${currentLocale} (file: ${translationFileName}.json)`
  );

  return messagesInLocale;
};

// Load translations based on current locale
const messagesInLocale = loadTranslations();

// If translation key is missing from `messagesInLocale` (e.g. fr.json),
// corresponding key will be added to messages from `defaultMessages` (en.json)
// to prevent missing translation key errors.
const addMissingTranslations = (sourceLangTranslations, targetLangTranslations) => {
  const sourceKeys = Object.keys(sourceLangTranslations);
  const targetKeys = Object.keys(targetLangTranslations);

  // if there's no translations defined for target language, return source translations
  if (targetKeys.length === 0) {
    return sourceLangTranslations;
  }
  const missingKeys = difference(sourceKeys, targetKeys);

  const addMissingTranslation = (translations, missingKey) => ({
    ...translations,
    [missingKey]: sourceLangTranslations[missingKey],
  });

  return missingKeys.reduce(addMissingTranslation, targetLangTranslations);
};

/**
 * Apply locale-specific translation fallbacks with proper priority
 *
 * NEW APPROACH (per user requirements):
 * - Console UI (hostedTranslations) contains keys with _{{lang}} suffix: e.g., "TopbarDesktop.createListing_it"
 * - JSON files (localeMessages) contain keys WITHOUT suffix: e.g., "TopbarDesktop.createListing"
 *
 * For a given key like "TopbarDesktop.createListing" and locale "it-IT":
 * 1. First: Check if "TopbarDesktop.createListing_it" exists in hostedTranslations (Console)
 * 2. Second fallback: Use "TopbarDesktop.createListing" from localeMessages (JSON file)
 *
 * This allows:
 * - All Italian translations in Console as "key_it"
 * - Some frequently changed translations in Console for other languages as "key_es", "key_fr", etc.
 * - Static translations in JSON files without suffix as fallback
 *
 * @param {Object} hostedTranslations - Translations from Console UI (with _{{lang}} suffix)
 * @param {Object} localeMessages - Translations from JSON files (without suffix)
 * @returns {Object} Final messages object with proper fallbacks
 */
const applyLocaleSpecificFallbacks = (hostedTranslations, localeMessages) => {
  const currentLocale = getCurrentLocale();
  const languageCode = TRANSLATION_FILE_MAP[currentLocale] || 'en';

  // Start with messages from JSON files
  const processedMessages = { ...localeMessages };

  // For each key in localeMessages, check if Console has a localized override
  Object.keys(localeMessages).forEach(key => {
    // Skip keys that already have a suffix (shouldn't happen in localeMessages, but safety check)
    if (/_[a-z]{2}$/.test(key)) {
      return;
    }

    // Build the localized key (e.g., "TopbarDesktop.createListing_it")
    const localizedKey = `${key}_${languageCode}`;

    // If Console has a localized version, use it (priority 1)
    if (hostedTranslations[localizedKey]) {
      processedMessages[key] = hostedTranslations[localizedKey];
      console.debug(`Using Console translation: ${key} ← ${localizedKey}`);
    }
    // Otherwise, keep the JSON file value (priority 2 - already in processedMessages)
  });

  return processedMessages;
};

// Get default messages for a given locale.
//
// Note: Locale should not affect the tests. We ensure this by providing
//       messages with the key as the value of each message and discard the value.
//       { 'My.translationKey1': 'My.translationKey1', 'My.translationKey2': 'My.translationKey2' }
const isTestEnv = process.env.NODE_ENV === 'test';
const localeMessages = isTestEnv
  ? mapValues(defaultMessages, (val, key) => key)
  : addMissingTranslations(defaultMessages, messagesInLocale);

// For customized apps, this dynamic loading of locale files is not necessary.
// It helps locale change from configDefault.js file or hosted configs, but customizers should probably
// just remove this and directly import the necessary locale on step 2.
const MomentLocaleLoader = props => {
  const { children, locale } = props;
  const isAlreadyImportedLocale =
    typeof hardCodedLocale !== 'undefined' && locale === hardCodedLocale;

  // Moment's built-in locale does not need loader
  const NoLoader = props => <>{props.children()}</>;

  // The default locale is en (en-US). Here we dynamically load one of the other common locales.
  // However, the default is to include all supported locales package from moment library.
  const MomentLocale =
    ['en', 'en-US'].includes(locale) || isAlreadyImportedLocale
      ? NoLoader
      : ['fr', 'fr-FR'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "fr" */ 'moment/locale/fr'))
      : ['de', 'de-DE'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "de" */ 'moment/locale/de'))
      : ['es', 'es-ES'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "es" */ 'moment/locale/es'))
      : ['fi', 'fi-FI'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "fi" */ 'moment/locale/fi'))
      : ['nl', 'nl-NL'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "nl" */ 'moment/locale/nl'))
      : loadable.lib(() => import(/* webpackChunkName: "locales" */ 'moment/min/locales.min'));

  return (
    <MomentLocale>
      {() => {
        // Set the Moment locale globally
        // See: http://momentjs.com/docs/#/i18n/changing-locale/
        moment.locale(locale);
        return children;
      }}
    </MomentLocale>
  );
};

const Configurations = props => {
  const { appConfig, children } = props;
  const routeConfig = routeConfiguration(appConfig.layout, appConfig?.accessControl);
  const locale = isTestEnv ? 'en' : appConfig.localization.locale;

  return (
    <ConfigurationProvider value={appConfig}>
      <MomentLocaleLoader locale={locale}>
        <RouteConfigurationProvider value={routeConfig}>{children}</RouteConfigurationProvider>
      </MomentLocaleLoader>
    </ConfigurationProvider>
  );
};

const MaintenanceModeError = props => {
  const { locale, messages, helmetContext } = props;
  return (
    <IntlProvider locale={locale} messages={messages} textComponent="span">
      <HelmetProvider context={helmetContext}>
        <MaintenanceMode />
      </HelmetProvider>
    </IntlProvider>
  );
};

// This displays a warning if environment variable key contains a string "SECRET"
const EnvironmentVariableWarning = props => {
  const suspiciousEnvKey = props.suspiciousEnvKey;
  // https://github.com/sharetribe/flex-integration-api-examples#warning-usage-with-your-web-app--website
  const containsINTEG = str => str.toUpperCase().includes('INTEG');
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div style={{ width: '600px' }}>
        <p>
          Are you sure you want to reveal to the public web an environment variable called:{' '}
          <b>{suspiciousEnvKey}</b>
        </p>
        <p>
          All the environment variables that start with <i>REACT_APP_</i> prefix will be part of the
          published React app that's running on a browser. Those variables are, therefore, visible
          to anyone on the web. Secrets should only be used on a secure environment like the server.
        </p>
        {containsINTEG(suspiciousEnvKey) ? (
          <p>
            {'Note: '}
            <span style={{ color: 'red' }}>
              Do not use Integration API directly from the web app.
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
};

export const ClientApp = props => {
  const { store, hostedTranslations = {}, hostedConfig = {} } = props;
  const appConfig = mergeConfig(hostedConfig, defaultConfig);

  // Show warning on the localhost:3000, if the environment variable key contains "SECRET"
  if (appSettings.dev) {
    const envVars = process.env || {};
    const envVarKeys = Object.keys(envVars);
    const containsSECRET = str => str.toUpperCase().includes('SECRET');
    const suspiciousSECRETKey = envVarKeys.find(
      key => key.startsWith('REACT_APP_') && containsSECRET(key)
    );

    if (suspiciousSECRETKey) {
      return <EnvironmentVariableWarning suspiciousEnvKey={suspiciousSECRETKey} />;
    }
  }

  // Show MaintenanceMode if the mandatory configurations are not available
  if (!appConfig.hasMandatoryConfigurations) {
    const messagesWithFallbacks = applyLocaleSpecificFallbacks(hostedTranslations, localeMessages);

    return (
      <MaintenanceModeError
        locale={appConfig.localization.locale}
        messages={messagesWithFallbacks}
      />
    );
  }

  // Marketplace color and the color for <PrimaryButton> come from configs
  // If set, we need to create CSS Property and set it to DOM (documentElement is selected here)
  // This provides marketplace color for everything under <html> tag (including modals/portals)
  // Note: This is also set on Page component to provide server-side rendering.
  const elem = window.document.documentElement;
  includeCSSProperties(appConfig.branding, elem);

  // This gives good input for debugging issues on live environments, but with test it's not needed.
  const logLoadDataCalls = appSettings?.env !== 'test';

  // Apply locale-specific fallbacks: Console translations (with _lang suffix) take priority over JSON files
  const messagesWithFallbacks = applyLocaleSpecificFallbacks(hostedTranslations, localeMessages);

  return (
    <Configurations appConfig={appConfig}>
      <IntlProvider
        locale={appConfig.localization.locale}
        messages={messagesWithFallbacks}
        textComponent="span"
      >
        <Provider store={store}>
          <HelmetProvider>
            <IncludeScripts config={appConfig} />
            <BrowserRouter>
              <Routes logLoadDataCalls={logLoadDataCalls} />
            </BrowserRouter>
          </HelmetProvider>
        </Provider>
      </IntlProvider>
    </Configurations>
  );
};

ClientApp.propTypes = { store: any.isRequired };

export const ServerApp = props => {
  const { url, context, helmetContext, store, hostedTranslations = {}, hostedConfig = {} } = props;
  const appConfig = mergeConfig(hostedConfig, defaultConfig);
  HelmetProvider.canUseDOM = false;

  // Show MaintenanceMode if the mandatory configurations are not available
  if (!appConfig.hasMandatoryConfigurations) {
    const messagesWithFallbacks = applyLocaleSpecificFallbacks(hostedTranslations, localeMessages);

    return (
      <MaintenanceModeError
        locale={appConfig.localization.locale}
        messages={messagesWithFallbacks}
        helmetContext={helmetContext}
      />
    );
  }

  // Apply locale-specific fallbacks: Console translations (with _lang suffix) take priority over JSON files
  const messagesWithFallbacks = applyLocaleSpecificFallbacks(hostedTranslations, localeMessages);

  return (
    <Configurations appConfig={appConfig}>
      <IntlProvider
        locale={appConfig.localization.locale}
        messages={messagesWithFallbacks}
        textComponent="span"
      >
        <Provider store={store}>
          <HelmetProvider context={helmetContext}>
            <IncludeScripts config={appConfig} />
            <StaticRouter location={url} context={context}>
              <Routes />
            </StaticRouter>
          </HelmetProvider>
        </Provider>
      </IntlProvider>
    </Configurations>
  );
};

ServerApp.propTypes = { url: string.isRequired, context: any.isRequired, store: any.isRequired };

/**
 * Render the given route.
 *
 * @param {String} url Path to render
 * @param {Object} serverContext Server rendering context from react-router
 *
 * @returns {Object} Object with keys:
 *  - {String} body: Rendered application body of the given route
 *  - {Object} head: Application head metadata from react-helmet
 */
export const renderApp = (
  url,
  serverContext,
  preloadedState,
  hostedTranslations,
  hostedConfig,
  collectChunks
) => {
  // Don't pass an SDK instance since we're only rendering the
  // component tree with the preloaded store state and components
  // shouldn't do any SDK calls in the (server) rendering lifecycle.
  const store = configureStore(preloadedState);

  const helmetContext = {};

  // When rendering the app on server, we wrap the app with webExtractor.collectChunks
  // This is needed to figure out correct chunks/scripts to be included to server-rendered page.
  // https://loadable-components.com/docs/server-side-rendering/#3-setup-chunkextractor-server-side
  const WithChunks = collectChunks(
    <ServerApp
      url={url}
      context={serverContext}
      helmetContext={helmetContext}
      store={store}
      hostedTranslations={hostedTranslations}
      hostedConfig={hostedConfig}
    />
  );

  // Let's keep react-dom/server out of the main code-chunk.
  return import('react-dom/server').then(mod => {
    const { default: ReactDOMServer } = mod;
    const body = ReactDOMServer.renderToString(WithChunks);
    const { helmet: head } = helmetContext;
    return { head, body };
  });
};
