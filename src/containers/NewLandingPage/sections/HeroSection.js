import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import { useHistory } from 'react-router-dom';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { stringifyDateToISO8601 } from '../../../util/dates';
import { Form } from '../../../components';

import FilterKeyword from '../../PageBuilder/Primitives/SearchCTA/FilterKeyword/FilterKeyword';
import FilterDateRange from '../../PageBuilder/Primitives/SearchCTA/FilterDateRange/FilterDateRange';

import heroImage from '../../../assets/hero-landing-new.png';
import css from './HeroSection.module.css';

const isEmpty = value => {
  if (value == null) return true;
  return value.hasOwnProperty('length') && value.length === 0;
};

const formatDateValue = (dateRange, queryParamName) => {
  const { startDate, endDate } = dateRange || {};
  const start = startDate ? stringifyDateToISO8601(startDate) : null;
  const end = endDate ? stringifyDateToISO8601(endDate) : null;
  const value = start && end ? `${start},${end}` : null;
  return { [queryParamName]: value };
};

const SearchIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const HeroSection = () => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();

  const onSubmit = values => {
    const queryParams = {};
    Object.entries(values).forEach(([key, value]) => {
      if (!isEmpty(value)) {
        if (key === 'dateRange') {
          const { dates } = formatDateValue(value, 'dates');
          queryParams.dates = dates;
        } else {
          queryParams[key] = value;
        }
      }
    });
    const to = createResourceLocatorString('SearchPage', routeConfiguration, {}, queryParams);
    history.push(to);
  };

  return (
    <section className={css.root}>
      <div className={css.container}>
        <div className={css.textColumn}>
          <h1 className={css.headline}>
            <FormattedMessage
              id="NewLandingPage.heroMotto"
              values={{
                lineBreak: <br />,
                highlight: chunks => (
                  <span className={css.headlineHighlight}>{chunks}</span>
                ),
              }}
            />
          </h1>
          <p className={css.subtitle}>
            <FormattedMessage id="NewLandingPage.heroSubtitle" />
          </p>

          <div className={css.searchBarGlass}>
            <FinalForm
              onSubmit={onSubmit}
              render={({ handleSubmit }) => (
                <Form
                  role="search"
                  onSubmit={handleSubmit}
                  className={css.searchForm}
                >
                  <div className={css.searchField}>
                    <FilterKeyword />
                  </div>
                  <div className={css.searchDivider} />
                  <div className={css.searchField}>
                    <FilterDateRange config={config} alignLeft={false} />
                  </div>
                  <button type="submit" className={css.searchButton}>
                    <SearchIcon />
                  </button>
                </Form>
              )}
            />
          </div>
        </div>

        <div className={css.imageColumn}>
          <div className={css.imageBackdrop} />
          <img
            src={heroImage}
            alt=""
            className={css.heroImage}
            loading="eager"
          />
          <div className={css.floatingCard}>
            <div className={css.floatingCardBadge}>
              <span className={css.pulseDot} />
              <span className={css.badgeText}>
                <FormattedMessage id="NewLandingPage.heroAvailableNow" />
              </span>
            </div>
            <p className={css.floatingCardTitle}>
              <FormattedMessage id="NewLandingPage.heroSampleProduct" />
            </p>
            <p className={css.floatingCardPrice}>
              <FormattedMessage id="NewLandingPage.heroSamplePrice" />
            </p>
          </div>
        </div>
      </div>

      <div className={css.bgBlur} />
      <div className={css.bgShape} />
    </section>
  );
};

export default HeroSection;
