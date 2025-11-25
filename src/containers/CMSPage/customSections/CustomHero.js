import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { isMainSearchTypeKeywords } from '../../../util/search';
import { getSearchPageResourceLocatorStringParams } from '../../SearchPage/SearchPage.shared';
import { NamedLink } from '../../../components';
import TopbarSearchForm from '../../TopbarContainer/Topbar/TopbarSearchForm/TopbarSearchForm';
import { parse } from '../../../util/urlHelpers';

import css from './CustomHero.module.css';

/**
 * Custom Hero Section for new-landing page
 * Features:
 * - Custom background image
 * - Italian title
 * - Search component
 * - Two call-to-action buttons
 */
const CustomHero = () => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const location = useLocation();

  // Parse current search params from URL
  const { address, bounds, keywords, origin } = parse(location.search, {
    latlng: ['origin'],
    latlngBounds: ['bounds'],
  });

  // Current search params (for maintaining filters when searching)
  const currentSearchParams = { address, bounds, keywords, origin };

  // Handle search form submission
  const handleSearchSubmit = values => {
    const topbarSearchParams = () => {
      if (isMainSearchTypeKeywords(config)) {
        return { keywords: values?.keywords };
      }
      // Default to location search
      const { search, selectedPlace } = values?.location || {};
      const { origin, bounds } = selectedPlace || {};
      const originMaybe = origin ? { origin } : {};

      return {
        ...originMaybe,
        address: search,
        bounds,
      };
    };

    const searchParams = {
      ...currentSearchParams,
      ...topbarSearchParams(),
    };

    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );

    history.push(
      createResourceLocatorString(routeName, routeConfiguration, pathParams, searchParams)
    );
  };

  // Initial values for search form (preserve current search)
  const initialSearchFormValues = () => {
    if (isMainSearchTypeKeywords(config)) {
      return { keywords };
    }

    const locationFieldsPresent = address && bounds;
    return {
      location: locationFieldsPresent
        ? {
            search: address,
            selectedPlace: { address, origin, bounds },
          }
        : null,
    };
  };

  return (
    <div className={css.root}>
      <div className={css.heroContent}>
        <div className={css.heroMain}>
          {/* Title - Localized via translations */}
          <h1 className={css.heroTitle}>
            <FormattedMessage id="CustomHero.title" />
          </h1>

          {/* Search Form */}
          <div className={css.searchWrapper}>
            <TopbarSearchForm
              className={css.searchForm}
              desktopInputRoot={css.topbarSearchWithLeftPadding}
              onSubmit={handleSearchSubmit}
              initialValues={initialSearchFormValues()}
              appConfig={config}
              isMobile={false}
            />
          </div>

          {/* Call-to-Action Buttons */}
          <div className={css.ctaButtons}>
            <NamedLink name="NewListingPage" className={css.primaryButton}>
              <FormattedMessage id="CustomHero.postListing" />
            </NamedLink>
            <NamedLink name="SearchPage" className={css.secondaryButton}>
              <FormattedMessage id="CustomHero.discoverMore" />
            </NamedLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomHero;
