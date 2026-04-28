import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { userLocation, boundsFromCenterAndRadius } from '../../../util/maps';
import { LocationAutocompleteInput } from '../../../components';
import { getSearchPageResourceLocatorStringParams } from '../SearchPage.shared';

import css from './HandByHandLocationFilter.module.css';

const RADIUS_OPTIONS = [5, 10, 25, 50];
const DEFAULT_RADIUS = 10;
const UNBOUNDED_RADIUS = 50;

const HandByHandLocationFilter = props => {
  const {
    urlQueryParams,
    searchParamsInURL,
    history,
    routeConfiguration,
    location,
    intl,
    isMobile = false,
  } = props;

  const [isOpen, setIsOpen] = useState(true);
  const [locationValue, setLocationValue] = useState({
    search: '',
    predictions: [],
    selectedPlace: null,
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [pendingRadius, setPendingRadius] = useState(DEFAULT_RADIUS);

  const currentRadius = Number.parseInt(searchParamsInURL?.locationRadius, 10) || pendingRadius;
  const existingOrigin = searchParamsInURL?.origin;

  const pushLocation = (center, radiusKm) => {
    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );

    if (radiusKm === UNBOUNDED_RADIUS) {
      // Unbounded: keep origin but remove bounds constraint
      history.push(
        createResourceLocatorString(routeName, routeConfiguration, pathParams, {
          ...urlQueryParams,
          bounds: undefined,
          origin: center,
          locationRadius: radiusKm,
          address: undefined,
        })
      );
    } else {
      const bounds = boundsFromCenterAndRadius(center, radiusKm);
      history.push(
        createResourceLocatorString(routeName, routeConfiguration, pathParams, {
          ...urlQueryParams,
          bounds,
          origin: center,
          locationRadius: radiusKm,
          address: undefined,
        })
      );
    }
  };

  const handleUseMyLocation = () => {
    setGeoLoading(true);
    setGeoError(null);
    userLocation()
      .then(latlng => {
        setGeoLoading(false);
        pushLocation(latlng, currentRadius);
      })
      .catch(() => {
        setGeoLoading(false);
        setGeoError(intl.formatMessage({ id: 'SearchPage.LocationFilter.geolocationError' }));
      });
  };

  const handleAddressFocus = () => {
    if (!geoLoading && !existingOrigin) {
      handleUseMyLocation();
    }
  };

  const handleRadiusChange = km => {
    setPendingRadius(km);
    if (existingOrigin) {
      pushLocation(existingOrigin, km);
    }
  };

  const handleResetLocation = e => {
    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );
    const queryParams = {
      ...urlQueryParams,
      bounds: undefined,
      origin: undefined,
      locationRadius: undefined,
    };

    setLocationValue({
      search: '',
      predictions: [],
      selectedPlace: null,
    });
    setPendingRadius(DEFAULT_RADIUS);
    setGeoError(null);
    history.push(
      createResourceLocatorString(routeName, routeConfiguration, pathParams, queryParams)
    );

    if (e?.currentTarget) {
      e.currentTarget.blur();
    }
  };

  const activeRadius = existingOrigin ? currentRadius : pendingRadius;
  const isLocationFilterActive = !!(searchParamsInURL?.origin || searchParamsInURL?.bounds);

  return (
    <div className={classNames(css.root, { [css.mobile]: isMobile })}>
      <div className={css.headerRow}>
        <button
          type="button"
          className={css.headerButton}
          onClick={() => setIsOpen(o => !o)}
          aria-expanded={isOpen}
        >
          <span className={css.label}>
            <FormattedMessage id="SearchPage.LocationFilter.title" />
          </span>
          <span className={classNames(css.chevron, { [css.chevronOpen]: isOpen })}>
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 7L6 2L11 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        {isLocationFilterActive ? (
          <button type="button" className={css.resetButton} onClick={handleResetLocation}>
            <FormattedMessage id="SearchPage.LocationFilter.reset" />
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div className={css.content}>
          <div className={css.locationInputWrapper}>
            <LocationAutocompleteInput
              rootClassName={css.locationAutocompleteRoot}
              iconClassName={css.locationInputIcon}
              inputClassName={css.locationAutocompleteInput}
              predictionsClassName={css.locationPredictions}
              useDarkText
              input={{
                name: 'handByHandLocation',
                value: locationValue,
                onChange: value => {
                  setLocationValue(value);
                  if (value?.selectedPlace) {
                    pushLocation(value.selectedPlace.origin, currentRadius);
                  }
                },
                onBlur: () => {},
                onFocus: handleAddressFocus,
              }}
              meta={{}}
              placeholder={intl.formatMessage({
                id: 'SearchPage.LocationFilter.locationPlaceholder',
              })}
              closeOnBlur
            />
          </div>
          {geoError ? <p className={css.geoError}>{geoError}</p> : null}
          <div className={css.radiusSection}>
            <span className={css.radiusLabel}>
              <FormattedMessage id="SearchPage.LocationFilter.radiusLabel" />
            </span>
            <div className={css.radiusRow}>
              {RADIUS_OPTIONS.map(km => (
                <button
                  key={km}
                  type="button"
                  className={classNames(css.radiusChip, {
                    [css.radiusChipActive]: activeRadius === km,
                  })}
                  onClick={() => handleRadiusChange(km)}
                >
                  {km === UNBOUNDED_RADIUS ? `${km}km+` : `${km}km`}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HandByHandLocationFilter;
