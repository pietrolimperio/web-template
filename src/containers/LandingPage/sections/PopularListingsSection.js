import React from 'react';
import { arrayOf, bool } from 'prop-types';
import { propTypes } from '../../../util/types';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';
import { ensureListing } from '../../../util/data';
import { createSlug } from '../../../util/urlHelpers';
import { formatMoney, parseEstimatedPriceNewToMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { isPriceVariationsEnabled } from '../../../util/configHelpers';
import { isBookingProcessAlias } from '../../../transactions/transaction';
import { isBookingProcessAlias } from '../../../transactions/transaction';
import { useConfiguration } from '../../../context/configurationContext';
import { useReveal } from '../hooks/useReveal';

const { Money } = sdkTypes;

import css from './PopularListingsSection.module.css';

const STRIPE_CLASSES = [css.stripes0, css.stripes1, css.stripes2, css.stripes3];

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`${css.reveal} ${shown ? css.revealIn : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

const ListingCardNew = ({ listing, index }) => {
  const intl = useIntl();
  const config = useConfiguration();
  const ensured = ensureListing(listing);
  const listingId = ensured.id?.uuid;
  const { title = '', price, publicData } = ensured.attributes || {};
  const slug = createSlug(title);
  const stripeClass = STRIPE_CLASSES[index % STRIPE_CLASSES.length];

  const authorName = ensured.author?.attributes?.profile?.displayName;
  const city = publicData?.location?.address?.split(',').slice(-2, -1)[0]?.trim()
    || publicData?.city
    || null;
  const ownerLine = authorName
    ? (city ? `${authorName} · ${city}` : authorName)
    : null;

  const unitType = publicData?.unitType;
  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);
  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);

  // Price variants: show "Da X" if multiple variants exist
  const variants = publicData?.priceVariants || [];
  const hasMultipleVariants = isPriceVariationsEnabled(publicData, null) && variants.length > 1;
  let displayPrice = price;
  if (hasMultipleVariants) {
    const minSubunits = variants.reduce(
      (min, v) => (v.priceInSubunits < min ? v.priceInSubunits : min),
      Infinity
    );
    if (minSubunits < Infinity) displayPrice = new Money(minSubunits, config.currency);
  }
  const formattedPrice = displayPrice ? formatMoney(intl, displayPrice) : null;

  // Estimated retail price as strikethrough
  const estimatedPriceMoney = parseEstimatedPriceNewToMoney(publicData?.estimatedPriceNew, config?.currency);
  const formattedEstimated = estimatedPriceMoney ? formatMoney(intl, estimatedPriceMoney) : null;

  const firstImage = ensured.images?.[0];
  const imgUrl = firstImage?.attributes?.variants?.['listing-card']?.url;

  const priceValue = <strong>{formattedPrice}</strong>;
  // TODO(landing-followup): Keep landing-page price labels aligned with the shared ListingCard.
  // Only bookable listings should render a per-unit suffix.
  // TODO(landing-followup): Keep landing-page price labels aligned with the shared ListingCard.
  // Only bookable listings should render a per-unit suffix.
  const pricePerUnit = unitType && isBookable ? (
    <span><FormattedMessage id="ListingCard.perUnit" values={{ unitType }} /></span>
  ) : null;

  const cardContent = (
    <>
      <div className={css.listingImg}>
        {imgUrl ? (
          <img src={imgUrl} alt={title} className={css.listingPhoto} loading="lazy" />
        ) : (
          <div className={`${css.listingStripes} ${stripeClass}`} />
        )}
        <button className={css.heart} aria-label="Salva" onClick={e => e.preventDefault()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M7 12s-5-3.2-5-6.4A2.6 2.6 0 0 1 7 4a2.6 2.6 0 0 1 5 1.6C12 8.8 7 12 7 12Z" />
          </svg>
        </button>
      </div>
      <div className={css.listingBody}>
        <h3 className={css.listingTitle}>{title}</h3>
        {ownerLine && <p className={css.listingOwner}>{ownerLine}</p>}
        {formattedPrice && (
          <div className={css.listingPrice}>
            {hasMultipleVariants ? (
              <FormattedMessage
                id="ListingCard.priceStartingFrom"
                values={{ priceValue, pricePerUnit: pricePerUnit || '' }}
              />
            ) : (
              <>
                {priceValue}
                {pricePerUnit}
              </>
            )}
            {formattedEstimated && (
              <del className={css.compareAt}>
                <FormattedMessage
                  id="ListingCard.estimatedPriceNew"
                  values={{ price: formattedEstimated }}
                />
              </del>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (listingId && slug) {
    return (
      <NamedLink name="ProductPage" params={{ id: listingId, slug }} className={css.listing}>
        {cardContent}
      </NamedLink>
    );
  }

  return <div className={css.listing}>{cardContent}</div>;
};

const PopularListingsSection = ({ listings = [], inProgress = false }) => {
  const visibleListings = listings.slice(0, 4);
  const hasListings = visibleListings.length > 0;

  return (
    <section className={css.section}>
      <Reveal className={css.sectionHead}>
        <div>
          <span className={css.kicker}>
            <FormattedMessage id="NewLandingPage.inEvidenzaKicker" />
          </span>
          <h2 className={css.sectionTitle}>
            <FormattedMessage id="NewLandingPage.inEvidenzaTitle" />
          </h2>
        </div>
        <NamedLink name="SearchPage" className={css.seeAll}>
          <FormattedMessage id="NewLandingPage.popularViewAll" /> →
        </NamedLink>
      </Reveal>

      {inProgress && !hasListings ? (
        <div className={css.spinner}>
          <svg className={css.spinnerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <div className={css.grid}>
          {visibleListings.map((listing, i) => (
            <Reveal key={listing.id?.uuid || i} delay={i * 0.06}>
              <ListingCardNew listing={listing} index={i} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

PopularListingsSection.propTypes = {
  listings: arrayOf(propTypes.listing),
  inProgress: bool,
};

export default PopularListingsSection;
