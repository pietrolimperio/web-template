import React, { useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';
import { useHistory } from 'react-router-dom';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { stringifyDateToISO8601 } from '../../../util/dates';
import { NamedLink, Form, PrimaryButton } from '../../../components';

import FilterKeyword from '../../PageBuilder/Primitives/SearchCTA/FilterKeyword/FilterKeyword';
import FilterDateRange from '../../PageBuilder/Primitives/SearchCTA/FilterDateRange/FilterDateRange';

import css from './LandingHero.module.css';

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

const LandingHero = () => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const [submitDisabled, setSubmitDisabled] = useState(false);

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
      {/* Motto - top center */}
      <div className={css.mottoWrapper}>
        <h1 className={css.motto}>
          <FormattedMessage id="LandingHero.motto" />
        </h1>
      </div>

      {/* Bottom area: CTA left, Search right */}
      <div className={css.bottomRow}>
        {/* Left: CTA button */}
        <div className={css.ctaColumn}>
          <NamedLink name="AIListingCreationPage" className={css.ctaButton}>
            <FormattedMessage id="LandingHero.createListing" />
          </NamedLink>
        </div>

        {/* Right: Search form */}
        <div className={css.searchColumn}>
          <div className={css.searchBar}>
            <FinalForm
              onSubmit={onSubmit}
              render={({ handleSubmit }) => (
                <Form role="search" onSubmit={handleSubmit} className={css.searchForm}>
                  <div className={classNames(css.searchField, css.keywordField)}>
                    <FilterKeyword />
                  </div>

                  <div className={css.searchField}>
                    <FilterDateRange config={config} alignLeft={false} />
                  </div>

                  <PrimaryButton
                    disabled={submitDisabled}
                    className={css.submitButton}
                    type="submit"
                  >
                    <FormattedMessage id="PageBuilder.SearchCTA.buttonLabel" />
                  </PrimaryButton>
                </Form>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
