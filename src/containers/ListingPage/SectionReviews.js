import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { Heading, H2, Reviews } from '../../components';

import css from './ListingPage.module.css';

const SectionReviews = props => {
  const { reviews, fetchReviewsError } = props;

  return (
    <section className={css.sectionReviews}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.reviewsTitle" values={{ count: reviews.length }} />
      </Heading>
      {fetchReviewsError ? (
        <H2 className={css.errorText}>
          <FormattedMessage id="ListingPage.reviewsError" />
        </H2>
      ) : reviews.length === 0 ? (
        <p className={css.noReviewsText}>
          <FormattedMessage id="ListingPage.noReviews" />
        </p>
      ) : null}
      <Reviews reviews={reviews} />
    </section>
  );
};

export default SectionReviews;
