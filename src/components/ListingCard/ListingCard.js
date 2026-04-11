import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  displayPrice,
  isPriceVariationsEnabled,
  requireListingImage,
} from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { formatMoney, parseEstimatedPriceNewToMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { ensureListing, ensureUser } from '../../util/data';
import { richText } from '../../util/richText';
import { createSlug } from '../../util/urlHelpers';
import { isBookingProcessAlias } from '../../transactions/transaction';
import {
  getCategoryNamesFromIds,
  getShortLocaleForCategoryDisplay,
} from '../../util/fieldHelpers';

import {
  AspectRatioWrapper,
  NamedLink,
  ResponsiveImage,
  ListingCardThumbnail,
} from '../../components';
import ProductListingCard from '../ProductListingCard/ProductListingCard';

import css from './ListingCard.module.css';

const { Money } = sdkTypes;

const MIN_LENGTH_FOR_LONG_WORDS = 10;

const priceData = (price, currency, intl) => {
  if (price && price.currency === currency) {
    const formattedPrice = formatMoney(intl, price);
    return { formattedPrice, priceTitle: formattedPrice };
  } else if (price) {
    return {
      formattedPrice: intl.formatMessage(
        { id: 'ListingCard.unsupportedPrice' },
        { currency: price.currency }
      ),
      priceTitle: intl.formatMessage(
        { id: 'ListingCard.unsupportedPriceTitle' },
        { currency: price.currency }
      ),
    };
  }
  return {};
};

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });

const EstimatedPriceNew = ({ publicData, config, intl }) => {
  const moneyValue = parseEstimatedPriceNewToMoney(
    publicData?.estimatedPriceNew,
    config?.currency
  );
  if (!moneyValue) return null;
  try {
    const formatted = formatMoney(intl, moneyValue);
    return (
      <FormattedMessage id="ListingCard.estimatedPriceNew" values={{ price: formatted }} />
    );
  } catch {
    return null;
  }
};

const PriceMaybe = props => {
  const { price, publicData, config, intl, listingTypeConfig } = props;
  const showPrice = displayPrice(listingTypeConfig);
  if (!showPrice && price) {
    return null;
  }

  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);
  const variants = publicData?.priceVariants || [];
  const hasMultiplePriceVariants = isPriceVariationsInUse && variants.length > 1;

  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);

  // When multiple variants exist, find the lowest price among them
  let priceToDisplay;
  if (hasMultiplePriceVariants) {
    const minSubunits = variants.reduce(
      (min, v) => (v.priceInSubunits < min ? v.priceInSubunits : min),
      Infinity
    );
    priceToDisplay = minSubunits < Infinity ? new Money(minSubunits, config.currency) : price;
  } else {
    priceToDisplay = price;
  }

  const { formattedPrice, priceTitle } = priceData(priceToDisplay, config.currency, intl);

  const priceValue = <span className={css.priceValue}>{formattedPrice}</span>;
  const pricePerUnit = isBookable ? (
    <span className={css.perUnit}>
      <FormattedMessage id="ListingCard.perUnit" values={{ unitType: publicData?.unitType }} />
    </span>
  ) : (
    ''
  );

  return (
    <div className={css.price} title={priceTitle}>
      {hasMultiplePriceVariants ? (
        <FormattedMessage
          id="ListingCard.priceStartingFrom"
          values={{ priceValue, pricePerUnit }}
        />
      ) : (
        <FormattedMessage id="ListingCard.price" values={{ priceValue, pricePerUnit }} />
      )}
    </div>
  );
};

/**
 * ListingCardImage
 * Component responsible for rendering the image part of the listing card.
 * It either renders the first image from the listing's images array with lazy loading,
 * or a stylized placeholder if images are disabled for the listing type.
 * Also wraps the image in a fixed aspect ratio container for consistent layout.
 * @component
 * @param {Object} props
 * @param {Object} props.currentListing listing entity with image data
 * @param {Function?} props.setActivePropsMaybe mouse enter/leave handlers for map highlighting
 * @param {string} props.title listing title for alt text
 * @param {string} props.renderSizes img/srcset size rules
 * @param {number} props.aspectWidth aspect ratio width
 * @param {number} props.aspectHeight aspect ratio height
 * @param {string} props.variantPrefix image variant prefix (e.g. "listing-card")
 * @param {boolean} props.showListingImage whether to show actual listing image or not
 * @param {Object?} props.style the background color for the listing card with no image
 * @returns {JSX.Element} listing image with fixed aspect ratio or fallback preview
 */
const ListingCardImage = props => {
  const {
    currentListing,
    setActivePropsMaybe,
    title,
    renderSizes,
    aspectWidth,
    aspectHeight,
    variantPrefix,
    showListingImage,
    style,
  } = props;

  const firstImage =
    currentListing.images && currentListing.images.length > 0 ? currentListing.images[0] : null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith(variantPrefix))
    : [];

  // Render the listing image only if listing images are enabled in the listing type
  return showListingImage ? (
    <AspectRatioWrapper
      className={css.aspectRatioWrapper}
      width={aspectWidth}
      height={aspectHeight}
      {...setActivePropsMaybe}
    >
      <LazyImage
        rootClassName={css.rootForImage}
        alt={title}
        image={firstImage}
        variants={variants}
        sizes={renderSizes}
        loading="lazy"
      />
    </AspectRatioWrapper>
  ) : (
    <ListingCardThumbnail
      style={style}
      listingTitle={title}
      className={css.aspectRatioWrapper}
      width={aspectWidth}
      height={aspectHeight}
      setActivePropsMaybe={setActivePropsMaybe}
    />
  );
};

/**
 * ListingCard
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.listing API entity: listing or ownListing
 * @param {string?} props.renderSizes for img/srcset
 * @param {Function?} props.setActiveListing
 * @param {boolean?} props.showAuthorInfo
 * @param {boolean?} props.portraitImage — use 3:4 image area (same as ProductListingCard portrait)
 * @returns {JSX.Element} listing card to be used in search result panel etc.
 */
export const ListingCard = props => {
  const config = useConfiguration();
  const intl = props.intl || useIntl();

  const {
    className,
    rootClassName,
    listing,
    renderSizes,
    setActiveListing,
    showAuthorInfo = true,
    portraitImage = false,
  } = props;

  const classes = classNames(css.listingCardRoot, rootClassName, className);

  const currentListing = ensureListing(listing);
  const id = currentListing.id.uuid;
  const { title = '', price, publicData } = currentListing.attributes;
  const slug = createSlug(title);

  const author = ensureUser(listing.author);
  const authorName = author.attributes.profile.displayName;

  const categories = config?.categoryConfiguration?.categories ?? [];
  const shortLocale = getShortLocaleForCategoryDisplay(config, intl?.locale);
  const names = getCategoryNamesFromIds(
    categories,
    publicData?.categoryId,
    publicData?.subcategoryId,
    publicData?.thirdCategoryId,
    shortLocale
  );
  const categoryLabel =
    names.thirdCategory || names.subcategory || names.category || null;

  const { listingType, cardStyle } = publicData || {};
  const validListingTypes = config.listing.listingTypes;
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  const showListingImage = requireListingImage(foundListingTypeConfig);

  const layoutImage = config.layout.listingImage || {};
  const {
    aspectWidth: configAspectW = 1,
    aspectHeight: configAspectH = 1,
    variantPrefix = 'listing-card',
  } = layoutImage;
  const aspectWidth = portraitImage ? 3 : configAspectW;
  const aspectHeight = portraitImage ? 4 : configAspectH;

  // Sets the listing as active in the search map when hovered (if the search map is enabled)
  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(currentListing.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  const priceCompareEl =
    parseEstimatedPriceNewToMoney(publicData?.estimatedPriceNew, config?.currency) ? (
      <EstimatedPriceNew publicData={publicData} config={config} intl={intl} />
    ) : null;

  return (
    <ProductListingCard
      as={NamedLink}
      asProps={{ name: 'ProductPage', params: { id, slug } }}
      className={classes}
      image={
        <ListingCardImage
          renderSizes={renderSizes}
          title={title}
          currentListing={currentListing}
          config={config}
          setActivePropsMaybe={setActivePropsMaybe}
          aspectWidth={aspectWidth}
          aspectHeight={aspectHeight}
          variantPrefix={variantPrefix}
          style={cardStyle}
          showListingImage={showListingImage}
        />
      }
      category={categoryLabel}
      title={
        showListingImage
          ? richText(title, {
              longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
              longWordClass: css.longWord,
            })
          : null
      }
      owner={
        showAuthorInfo ? (
          <FormattedMessage id="ListingCard.author" values={{ authorName }} />
        ) : null
      }
      pricePrimary={
        <PriceMaybe
          price={price}
          publicData={publicData}
          config={config}
          intl={intl}
          listingTypeConfig={foundListingTypeConfig}
        />
      }
      priceCompare={priceCompareEl}
    />
  );
};

export default ListingCard;
