import React from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';
import { DEFAULT_LOCALE, getLocalizedPageId, getBasePageId } from '../../config/localeConfig';
import InjectedStatsSection from './customSections/InjectedStatsSection';
import CustomHero from './customSections/CustomHero';
import { NamedRedirect } from '../../components';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

/**
 * Custom Section Components Registry
 *
 * Register your custom React components here to inject them into CMS pages.
 * These components will be inserted at specific positions in the page content.
 */
const customSectionComponents = {
  customHero: { component: CustomHero },
  injectedStats: { component: InjectedStatsSection },
  // Add more custom sections here:
  // customFeatures: { component: CustomFeaturesSection },
  // customTestimonials: { component: CustomTestimonialsSection },
};

/**
 * Inject Custom Sections into CMS Pages
 *
 * This function inserts custom React components at specific positions
 * in the Console-managed sections array.
 *
 * Position Guide:
 *   position: -1  → Insert BEFORE all Console sections (right after topbar)
 *   position: 0   → Insert AFTER 1st Console section
 *   position: 1   → Insert AFTER 2nd Console section
 *   position: N   → Insert AFTER (N+1)th Console section
 *
 * @param {Object} pageAssetsData - Page data from Sharetribe Console
 * @param {string} pageId - CMS page identifier (e.g., 'new-landing', 'about')
 * @returns {Object} Modified page data with injected sections
 */
const injectCustomSections = (pageAssetsData, pageId) => {
  if (!pageAssetsData) return pageAssetsData;

  const sections = pageAssetsData.sections || [];

  // Configuration: Define where to inject custom sections for each page
  const injectionConfig = {
    'new-landing': [
      // Custom hero appears at the top (before all Console sections)
      { position: -1, section: { sectionType: 'customHero', sectionId: 'custom-hero' } },

      // Examples: Add more injections as needed
      // { position: 1, section: { sectionType: 'injectedStats', sectionId: 'stats-1' } },
      // { position: 3, section: { sectionType: 'customFeatures', sectionId: 'features' } },
    ],

    // Configure other CMS pages here:
    // about: [
    //   { position: 0, section: { sectionType: 'injectedStats', sectionId: 'about-stats' } },
    // ],
  };

  const injectionsForPage = injectionConfig[pageId] || [];
  if (injectionsForPage.length === 0) {
    return pageAssetsData; // No injections needed
  }

  // Sort injections by position (descending) to avoid index shifting
  const sortedInjections = [...injectionsForPage].sort((a, b) => b.position - a.position);

  // Create a new sections array with injections
  const newSections = [...sections];
  sortedInjections.forEach(({ position, section }) => {
    if (position === -1) {
      // Insert at the very beginning (before all Console sections)
      newSections.unshift(section);
    } else {
      // Insert after the specified position
      newSections.splice(position + 1, 0, section);
    }
  });

  return {
    ...pageAssetsData,
    sections: newSections,
  };
};

/**
 * CMS Page Component
 *
 * Renders content pages managed through Sharetribe Console.
 * Supports injecting custom React components at specific positions.
 *
 * @param {Object} props
 * @param {Object} props.params - Route parameters
 * @param {Object} props.pageAssetsData - Page content from Console
 * @param {boolean} props.inProgress - Loading state
 * @param {Object} props.error - Error object if loading failed
 */
export const CMSPageComponent = props => {
  const { params, pageAssetsData, inProgress, error } = props;
  const pageIdFromUrl = params.pageId || props.pageId;

  if (!inProgress && error?.status === 404) {
    return <NotFoundPage staticContext={props.staticContext} />;
  }

  // Get current locale from localStorage (default: it-IT)
  // Safe for server-side rendering: check if localStorage is available
  const currentLocale =
    typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
      : DEFAULT_LOCALE;

  // Strip any existing locale suffix from the URL to get the true base page ID
  // Example: 'about_it_it' → 'about', 'about' → 'about'
  const basePageId = getBasePageId(pageIdFromUrl);

  // If the URL contains a locale suffix (e.g., /about_it_it), redirect to base URL (/about)
  // This ensures clean URLs without locale suffixes
  if (pageIdFromUrl !== basePageId) {
    return <NamedRedirect name="CMSPage" params={{ pageId: basePageId }} />;
  }

  // Build the localized page ID based on current locale
  // Example: 'about' + 'it-IT' → 'about_it_it'
  const localizedPageId = getLocalizedPageId(basePageId, currentLocale);

  // Try to load the localized page first
  let pageData = pageAssetsData?.[localizedPageId]?.data;

  // Fallback to base page if localized version doesn't exist
  if (!pageData) {
    pageData = pageAssetsData?.[basePageId]?.data;
  }

  // Pass custom section components to PageBuilder
  const pageBuilderOptions = {
    sectionComponents: customSectionComponents,
  };

  // Inject custom sections at specific positions
  const modifiedPageAssetsData = injectCustomSections(pageData, basePageId);

  return (
    <PageBuilder
      pageAssetsData={modifiedPageAssetsData}
      inProgress={inProgress}
      schemaType="Article"
      options={pageBuilderOptions}
    />
  );
};

CMSPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
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
const CMSPage = compose(
  withRouter,
  connect(mapStateToProps)
)(CMSPageComponent);

export default CMSPage;
