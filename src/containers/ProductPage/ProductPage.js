import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

// Contexts
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
// Utils
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { LISTING_STATE_PENDING_APPROVAL, LISTING_STATE_CLOSED, propTypes } from '../../util/types';
import { types as sdkTypes, createInstance } from '../../util/sdkLoader';
import {
  LISTING_PAGE_DRAFT_VARIANT,
  LISTING_PAGE_PENDING_APPROVAL_VARIANT,
  LISTING_PAGE_PARAM_TYPE_DRAFT,
  LISTING_PAGE_PARAM_TYPE_EDIT,
  createSlug,
  NO_ACCESS_PAGE_USER_PENDING_APPROVAL,
  NO_ACCESS_PAGE_VIEW_LISTINGS,
} from '../../util/urlHelpers';
import {
  isErrorNoViewingPermission,
  isErrorUserPendingApproval,
  isForbiddenError,
} from '../../util/errors.js';
import { hasPermissionToViewData, isUserAuthorized } from '../../util/userHelpers.js';
import {
  ensureListing,
  ensureOwnListing,
  ensureUser,
  userDisplayNameAsString,
} from '../../util/data';
import { richText } from '../../util/richText';
import { formatMoney } from '../../util/currency';
import { currencyFormatting } from '../../config/settingsCurrency';
import { geocodeAddress, getCountryForLocale } from '../../util/maps';
import {
  isBookingProcess,
  isNegotiationProcess,
  isPurchaseProcess,
  resolveLatestProcessName,
  BOOKING_PROCESS_NAME,
} from '../../transactions/transaction';
import {
  getStartOf,
  addTime,
  timeOfDayFromLocalToTimeZone,
  timeOfDayFromTimeZoneToLocal,
  stringifyDateToISO8601,
  monthIdString,
} from '../../util/dates';
import { LINE_ITEM_DAY, LINE_ITEM_NIGHT } from '../../util/types';
import { required, bookingDatesRequired, composeValidators } from '../../util/validators';

// Global ducks (for Redux actions and thunks)
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';
import { initializeCardPaymentData } from '../../ducks/stripe.duck.js';

// Shared components
import {
  H4,
  Page,
  NamedLink,
  NamedRedirect,
  LayoutSingleColumn,
  AvatarSmall,
  PrimaryButton,
  Form,
  FieldDateRangePicker,
  H6,
  Modal,
  IconArrowHead,
  Map,
  Heading,
  ReviewRating,
} from '../../components';

// Related components and modules
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import NotFoundPage from '../NotFoundPage/NotFoundPage';
import AvailabilityCalendar from '../AIListingCreationPage/AvailabilityCalendar';

import {
  sendInquiry,
  setInitialValues,
  fetchTimeSlots,
  fetchTransactionLineItems,
} from '../ListingPage/ListingPage.duck';

import {
  LoadingPage,
  ErrorPage,
  priceData,
  listingImages,
  handleContactUser,
  handleSubmitInquiry,
  handleNavigateToMakeOfferPage,
  handleSubmit,
} from '../ListingPage/ListingPage.shared';
import ActionBarMaybe from '../ListingPage/ActionBarMaybe';
import SectionTextMaybe from '../ListingPage/SectionTextMaybe';
import SectionReviews from '../ListingPage/SectionReviews';
import CustomListingFields from '../ListingPage/CustomListingFields';
import EstimatedCustomerBreakdownMaybe from '../../components/OrderPanel/EstimatedCustomerBreakdownMaybe';

import css from './ProductPage.module.css';

const MIN_LENGTH_FOR_LONG_WORDS_IN_TITLE = 16;
const TODAY = new Date();

const { UUID } = sdkTypes;

// Helper to format price
const formatPrice = (price, intl) => {
  if (!price) return '';
  try {
    return formatMoney(intl, price);
  } catch (e) {
    return `${price.amount / 100} ${price.currency}`;
  }
};

// Price variant card component (display only, not clickable)
const PriceVariantCard = ({ variant, currency, intl, marketplaceColor }) => {
  const formatPriceVariantLabel = (variant) => {
    // Handle period-based variants
    if (variant.dates && Array.isArray(variant.dates) && variant.dates.length > 0) {
      const start = new Date(variant.dates[0]);
      const end = new Date(variant.dates[variant.dates.length - 1]);
      const formatDate = date => {
        const day = date.getDate();
        const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const month = monthNames[date.getMonth()];
        return `${day} ${month}`;
      };
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    
    // Handle duration-based variants
    const minDuration = variant.minDuration || variant.minLength;
    const maxDuration = variant.maxDuration || variant.maxLength;
    
    if (minDuration && maxDuration) {
      return intl.formatMessage(
        { id: 'ProductPage.fromToDays', defaultMessage: 'da {min} a {max} giorni' },
        { min: minDuration, max: maxDuration }
      );
    } else if (minDuration) {
      return intl.formatMessage(
        { id: 'ProductPage.fromDays', defaultMessage: 'da {days} giorni' },
        { days: minDuration }
      );
    }
    
    return variant.name || '';
  };

  const priceDisplay = variant.percentageDiscount != null
    ? `-${variant.percentageDiscount}%`
    : `${(variant.priceInSubunits / 100).toFixed(2)} ${currency}`;

  return (
    <div
      className={css.priceVariantCard}
      style={{ borderColor: marketplaceColor }}
    >
      <div className={css.priceVariantPrice}>{priceDisplay}</div>
      <div className={css.priceVariantLabel}>{formatPriceVariantLabel(variant)}</div>
    </div>
  );
};

// Booking form with calendar
const BookingForm = props => {
  const {
    listing,
    isOwnListing,
    onSubmit,
    intl,
    config,
    monthlyTimeSlots,
    onFetchTimeSlots,
    onFetchTransactionLineItems,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    dayCountAvailableForBooking,
    marketplaceName,
    payoutDetailsWarning,
  } = props;

  const publicData = listing?.attributes?.publicData || {};
  const price = listing?.attributes?.price;
  const timeZone = listing?.attributes?.availabilityPlan?.timezone || 'Europe/Rome';
  const priceVariants = publicData?.priceVariants || [];
  const currency = price?.currency || 'EUR';
  const marketplaceColor = config.branding?.marketplaceColor || '#4A90E2';

  const [availableDates, setAvailableDates] = useState([]);
  const [disabledDates, setDisabledDates] = useState([]);
  const [calendarSelectedDates, setCalendarSelectedDates] = useState([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  // Fetch availability exceptions
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!listing?.id) return;

      setIsLoadingAvailability(true);
      try {
        const sdk = createInstance({
          clientId: config.sdk?.clientId || process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const response = await sdk.availabilityExceptions.query({
          listingId: listing.id,
          start: today,
          end: oneYearFromNow,
        });

        const exceptions = response.data.data || [];
        
        // Convert exceptions to disabled dates
        const exceptionDates = [];
        exceptions.forEach(exception => {
          if (exception.attributes.seats === 0) {
            const start = new Date(exception.attributes.start);
            const end = new Date(exception.attributes.end);
            const current = new Date(start);
            current.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            while (current <= end) {
              exceptionDates.push(new Date(current));
              current.setDate(current.getDate() + 1);
            }
          }
        });
        setDisabledDates(exceptionDates);

        // Calculate available dates
        const available = [];
        let rangeStart = today;
        let rangeEnd = oneYearFromNow;

        if (publicData?.availableFrom) {
          const fromDate = new Date(publicData.availableFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (fromDate > rangeStart) rangeStart = fromDate;
        }

        if (publicData?.availableUntil) {
          const untilDate = new Date(publicData.availableUntil);
          untilDate.setHours(23, 59, 59, 999);
          if (untilDate < rangeEnd) rangeEnd = untilDate;
        }

        const currentDate = new Date(rangeStart);
        while (currentDate <= rangeEnd) {
          const dateObj = new Date(currentDate);
          dateObj.setHours(0, 0, 0, 0);
          const isException = exceptionDates.some(d => d.getTime() === dateObj.getTime());
          if (!isException) {
            available.push(dateObj);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        setAvailableDates(available);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [listing?.id, config.sdk?.clientId, publicData?.availableFrom, publicData?.availableUntil]);

  const handleCalendarDatesChange = (dates) => {
    setCalendarSelectedDates(dates);
    
    // Calculate line items when dates are selected
    if (dates && dates.length >= 2) {
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      // Add one day to end date for API (exclusive end)
      const endDateForAPI = new Date(endDate);
      endDateForAPI.setDate(endDateForAPI.getDate() + 1);
      
      const orderData = {
        bookingStart: startDate,
        bookingEnd: endDateForAPI,
      };

      onFetchTransactionLineItems({
        orderData,
        listingId: listing.id,
        isOwnListing,
      });
    }
  };

  const handleFormSubmit = () => {
    if (calendarSelectedDates.length < 2) return;

    const startDate = calendarSelectedDates[0];
    const endDate = calendarSelectedDates[calendarSelectedDates.length - 1];
    
    // Add one day to end date for API (exclusive end)
    const endDateForAPI = new Date(endDate);
    endDateForAPI.setDate(endDateForAPI.getDate() + 1);

    const bookingData = {
      bookingDates: {
        startDate,
        endDate: endDateForAPI,
      },
    };

    onSubmit(bookingData);
  };

  const hasValidDates = calendarSelectedDates.length >= 2;
  const breakdownData = hasValidDates
    ? {
        startDate: calendarSelectedDates[0],
        endDate: calendarSelectedDates[calendarSelectedDates.length - 1],
      }
    : null;
  const showEstimatedBreakdown = breakdownData && lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;

  return (
    <div className={css.bookingFormWrapper}>
      {/* Availability Calendar */}
      <div className={css.calendarSection}>
        {isLoadingAvailability ? (
          <div className={css.loadingCalendar}>
            <FormattedMessage id="ProductPage.loadingAvailability" defaultMessage="Caricamento disponibilità..." />
          </div>
        ) : (
          <AvailabilityCalendar
            selectedDates={calendarSelectedDates}
            onDatesChange={handleCalendarDatesChange}
            selectMode="range"
            marketplaceColor={marketplaceColor}
            disabledDates={disabledDates}
            readOnly={false}
            availableFrom={publicData?.availableFrom}
            availableUntil={publicData?.availableUntil}
            singleMonth={true}
            autoSelectDates={false}
          />
        )}
      </div>

      {/* Estimated Breakdown */}
      {showEstimatedBreakdown && (
        <div className={css.breakdownSection}>
          <H6 as="h3" className={css.breakdownTitle}>
            <FormattedMessage id="ProductPage.priceBreakdownTitle" defaultMessage="Riepilogo prezzo" />
          </H6>
          <hr className={css.breakdownDivider} />
          <EstimatedCustomerBreakdownMaybe
            breakdownData={breakdownData}
            lineItems={lineItems}
            timeZone={timeZone}
            currency={currency}
            marketplaceName={marketplaceName}
            processName={BOOKING_PROCESS_NAME}
          />
        </div>
      )}

      {/* Submit Button */}
      <div className={css.submitButtonWrapper}>
        <PrimaryButton
          onClick={handleFormSubmit}
          disabled={!hasValidDates || isOwnListing}
          inProgress={fetchLineItemsInProgress}
        >
          <FormattedMessage id="ProductPage.requestToBook" defaultMessage="Richiedi prenotazione" />
        </PrimaryButton>
      </div>

      <p className={css.finePrint}>
        {payoutDetailsWarning || (
          <FormattedMessage
            id={isOwnListing ? 'ProductPage.ownListing' : 'ProductPage.youWontBeChargedInfo'}
            defaultMessage="Non ti verrà addebitato nulla adesso"
          />
        )}
      </p>
            {/* Price Variant Cards (display only, excluding default) */}
            {priceVariants.length > 0 && (
        <div className={css.priceVariantsSection}>
          <h3 className={css.sectionTitle}>
            <FormattedMessage 
              id="ProductPage.discountForRental" 
              defaultMessage="Sconto per tutta la durata del noleggio" 
            />
          </h3>
          <div className={css.priceVariantsGrid}>
            {priceVariants.map((variant, index) => (
              <PriceVariantCard
                key={variant.name || index}
                variant={variant}
                currency={currency}
                intl={intl}
                marketplaceColor={marketplaceColor}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export const ProductPageComponent = props => {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(
    props.inquiryModalOpenForListingId === props.params.id
  );
  const [mounted, setMounted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [geocodedLocation, setGeocodedLocation] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isAuthenticated,
    currentUser,
    getListing,
    getOwnListing,
    onManageDisableScrolling,
    params: rawParams,
    scrollingDisabled,
    showListingError,
    reviews = [],
    fetchReviewsError,
    authorReviews = [],
    callSetInitialValues,
    onSendInquiry,
    onInitializeCardPaymentData,
    onFetchTimeSlots,
    monthlyTimeSlots,
    onFetchTransactionLineItems,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    showOwnListingsOnly,
  } = props;

  const listingConfig = config.listing;
  const listingId = new UUID(rawParams.id);
  const isVariant = rawParams.variant != null;
  const isPendingApprovalVariant = rawParams.variant === LISTING_PAGE_PENDING_APPROVAL_VARIANT;
  const isDraftVariant = rawParams.variant === LISTING_PAGE_DRAFT_VARIANT;
  const currentListing =
    isPendingApprovalVariant || isDraftVariant || showOwnListingsOnly
      ? ensureOwnListing(getOwnListing(listingId))
      : ensureListing(getListing(listingId));

  // Extract attributes safely for geocoding useEffect (must be before early returns)
  const listingAttributes = currentListing?.attributes || {};
  const listingGeolocation = listingAttributes.geolocation || null;
  const listingPublicData = listingAttributes.publicData || {};

  // Geocode address if geolocation is not available but locationVisible is true
  // This useEffect MUST be before any early returns to follow Rules of Hooks
  useEffect(() => {
    // Reset geocoded location if geolocation is available
    if (listingGeolocation) {
      setGeocodedLocation(null);
      setIsGeocoding(false);
      return;
    }

    // Only geocode if locationVisible is true and we have location data
    if (!listingPublicData?.locationVisible) {
      setGeocodedLocation(null);
      setIsGeocoding(false);
      return;
    }

    // Extract address from publicData.location
    const location = listingPublicData?.location || {};
    const addressObj = location.address || {};
    const addressString = typeof addressObj === 'string' 
      ? addressObj 
      : addressObj.street && addressObj.streetNumber
      ? `${addressObj.street} ${addressObj.streetNumber}, ${addressObj.city || ''} ${addressObj.postalCode || ''}`.trim()
      : addressObj.city || addressObj.address || '';

    // If no geolocation but address exists, try to geocode it
    if (!listingGeolocation && addressString) {
      setIsGeocoding(true);
      const countryCode = getCountryForLocale(intl.locale);
      
      geocodeAddress(addressString, countryCode)
        .then(coords => {
          if (coords) {
            setGeocodedLocation(coords);
          } else {
            setGeocodedLocation(null);
          }
        })
        .catch(error => {
          console.error('Error geocoding address:', error);
          setGeocodedLocation(null);
        })
        .finally(() => {
          setIsGeocoding(false);
        });
    } else {
      setGeocodedLocation(null);
      setIsGeocoding(false);
    }
  }, [listingGeolocation, listingPublicData?.location, listingPublicData?.locationVisible, intl.locale]);

  const listingSlug = rawParams.slug || createSlug(currentListing.attributes?.title || '');
  const params = { slug: listingSlug, ...rawParams };

  const listingPathParamType = isDraftVariant
    ? LISTING_PAGE_PARAM_TYPE_DRAFT
    : LISTING_PAGE_PARAM_TYPE_EDIT;
  const listingTab = isDraftVariant ? 'photos' : 'details';

  const isApproved =
    currentListing.id && currentListing.attributes?.state !== LISTING_STATE_PENDING_APPROVAL;
  const pendingIsApproved = isPendingApprovalVariant && isApproved;
  const pendingOtherUsersListing =
    (isPendingApprovalVariant || isDraftVariant) &&
    showListingError &&
    showListingError.status === 403;
  const shouldShowPublicListingPage = pendingIsApproved || pendingOtherUsersListing;

  if (shouldShowPublicListingPage) {
    return <NamedRedirect name="ProductPage" params={params} search={location.search} />;
  }

  const topbar = <TopbarContainer />;

  if (showListingError && showListingError.status === 404) {
    return <NotFoundPage staticContext={props.staticContext} />;
  } else if (showListingError) {
    return <ErrorPage topbar={topbar} scrollingDisabled={scrollingDisabled} intl={intl} />;
  } else if (!currentListing.id) {
    return <LoadingPage topbar={topbar} scrollingDisabled={scrollingDisabled} intl={intl} />;
  }

  const {
    description = '',
    geolocation = listingGeolocation,
    price = null,
    title = '',
    publicData = listingPublicData,
    metadata = {},
  } = currentListing.attributes;

  const richTitle = (
    <span>
      {richText(title, {
        longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS_IN_TITLE,
        longWordClass: css.longWord,
      })}
    </span>
  );

  const authorAvailable = currentListing && currentListing.author;
  const userAndListingAuthorAvailable = !!(currentUser && authorAvailable);
  const isOwnListing =
    userAndListingAuthorAvailable && currentListing.author.id.uuid === currentUser.id.uuid;

  const { listingType, transactionProcessAlias, unitType } = publicData;
  if (!(listingType && transactionProcessAlias && unitType)) {
    return (
      <ErrorPage topbar={topbar} scrollingDisabled={scrollingDisabled} intl={intl} invalidListing />
    );
  }

  const processName = resolveLatestProcessName(transactionProcessAlias.split('/')[0]);
  const isBooking = isBookingProcess(processName);
  const isPurchase = isPurchaseProcess(processName);
  const isNegotiation = isNegotiationProcess(processName);
  const processType = isBooking
    ? 'booking'
    : isPurchase
    ? 'purchase'
    : isNegotiation
    ? 'negotiation'
    : 'inquiry';

  const currentAuthor = authorAvailable ? currentListing.author : null;
  const ensuredAuthor = ensureUser(currentAuthor);
  const authorNeedsPayoutDetails = ['booking', 'purchase'].includes(processType);
  const noPayoutDetailsSetWithOwnListing =
    isOwnListing && (authorNeedsPayoutDetails && !currentUser?.attributes?.stripeConnected);
  const payoutDetailsWarning = noPayoutDetailsSetWithOwnListing ? (
    <span className={css.payoutDetailsWarning}>
      <FormattedMessage id="ProductPage.payoutDetailsWarning" values={{ processType }} />
      <NamedLink name="StripePayoutPage">
        <FormattedMessage id="ProductPage.payoutDetailsWarningLink" />
      </NamedLink>
    </span>
  ) : null;

  const authorDisplayName = userDisplayNameAsString(ensuredAuthor, '');
  const { formattedPrice } = priceData(price, config.currency, intl);
  const marketplaceColor = config.branding?.marketplaceColor || '#4A90E2';

  // Calculate author reviews average and total
  const authorReviewsCount = authorReviews.length;
  const authorAverageRating = authorReviewsCount > 0
    ? Math.round(
        (authorReviews.reduce((sum, review) => sum + (review.attributes?.rating || 0), 0) /
          authorReviewsCount) *
          10
      ) / 10
    : 0;
  const authorAverageRatingRounded = authorAverageRating > 0 ? Math.round(authorAverageRating) : 0;

  const commonParams = { params, history, routes: routeConfiguration };
  const onContactUser = handleContactUser({
    ...commonParams,
    currentUser,
    callSetInitialValues,
    location,
    setInitialValues,
    setInquiryModalOpen,
  });
  const onSubmitInquiry = handleSubmitInquiry({
    ...commonParams,
    getListing,
    onSendInquiry,
    setInquiryModalOpen,
  });
  const onNavigateToMakeOfferPage = handleNavigateToMakeOfferPage({
    ...commonParams,
    getListing,
  });
  const onSubmit = handleSubmit({
    ...commonParams,
    currentUser,
    callSetInitialValues,
    getListing,
    onInitializeCardPaymentData,
  });

  const handleOrderSubmit = values => {
    const isCurrentlyClosed = currentListing.attributes.state === LISTING_STATE_CLOSED;
    if (isOwnListing || isCurrentlyClosed) {
      window.scrollTo(0, 0);
    } else if (isNegotiation) {
      onNavigateToMakeOfferPage(values);
    } else {
      onSubmit(values);
    }
  };

  const facebookImages = listingImages(currentListing, 'facebook');
  const twitterImages = listingImages(currentListing, 'twitter');
  const schemaImages = listingImages(
    currentListing,
    `${config.layout.listingImage.variantPrefix}-2x`
  ).map(img => img.url);
  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage(
    { id: 'ProductPage.schemaTitle' },
    { title, price: formattedPrice, marketplaceName }
  );

  // Get images
  const images = currentListing.images || [];
  const mainImage = images[selectedImageIndex];
  const mainImageVariants = mainImage?.attributes?.variants || {};
  const mainImageUrl =
    mainImageVariants['scaled-xlarge']?.url ||
    mainImageVariants['scaled-large']?.url ||
    mainImageVariants['scaled-medium']?.url ||
    mainImageVariants['listing-card-6x']?.url ||
    mainImageVariants['listing-card-4x']?.url ||
    mainImageVariants['listing-card-2x']?.url ||
    mainImageVariants['listing-card']?.url;

  const isClosed = currentListing.attributes.state === LISTING_STATE_CLOSED;

  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      author={authorDisplayName}
      description={description}
      facebookImages={facebookImages}
      twitterImages={twitterImages}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'Product',
        description: description,
        name: schemaTitle,
        image: schemaImages,
        offers: {
          '@type': 'Offer',
          url: `${config.marketplaceRootURL}${location.pathname}`,
          priceCurrency: price?.currency,
          price: price ? price.amount / 100 : undefined,
        },
      }}
    >
      <LayoutSingleColumn className={css.pageRoot} topbar={topbar} footer={<FooterContainer />}>
        <div className={css.contentWrapper}>
          {/* Breadcrumb */}
          {publicData?.category && (
            <div className={css.breadcrumb}>
              <NamedLink
                name="SearchPage"
                to={{ search: `?keywords=${encodeURIComponent(publicData.category)}` }}
                className={css.breadcrumbItem}
              >
                {publicData.category.charAt(0).toUpperCase() + publicData.category.slice(1).toLowerCase()}
              </NamedLink>
              {publicData.subcategory && (
                <>
                  <span className={css.breadcrumbSeparator}>›</span>
                  <NamedLink
                    name="SearchPage"
                    to={{ search: `?keywords=${encodeURIComponent(publicData.subcategory)}` }}
                    className={css.breadcrumbItem}
                  >
                    {publicData.subcategory.charAt(0).toUpperCase() + publicData.subcategory.slice(1).toLowerCase()}
                  </NamedLink>
                </>
              )}
            </div>
          )}

          <div className={css.mainContent}>
            {/* Left Column - Images */}
            <div className={css.imagesColumn}>
              {images.length > 0 && (
                <div className={css.imagesSection}>
                  {/* Main Image with navigation arrows */}
                  <div className={css.mainImageWrapper}>
                    {/* Previous Arrow */}
                    {images.length > 1 && (
                      <button
                        type="button"
                        className={classNames(css.imageNavButton, css.imageNavPrev)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                        }}
                      >
                        <IconArrowHead direction="left" size="big" />
                      </button>
                    )}
                    
                    {mainImageUrl && (
                      <img
                        src={mainImageUrl}
                        alt={`${title} - Image ${selectedImageIndex + 1}`}
                        className={css.mainImage}
                        onClick={() => setImageModalOpen(true)}
                        style={{ cursor: 'zoom-in' }}
                      />
                    )}
                    
                    {/* Next Arrow */}
                    {images.length > 1 && (
                      <button
                        type="button"
                        className={classNames(css.imageNavButton, css.imageNavNext)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                        }}
                      >
                        <IconArrowHead direction="right" size="big" />
                      </button>
                    )}
                    
                    {/* Image counter */}
                    {images.length > 1 && (
                      <div className={css.imageCounter}>
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className={css.thumbnailsContainer}>
                      <div className={css.thumbnailsScroll}>
                        {images.map((image, index) => {
                          const variants = image.attributes?.variants || {};
                          const imageUrl =
                            variants['scaled-small']?.url ||
                            variants['scaled-medium']?.url ||
                            variants['listing-card-2x']?.url ||
                            variants['listing-card']?.url;

                          return (
                            <button
                              key={image.id?.uuid || index}
                              type="button"
                              className={classNames(css.thumbnail, {
                                [css.thumbnailActive]: index === selectedImageIndex,
                              })}
                              onClick={() => setSelectedImageIndex(index)}
                            >
                              <img
                                src={imageUrl}
                                alt={`Thumbnail ${index + 1}`}
                                className={css.thumbnailImage}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {description && (
                    <div className={css.descriptionSection}>
                      <h3 className={css.sectionTitle}>
                        <FormattedMessage id="ProductPage.description" defaultMessage="Descrizione" />
                      </h3>
                      <SectionTextMaybe text={description} showAsIngress />
                    </div>
                  )}

                  {/* Details */}
                  <CustomListingFields
                    publicData={publicData}
                    metadata={metadata}
                    listingFieldConfigs={listingConfig.listingFields}
                    categoryConfiguration={config.categoryConfiguration}
                    intl={intl}
                  />

                  {/* Key Features */}
                  {(() => {
                    const keyFeatures = 
                      publicData.AI_KeyFeatures ||
                      publicData.ai_KeyFeatures ||
                      publicData.ai_keyFeatures ||
                      publicData.keyFeatures ||
                      [];
                    
                    const keyFeaturesArray = Array.isArray(keyFeatures) ? keyFeatures : [];
                    
                    return keyFeaturesArray.length > 0 && (
                      <div className={css.detailsSection}>
                        <h3 className={css.sectionTitle}>
                          <FormattedMessage id="ProductPage.details" defaultMessage="Dettagli" />
                        </h3>
                        <ul className={css.keyFeaturesList}>
                          {keyFeaturesArray.map((feature, index) => (
                            <li key={index} className={css.keyFeatureItem}>
                              <span className={css.keyFeatureBullet}></span>
                              <span>{String(feature)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                                {/* Map (shown if locationVisible is true) - outside images block so it shows even without images */}
              {publicData?.locationVisible && (() => {
                const location = publicData?.location || {};
                const locationGeolocation = location.geolocation || geolocation || null;
                
                // Normalize geolocation format - handle both {lat, lng} and {latitude, longitude}
                let normalizedGeolocation = null;
                if (locationGeolocation) {
                  if (locationGeolocation.lat !== undefined && locationGeolocation.lng !== undefined) {
                    normalizedGeolocation = { lat: locationGeolocation.lat, lng: locationGeolocation.lng };
                  } else if (locationGeolocation.latitude !== undefined && locationGeolocation.longitude !== undefined) {
                    normalizedGeolocation = { lat: locationGeolocation.latitude, lng: locationGeolocation.longitude };
                  } else if (Array.isArray(locationGeolocation) && locationGeolocation.length === 2) {
                    // Handle [lat, lng] or [lng, lat] format
                    normalizedGeolocation = { lat: locationGeolocation[0], lng: locationGeolocation[1] };
                  }
                }
                
                // Use geocoded location if geolocation is not available
                const mapCenter = normalizedGeolocation || geocodedLocation;
                
                // Handle address as object or string
                const addressObj = location.address || {};
                const addressString = typeof addressObj === 'string' 
                  ? addressObj 
                  : addressObj.street && addressObj.streetNumber
                  ? `${addressObj.street} ${addressObj.streetNumber}, ${addressObj.city || ''} ${addressObj.postalCode || ''}`.trim()
                  : addressObj.city || addressObj.address || '';

                return (
                  <div className={css.imagesSection}>
                    <section className={css.mapSection} id="listing-location">
                      {/* Title and badge on same row */}
                      <div className={css.mapSectionHeader}>
                        <Heading as="h2" rootClassName={css.sectionHeading}>
                          <FormattedMessage id="ListingPage.locationTitle" />
                        </Heading>
                        {/* Hand-by-hand exchange badge */}
                        {publicData?.handByHandAvailable && (
                          <div className={css.exchangeBadge}>
                            <span className={css.exchangeBadgeIcon}>🤝</span>
                            <FormattedMessage id="ProductPage.handByHand" defaultMessage="Consegna a mano disponibile" />
                          </div>
                        )}
                      </div>
                      
                      {/* Map */}
                      {mapCenter && mapCenter.lat && mapCenter.lng ? (
                        <div className={css.mapWrapper}>
                          <Map
                            center={mapCenter}
                            obfuscatedCenter={mapCenter}
                            address={addressString}
                            zoom={13}
                            useStaticMap={false}
                            mapsConfig={{
                              ...config.maps,
                              fuzzy: {
                                enabled: true,
                                offset: config.maps?.fuzzy?.offset || 500,
                                defaultZoomLevel: config.maps?.fuzzy?.defaultZoomLevel || 13,
                                circleColor: config.branding?.marketplaceColor || config.maps?.fuzzy?.circleColor || '#4A90E2',
                              },
                            }}
                          />
                          <div className={css.approximateLabel}>
                            <FormattedMessage
                              id="PreviewListingPage.approximateLocation"
                              defaultMessage="Posizione approssimativa per privacy"
                            />
                          </div>
                        </div>
                      ) : isGeocoding ? (
                        <div className={css.addressDisplay}>
                          <FormattedMessage
                            id="PreviewListingPage.geocodingAddress"
                            defaultMessage="Caricamento mappa..."
                          />
                        </div>
                      ) : addressString ? (
                        <div className={css.addressDisplay}>
                          <span className={css.locationIcon}>📍</span>
                          <span>{addressString}</span>
                        </div>
                      ) : null}
                    </section>
                  </div>
                );
              })()}

                  {/* Reviews */}
                  <SectionReviews reviews={reviews} fetchReviewsError={fetchReviewsError} />
                  
                  {/* Listing creation date */}
                  {(currentListing.attributes?.createdAt || currentListing.createdAt) && (
                    <div className={css.listingCreationDate}>
                      <FormattedMessage
                        id="ProductPage.listingCreated"
                        defaultMessage="Annuncio creato il {date}"
                        values={{
                          date: intl.formatDate(
                            currentListing.attributes?.createdAt || currentListing.createdAt,
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          ),
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Title, Price, Author, Booking Form */}
            <div className={css.infoColumn}>
              {/* Action Bar (for own listing) */}
              {mounted && currentListing.id && isOwnListing && (
                <ActionBarMaybe
                  className={css.actionBar}
                  isOwnListing={isOwnListing}
                  listing={currentListing}
                  showNoPayoutDetailsSet={noPayoutDetailsSetWithOwnListing}
                  currentUser={currentUser}
                  editParams={{
                    id: listingId.uuid,
                    slug: listingSlug,
                    type: listingPathParamType,
                    tab: listingTab,
                  }}
                />
              )}

              {/* Title */}
              <H4 as="h1" className={css.listingTitle}>
                {richTitle}
              </H4>

              {/* Price */}
              {price && (
                <div className={css.priceContainer}>
                  <span className={css.price}>{formattedPrice}</span>
                  <span className={css.perUnit}>
                    <FormattedMessage id="ProductPage.perUnit" values={{ unitType }} />
                  </span>
                </div>
              )}

              {/* Author */}
              <div className={css.authorSection}>
                <AvatarSmall user={ensuredAuthor} className={css.authorAvatar} />
                <div className={css.authorInfo}>
                  <span className={css.authorName}>
                    <FormattedMessage
                      id="ProductPage.hostedBy"
                      defaultMessage="Offerto da {name}"
                      values={{
                        name: (
                          <NamedLink
                            className={css.authorNameLink}
                            name="ProfilePage"
                            params={{ id: ensuredAuthor.id?.uuid }}
                          >
                            {authorDisplayName}
                          </NamedLink>
                        ),
                      }}
                    />
                    </span>
                  <div className={css.authorRating}>
                    <ReviewRating
                      rating={authorAverageRatingRounded}
                      className={css.authorReviewRating}
                      reviewStarClassName={css.authorReviewStar}
                    />
                      <span className={css.authorReviewsCount}>({authorReviewsCount})</span>
                  </div>
                </div>
              </div>

              {/* Booking Form */}
              {isBooking && !isClosed && (
                <BookingForm
                  listing={currentListing}
                  isOwnListing={isOwnListing}
                  onSubmit={handleOrderSubmit}
                  intl={intl}
                  config={config}
                  monthlyTimeSlots={monthlyTimeSlots}
                  onFetchTimeSlots={onFetchTimeSlots}
                  onFetchTransactionLineItems={onFetchTransactionLineItems}
                  lineItems={lineItems}
                  fetchLineItemsInProgress={fetchLineItemsInProgress}
                  fetchLineItemsError={fetchLineItemsError}
                  dayCountAvailableForBooking={config.stripe.dayCountAvailableForBooking}
                  marketplaceName={marketplaceName}
                  payoutDetailsWarning={payoutDetailsWarning}
                />
              )}

              {/* Closed Listing Message */}
              {isClosed && (
                <div className={css.closedListing}>
                  <FormattedMessage id="ProductPage.closedListing" defaultMessage="Questo annuncio è chiuso" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Modal */}
        <Modal
          id="ProductPage.imageModal"
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          onManageDisableScrolling={onManageDisableScrolling}
          containerClassName={css.imageModal}
          usePortal
        >
          <div className={css.imageModalContent}>
            {/* Previous Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                className={classNames(css.modalNavButton, css.modalNavPrev)}
                onClick={() => setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
              >
                <IconArrowHead direction="left" size="big" />
              </button>
            )}
            
            {mainImageUrl && (
              <img
                src={mainImageUrl}
                alt={`${title} - Image ${selectedImageIndex + 1}`}
                className={css.modalImage}
              />
            )}
            
            {/* Next Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                className={classNames(css.modalNavButton, css.modalNavNext)}
                onClick={() => setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
              >
                <IconArrowHead direction="right" size="big" />
              </button>
            )}
            
            {/* Image counter in modal */}
            {images.length > 1 && (
              <div className={css.modalImageCounter}>
                {selectedImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </Modal>
      </LayoutSingleColumn>
    </Page>
  );
};

const EnhancedProductPage = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  const showListingError = props.showListingError;
  const isVariant = props.params?.variant != null;
  const currentUser = props.currentUser;
  
  if (isForbiddenError(showListingError) && !isVariant && !currentUser) {
    return (
      <NamedRedirect
        name="SignupPage"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  const isPrivateMarketplace = config.accessControl.marketplace.private === true;
  const isUnauthorizedUser = currentUser && !isUserAuthorized(currentUser);
  const hasNoViewingRights = currentUser && !hasPermissionToViewData(currentUser);
  const hasUserPendingApprovalError = isErrorUserPendingApproval(showListingError);

  if ((isPrivateMarketplace && isUnauthorizedUser) || hasUserPendingApprovalError) {
    return (
      <NamedRedirect
        name="NoAccessPage"
        params={{ missingAccessRight: NO_ACCESS_PAGE_USER_PENDING_APPROVAL }}
      />
    );
  } else if (
    (hasNoViewingRights && isForbiddenError(showListingError)) ||
    isErrorNoViewingPermission(showListingError)
  ) {
    return (
      <NamedRedirect
        name="NoAccessPage"
        params={{ missingAccessRight: NO_ACCESS_PAGE_VIEW_LISTINGS }}
      />
    );
  }

  return (
    <ProductPageComponent
      config={config}
      routeConfiguration={routeConfiguration}
      intl={intl}
      history={history}
      location={location}
      showOwnListingsOnly={hasNoViewingRights}
      {...props}
    />
  );
};

const mapStateToProps = state => {
  const { isAuthenticated } = state.auth;
  const {
    showListingError,
    reviews,
    fetchReviewsError,
    monthlyTimeSlots,
    timeSlotsForDate,
    sendInquiryInProgress,
    sendInquiryError,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    inquiryModalOpenForListingId,
  } = state.ListingPage;
  const {
    authorReviews = [],
    queryAuthorReviewsError = null,
  } = state.ProductPage || { authorReviews: [], queryAuthorReviewsError: null };
  const { currentUser } = state.user;

  const getListing = id => {
    const ref = { id, type: 'listing' };
    const listings = getMarketplaceEntities(state, [ref]);
    return listings.length === 1 ? listings[0] : null;
  };

  const getOwnListing = id => {
    const ref = { id, type: 'ownListing' };
    const listings = getMarketplaceEntities(state, [ref]);
    return listings.length === 1 ? listings[0] : null;
  };

  return {
    isAuthenticated,
    currentUser,
    getListing,
    getOwnListing,
    scrollingDisabled: isScrollingDisabled(state),
    inquiryModalOpenForListingId,
    showListingError,
    reviews,
    fetchReviewsError,
    authorReviews,
    queryAuthorReviewsError,
    monthlyTimeSlots,
    timeSlotsForDate,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    sendInquiryInProgress,
    sendInquiryError,
  };
};

const mapDispatchToProps = dispatch => ({
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  callSetInitialValues: (setInitialValues, values, saveToSessionStorage) =>
    dispatch(setInitialValues(values, saveToSessionStorage)),
  onFetchTransactionLineItems: params => dispatch(fetchTransactionLineItems(params)),
  onSendInquiry: (listing, message) => dispatch(sendInquiry(listing, message)),
  onInitializeCardPaymentData: () => dispatch(initializeCardPaymentData()),
  onFetchTimeSlots: (listingId, start, end, timeZone, options) =>
    dispatch(fetchTimeSlots(listingId, start, end, timeZone, options)),
});

const ProductPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EnhancedProductPage);

export default ProductPage;
