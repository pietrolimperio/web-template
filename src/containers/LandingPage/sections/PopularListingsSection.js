import React from 'react';
import { arrayOf, bool } from 'prop-types';
import { propTypes } from '../../../util/types';
import { FormattedMessage } from '../../../util/reactIntl';
import { ListingCard, NamedLink, IconSpinner } from '../../../components';

import css from './PopularListingsSection.module.css';

const PopularListingsSection = ({ listings = [], inProgress = false } = {}) => {

  const hasListings = listings && listings.length > 0;

  return (
    <section className={css.root}>
      <div className={css.container}>
        <div className={css.header}>
          <div className={css.headerText}>
            <h2 className={css.title}>
              <FormattedMessage id="NewLandingPage.popularTitle" />
            </h2>
            <p className={css.subtitle}>
              <FormattedMessage id="NewLandingPage.popularSubtitle" />
            </p>
          </div>
          <NamedLink name="SearchPage" className={css.viewAllLink}>
            <FormattedMessage id="NewLandingPage.popularViewAll" />
            <span className={css.arrow}>&rarr;</span>
          </NamedLink>
        </div>

        {inProgress && !hasListings ? (
          <div className={css.loading}>
            <IconSpinner />
          </div>
        ) : hasListings ? (
          <ul className={css.grid}>
            {listings.map(l => (
              <li key={l.id.uuid} className={css.gridItem}>
                <ListingCard
                  listing={l}
                  portraitImage
                  renderSizes="(max-width: 425px) 160px, (max-width: 549px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

PopularListingsSection.propTypes = {
  listings: arrayOf(propTypes.listing),
  inProgress: bool,
};

export default PopularListingsSection;
