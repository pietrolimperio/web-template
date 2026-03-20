import React, { useState, useRef } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';
import { useHistory } from 'react-router-dom';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { stringifyDateToISO8601 } from '../../../util/dates';
import { NamedLink, Form, PrimaryButton } from '../../../components';

import FilterCategories from '../../PageBuilder/Primitives/SearchCTA/FilterCategories/FilterCategories';
import FilterKeyword from '../../PageBuilder/Primitives/SearchCTA/FilterKeyword/FilterKeyword';
import FilterDateRange from '../../PageBuilder/Primitives/SearchCTA/FilterDateRange/FilterDateRange';

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

const HeroSection = () => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const [showCategories, setShowCategories] = useState(false);
  const blurTimeoutRef = useRef(null);
  const formRef = useRef(null);
  const latestValuesRef = useRef({});

  const categoryConfig = config.categoryConfiguration;
  const hasCategories = categoryConfig?.categories?.length > 0;

  const onSubmit = values => {
    let queryParams = {};
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
      <div className={css.overlay} />
      <div className={css.content}>
        <div className={css.headingArea}>
          <h1 className={css.motto}>
            <FormattedMessage id="NewLandingPage.heroMotto" />
          </h1>
          <p className={css.subtitle}>
            <FormattedMessage id="NewLandingPage.heroSubtitle" />
          </p>
        </div>

        <div className={css.searchArea}>
          <div className={css.searchBar}>
            <FinalForm
              onSubmit={onSubmit}
              render={({ handleSubmit, values }) => {
                latestValuesRef.current = values;

                const handleFormFocus = () => {
                  clearTimeout(blurTimeoutRef.current);
                  setShowCategories(true);
                };
                const handleFormBlur = () => {
                  blurTimeoutRef.current = setTimeout(() => {
                    if (formRef.current && formRef.current.contains(document.activeElement)) {
                      return;
                    }
                    const v = latestValuesRef.current;
                    const hasKeyword = v?.keywords && v.keywords.trim().length > 0;
                    const hasCat = v?.pub_categoryId != null && v.pub_categoryId !== '';
                    const hasDate = v?.dateRange?.startDate && v?.dateRange?.endDate;
                    if (!hasKeyword && !hasCat && !hasDate) {
                      setShowCategories(false);
                    }
                  }, 350);
                };

                return (
                  <div ref={formRef} onFocusCapture={handleFormFocus} onBlurCapture={handleFormBlur}>
                    <Form
                      role="search"
                      onSubmit={handleSubmit}
                      className={classNames(css.searchForm, {
                        [css.searchFormExpanded]: showCategories && hasCategories,
                      })}
                    >
                      {showCategories && hasCategories && (
                        <div className={classNames(css.searchField, css.categoryField)}>
                          <FilterCategories
                            categories={categoryConfig.categories}
                            alignLeft
                            defaultShowAll
                          />
                        </div>
                      )}
                      <div className={classNames(css.searchField, css.keywordField)}>
                        <FilterKeyword />
                      </div>
                      <div className={css.searchField}>
                        <FilterDateRange config={config} alignLeft={false} />
                      </div>
                      <PrimaryButton className={css.submitButton} type="submit">
                        <FormattedMessage id="NewLandingPage.heroSearch" />
                      </PrimaryButton>
                    </Form>
                  </div>
                );
              }}
            />
          </div>
        </div>

        <div className={css.ctaArea}>
          <NamedLink name="SearchPage" className={classNames(css.ctaButton, css.ctaShowMobileOnly)}>
            <FormattedMessage id="NewLandingPage.heroExplore" />
          </NamedLink>
          <NamedLink
            name="AIListingCreationPage"
            className={classNames(css.ctaButton, css.ctaShowDesktopOnly)}
          >
            <FormattedMessage id="NewLandingPage.heroCreateListing" />
          </NamedLink>
          <NamedLink name="LandingPage" to={{ hash: 'categories' }} className={css.ctaExplore}>
            <FormattedMessage id="NewLandingPage.heroExplore" />
          </NamedLink>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
