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
import { getLocalizedCategoryName } from '../../util/string';
import { types as sdkTypes } from '../../util/sdkLoader';
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
  ensureCurrentUser,
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
import { sendVerificationEmail } from '../../ducks/user.duck';

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
import EmailReminder from '../../components/ModalMissingInformation/EmailReminder';

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
  fetchAvailabilityForCalendar,
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
import InquiryForm from '../ListingPage/InquiryForm/InquiryForm';
import SectionTextMaybe from '../ListingPage/SectionTextMaybe';
import SectionReviews from '../ListingPage/SectionReviews';
import CustomListingFields from '../ListingPage/CustomListingFields';
import EstimatedCustomerBreakdownMaybe from '../../components/OrderPanel/EstimatedCustomerBreakdownMaybe';
import OwnerCard from './OwnerCard';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import css from './ProductPage.module.css';

const MIN_LENGTH_FOR_LONG_WORDS_IN_TITLE = 16;
const TODAY = new Date();
const MAX_BOOKING_DAYS = 80;

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
    onFetchAvailabilityForCalendar,
    onFetchTransactionLineItems,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    dayCountAvailableForBooking,
    marketplaceName,
    payoutDetailsWarning,
    currentUser,
    onResendVerificationEmail,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    onManageDisableScrolling,
  } = props;

  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);

  const publicData = listing?.attributes?.publicData || {};
  const price = listing?.attributes?.price;
  const timeZone = listing?.attributes?.availabilityPlan?.timezone || 'Europe/Rome';
  const priceVariants = publicData?.priceVariants || [];
  const currency = price?.currency || 'EUR';
  const marketplaceColor = config.branding?.marketplaceColor || '#4A90E2';

  const handByHandAvailable = !!publicData?.handByHandAvailable;
  const shippingEnabled = publicData?.shippingEnabled !== false;
  const pickupEnabled = !!publicData?.pickupEnabled;
  const hasDeliveryMethodChoice =
    (handByHandAvailable && shippingEnabled) || (handByHandAvailable && pickupEnabled) || (shippingEnabled && pickupEnabled);
  const defaultDeliveryMethod = shippingEnabled
    ? 'shipping'
    : handByHandAvailable
    ? 'hand-by-hand'
    : pickupEnabled
    ? 'pickup'
    : null;

  const [availableDates, setAvailableDates] = useState([]);
  const [disabledDates, setDisabledDates] = useState([]);
  const [calendarSelectedDates, setCalendarSelectedDates] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState(defaultDeliveryMethod);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  // Fetch availability from timeslots (works for guests and owners)
  useEffect(() => {
    if (!listing?.id || !onFetchAvailabilityForCalendar) return;

    const paddingOptions = {
      unavailabilityPaddingStart: config?.listing?.unavailabilityPaddingStart ?? 0,
      unavailabilityPaddingEnd: config?.listing?.unavailabilityPaddingEnd ?? 0,
    };
    setIsLoadingAvailability(true);
    onFetchAvailabilityForCalendar(listing, paddingOptions)
      .then(({ availableDates: available, disabledDates: disabled }) => {
        setAvailableDates(available || []);
        setDisabledDates(disabled || []);
      })
      .catch(() => {
        setAvailableDates([]);
        setDisabledDates([]);
      })
      .finally(() => setIsLoadingAvailability(false));
  }, [listing?.id, onFetchAvailabilityForCalendar, config?.listing?.unavailabilityPaddingStart, config?.listing?.unavailabilityPaddingEnd]);

  const fetchLineItemsForDatesAndDelivery = (startDate, endDate, dm, coupon = couponCode) => {
    const method = dm ?? deliveryMethod;
    const endDateForAPI = new Date(endDate);
    endDateForAPI.setDate(endDateForAPI.getDate() + 1);

    const orderData = {
      bookingStart: startDate,
      bookingEnd: endDateForAPI,
      ...(method && { deliveryMethod: method }),
      ...(coupon && coupon.trim() && { couponCode: coupon.trim() }),
    };

    onFetchTransactionLineItems({
      orderData,
      listingId: listing.id,
      isOwnListing,
    });
  };

  const handleApplyCoupon = () => {
    if (calendarSelectedDates.length >= 2) {
      fetchLineItemsForDatesAndDelivery(
        calendarSelectedDates[0],
        calendarSelectedDates[calendarSelectedDates.length - 1],
        undefined,
        couponCode
      );
      if (couponCode.trim()) setCouponApplied(true);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    if (calendarSelectedDates.length >= 2) {
      fetchLineItemsForDatesAndDelivery(
        calendarSelectedDates[0],
        calendarSelectedDates[calendarSelectedDates.length - 1],
        undefined,
        ''
      );
    }
  };

  const handleCalendarDatesChange = (dates) => {
    setCalendarSelectedDates(dates || []);

    if (dates && dates.length >= 2) {
      fetchLineItemsForDatesAndDelivery(dates[0], dates[dates.length - 1]);
    }
  };

  const handleDeliveryMethodChange = (value) => {
    setDeliveryMethod(value);
    if (calendarSelectedDates.length >= 2) {
      fetchLineItemsForDatesAndDelivery(
        calendarSelectedDates[0],
        calendarSelectedDates[calendarSelectedDates.length - 1],
        value
      );
    }
  };

  // Check if user is logged in but not verified
  const user = ensureCurrentUser(currentUser);
  const isUserUnverified = user.id && !user.attributes?.emailVerified;

  const handleFormSubmit = () => {
    if (calendarSelectedDates.length < 2) return;

    // If user is not verified, show email verification modal
    if (isUserUnverified && onResendVerificationEmail) {
      setShowEmailVerificationModal(true);
      return;
    }

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
      ...(deliveryMethod && { deliveryMethod }),
      ...(couponCode && couponCode.trim() && { couponCode: couponCode.trim() }),
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
  const showBreakdownSkeleton = fetchLineItemsInProgress;

  return (
    <div className={css.bookingFormWrapper}>
      {/* Availability Calendar */}
      <div className={css.calendarSection}>
        {isLoadingAvailability ? (
          <div className={css.calendarSkeleton} aria-busy="true" aria-live="polite">
            <SkeletonTheme baseColor="#e0e0e0" highlightColor="#f0f0f0" duration={1.4} enableAnimation>
              <div className={css.calendarSkeletonNav}>
                <Skeleton circle width={40} height={40} />
                <Skeleton circle width={40} height={40} />
              </div>
              <div className={css.calendarSkeletonMonth}>
                <Skeleton width={140} height={24} />
              </div>
              <div className={css.calendarSkeletonDayNames}>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} width="100%" height={16} />
                ))}
              </div>
              <div className={css.calendarSkeletonGrid}>
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} circle width={36} height={36} />
                ))}
              </div>
            </SkeletonTheme>
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
            maxBookingDays={MAX_BOOKING_DAYS}
          />
        )}
      </div>

      {/* Delivery method toggle chips - when multiple options */}
      {hasValidDates && hasDeliveryMethodChoice && (
        <div className={css.deliveryMethodSection}>
          <span className={css.deliveryMethodLabel}>
            <FormattedMessage id="BookingDatesForm.deliveryMethodLabel" />
          </span>
          <div className={css.deliveryMethodChips}>
            {shippingEnabled && (
              <button
                type="button"
                className={`${css.deliveryChip} ${deliveryMethod === 'shipping' ? css.deliveryChipSelected : ''}`}
                onClick={() => handleDeliveryMethodChange('shipping')}
                style={
                  deliveryMethod === 'shipping'
                    ? {
                        backgroundColor: marketplaceColor,
                        borderColor: marketplaceColor,
                        color: 'white',
                      }
                    : {}
                }
              >
                {intl.formatMessage({ id: 'BookingDatesForm.shippingOption' })}
              </button>
            )}
            {handByHandAvailable && (
              <button
                type="button"
                className={`${css.deliveryChip} ${deliveryMethod === 'hand-by-hand' ? css.deliveryChipSelected : ''}`}
                onClick={() => handleDeliveryMethodChange('hand-by-hand')}
                style={
                  deliveryMethod === 'hand-by-hand'
                    ? {
                        backgroundColor: marketplaceColor,
                        borderColor: marketplaceColor,
                        color: 'white',
                      }
                    : {}
                }
              >
                {intl.formatMessage({ id: 'BookingDatesForm.handByHandOption' })}
              </button>
            )}
            {pickupEnabled && (
              <button
                type="button"
                className={`${css.deliveryChip} ${deliveryMethod === 'pickup' ? css.deliveryChipSelected : ''}`}
                onClick={() => handleDeliveryMethodChange('pickup')}
                style={
                  deliveryMethod === 'pickup'
                    ? {
                        backgroundColor: marketplaceColor,
                        borderColor: marketplaceColor,
                        color: 'white',
                      }
                    : {}
                }
              >
                {intl.formatMessage({ id: 'BookingDatesForm.pickupOption' })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Estimated Breakdown - show skeleton when refetching line items */}
      {hasValidDates && (showEstimatedBreakdown || showBreakdownSkeleton) && (
        <div className={css.breakdownSection}>
          <H6 as="h3" className={css.breakdownTitle}>
            <FormattedMessage id="ProductPage.priceBreakdownTitle" defaultMessage="Riepilogo prezzo" />
          </H6>
          <hr className={css.breakdownDivider} />
          {showBreakdownSkeleton ? (
            <div className={css.breakdownSkeleton} aria-busy="true" aria-live="polite">
              <SkeletonTheme
                baseColor="#e0e0e0"
                highlightColor="#f0f0f0"
                duration={1.4}
                enableAnimation
              >
                {/* Match real breakdown: booking period, base, shipping, insurance, subtotal, total */}
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className={css.skeletonLine}>
                    <Skeleton width="50%" height={20} />
                    <Skeleton width="24%" height={20} />
                  </div>
                ))}
                <div className={css.skeletonLineTotal}>
                  <Skeleton width="22%" height={22} />
                  <Skeleton width="30%" height={22} />
                </div>
              </SkeletonTheme>
            </div>
          ) : (
            <EstimatedCustomerBreakdownMaybe
              breakdownData={breakdownData}
              lineItems={lineItems}
              timeZone={timeZone}
              currency={currency}
              marketplaceName={marketplaceName}
              processName={BOOKING_PROCESS_NAME}
              childrenAfterBookingPeriod={
                <div className={css.couponSection}>
                  <label htmlFor="productPage-couponCode" className={css.couponLabel}>
                    <FormattedMessage id="BookingDatesForm.couponCodeLabel" />
                  </label>
                  <div className={css.couponRow}>
                    <input
                      id="productPage-couponCode"
                      type="text"
                      className={css.couponInput}
                      value={couponCode}
                      onChange={e => {
                        setCouponCode(e.target.value);
                        setCouponApplied(false);
                      }}
                      placeholder={intl.formatMessage({ id: 'BookingDatesForm.couponCodePlaceholder' })}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className={css.couponApplyButton}
                      onClick={couponApplied ? handleRemoveCoupon : handleApplyCoupon}
                      disabled={fetchLineItemsInProgress}
                      style={{
                        backgroundColor: marketplaceColor,
                        color: 'white',
                      }}
                    >
                      {couponApplied ? (
                        <FormattedMessage id="ProductPage.couponRemove" defaultMessage="Remove" />
                      ) : (
                        <FormattedMessage id="ProductPage.couponApply" defaultMessage="Apply" />
                      )}
                    </button>
                  </div>
                </div>
              }
            />
          )}
          {/* Coupon code when skeleton is shown (when real breakdown is shown, coupon is inside OrderBreakdown after booking period) */}
          {hasValidDates && (showEstimatedBreakdown || showBreakdownSkeleton) && showBreakdownSkeleton && (
            <div className={css.couponSection}>
              <label htmlFor="productPage-couponCode-skeleton" className={css.couponLabel}>
                <FormattedMessage id="BookingDatesForm.couponCodeLabel" />
              </label>
              <div className={css.couponRow}>
                <input
                  id="productPage-couponCode-skeleton"
                  type="text"
                  className={css.couponInput}
                  value={couponCode}
                  onChange={e => {
                    setCouponCode(e.target.value);
                    setCouponApplied(false);
                  }}
                  placeholder={intl.formatMessage({ id: 'BookingDatesForm.couponCodePlaceholder' })}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={css.couponApplyButton}
                  onClick={couponApplied ? handleRemoveCoupon : handleApplyCoupon}
                  disabled={fetchLineItemsInProgress}
                  style={{
                    backgroundColor: marketplaceColor,
                    color: 'white',
                  }}
                >
                  {couponApplied ? (
                    <FormattedMessage id="ProductPage.couponRemove" defaultMessage="Remove" />
                  ) : (
                    <FormattedMessage id="ProductPage.couponApply" defaultMessage="Apply" />
                  )}
                </button>
              </div>
            </div>
          )}
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

      {/* Email Verification Modal */}
      {showEmailVerificationModal && user.id && (
        <Modal
          id="ProductPageBookingEmailVerificationReminder"
          isOpen={showEmailVerificationModal}
          onClose={() => setShowEmailVerificationModal(false)}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
          closeButtonMessage={
            <FormattedMessage id="ModalMissingInformation.closeVerifyEmailReminder" />
          }
        >
          <EmailReminder
            user={user}
            onResendVerificationEmail={onResendVerificationEmail}
            sendVerificationEmailInProgress={sendVerificationEmailInProgress}
            sendVerificationEmailError={sendVerificationEmailError}
          />
        </Modal>
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
    onFetchAvailabilityForCalendar,
    monthlyTimeSlots,
    onFetchTransactionLineItems,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    showOwnListingsOnly,
    onResendVerificationEmail,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    sendInquiryInProgress,
    sendInquiryError,
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
          {/* Mobile Header - ActionBar, Title, Price, Author (visible only on mobile) */}
          <div
            className={classNames(
              css.mobileHeader,
              mounted && currentListing.id && isOwnListing && css.mobileHeaderWithActionBar
            )}
          >
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
              <>
                <div className={css.priceContainer}>
                  <div className={css.priceInfo}>
                    <span className={css.price}>{formattedPrice}</span>
                    <span className={css.perUnit}>
                      <FormattedMessage id="ProductPage.perUnit" values={{ unitType }} />
                    </span>
                  </div>
                </div>
                {isBooking && !isClosed && (
                  <button
                    type="button"
                    className={css.mobileRequestToBookLink}
                    onClick={() => {
                      const el = document.getElementById('mobile-booking-form');
                      if (el) {
                        const topbar = document.querySelector('[class*="Topbar_container"]') ||
                                       document.querySelector('[class*="TopbarDesktop"]') ||
                                       document.querySelector('nav');
                        const navbarHeight = topbar ? topbar.offsetHeight : 64;
                        const offset = el.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                        window.scrollTo({ top: offset, behavior: 'smooth' });
                      }
                    }}
                  >
                    <FormattedMessage id="ProductPage.requestToBook" defaultMessage="Richiedi prenotazione" />
                  </button>
                )}
              </>
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
                {authorReviewsCount > 0 && (
                  <div className={css.authorRating}>
                    <ReviewRating
                      rating={authorAverageRatingRounded}
                      className={css.authorReviewRating}
                      reviewStarClassName={css.authorReviewStar}
                    />
                    <span className={css.authorReviewsCount}>({authorReviewsCount})</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={css.mobileViewOwnerCardLink}
                onClick={() => {
                  const el = document.getElementById('owner-card');
                  if (el) {
                    const topbar = document.querySelector('[class*="Topbar_container"]') ||
                                   document.querySelector('[class*="TopbarDesktop"]') ||
                                   document.querySelector('nav');
                    const navbarHeight = topbar ? topbar.offsetHeight : 64;
                    const offset = el.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                    window.scrollTo({ top: offset, behavior: 'smooth' });
                  }
                }}
              >
                <FormattedMessage id="ProductPage.viewOwnerCard" defaultMessage="Scheda proprietario" />
              </button>
            </div>
          </div>

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

                  {/* Breadcrumb (between images and description) */}
                  {publicData?.category && (
                    <nav
                      className={css.breadcrumb}
                      aria-label={intl.formatMessage({
                        id: 'ProductPage.breadcrumbNavigation',
                        defaultMessage: 'Navigazione breadcrumb',
                      })}
                    >
                      <ol className={css.breadcrumbList}>
                        {!publicData.subcategory && !publicData.thirdCategory ? (
                          <li className={css.breadcrumbListItem}>
                            <span className={css.breadcrumbCurrent} aria-current="page">
                              {getLocalizedCategoryName(intl, publicData.category)}
                            </span>
                          </li>
                        ) : (
                          <>
                            <li className={css.breadcrumbListItem}>
                              <NamedLink
                                name="SearchPage"
                                to={{ search: `?keywords=${encodeURIComponent(publicData.category)}` }}
                                className={css.breadcrumbItem}
                              >
                                {getLocalizedCategoryName(intl, publicData.category)}
                              </NamedLink>
                            </li>
                            {publicData.subcategory && (
                              <>
                                <li className={css.breadcrumbSeparatorItem} aria-hidden="true">
                                  <span className={css.breadcrumbSeparator}>›</span>
                                </li>
                                <li className={css.breadcrumbListItem}>
                                  {publicData.thirdCategory ? (
                                    <NamedLink
                                      name="SearchPage"
                                      to={{
                                        search: `?keywords=${encodeURIComponent(publicData.subcategory)}`,
                                      }}
                                      className={css.breadcrumbItem}
                                    >
                                      {getLocalizedCategoryName(intl, publicData.subcategory)}
                                    </NamedLink>
                                  ) : (
                                    <span className={css.breadcrumbCurrent} aria-current="page">
                                      {getLocalizedCategoryName(intl, publicData.subcategory)}
                                    </span>
                                  )}
                                </li>
                              </>
                            )}
                            {publicData.thirdCategory && (
                              <>
                                <li className={css.breadcrumbSeparatorItem} aria-hidden="true">
                                  <span className={css.breadcrumbSeparator}>›</span>
                                </li>
                                <li className={css.breadcrumbListItem}>
                                  <NamedLink
                                    name="SearchPage"
                                    to={{
                                      search: `?keywords=${encodeURIComponent(publicData.thirdCategory)}`,
                                    }}
                                    className={css.breadcrumbItem}
                                  >
                                    {getLocalizedCategoryName(intl, publicData.thirdCategory)}
                                  </NamedLink>
                                </li>
                              </>
                            )}
                          </>
                        )}
                      </ol>
                    </nav>
                  )}

                  {/* Description */}
                  {description && (
                    <div className={css.descriptionSection}>
                      <h3 className={css.sectionTitle}>
                        <FormattedMessage id="ProductPage.description" defaultMessage="Descrizione" />
                      </h3>
                      <SectionTextMaybe text={description} showAsIngress />
                      
                      {/* Listing creation date - below description, aligned right */}
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
                      publicData.keyFeatures ||
                      publicData.key_features ||
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

                  {/* Booking Form - Mobile (after details, before location) */}
                  {isBooking && !isClosed && (
                    <div id="mobile-booking-form" className={css.mobileBookingForm}>
                      <BookingForm
                        onFetchAvailabilityForCalendar={onFetchAvailabilityForCalendar}
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
                        currentUser={currentUser}
                        onResendVerificationEmail={onResendVerificationEmail}
                        sendVerificationEmailInProgress={sendVerificationEmailInProgress}
                        sendVerificationEmailError={sendVerificationEmailError}
                        onManageDisableScrolling={onManageDisableScrolling}
                      />
                    </div>
                  )}

                  {/* Owner Card with location map */}
                  <div id="owner-card">
                    <OwnerCard
                    author={ensuredAuthor}
                    authorReviews={authorReviews}
                    listing={currentListing}
                    onContactUser={onContactUser}
                    config={config}
                    intl={intl}
                    isOwnListing={isOwnListing}
                    geolocation={geolocation}
                    geocodedLocation={geocodedLocation}
                    isGeocoding={isGeocoding}
                  />
                  </div>

                  {/* Reviews */}
                  <SectionReviews reviews={reviews} fetchReviewsError={fetchReviewsError} />
                </div>
              )}
            </div>

            {/* Right Column - Title, Price, Author, Booking Form (Desktop) */}
            <div className={css.infoColumn}>
              {/* Action Bar (for own listing) - Desktop only */}
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

              {/* Title - Desktop only */}
              <H4 as="h1" className={css.listingTitle}>
                {richTitle}
              </H4>

              {/* Price - Desktop only */}
              {price && (
                <div className={css.priceContainer}>
                  <span className={css.price}>{formattedPrice}</span>
                  <span className={css.perUnit}>
                    <FormattedMessage id="ProductPage.perUnit" values={{ unitType }} />
                  </span>
                </div>
              )}

              {/* Author - Desktop only */}
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
                  {authorReviewsCount > 0 && (
                    <div className={css.authorRating}>
                      <ReviewRating
                        rating={authorAverageRatingRounded}
                        className={css.authorReviewRating}
                        reviewStarClassName={css.authorReviewStar}
                      />
                      <span className={css.authorReviewsCount}>({authorReviewsCount})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Form - Desktop only */}
              {isBooking && !isClosed && (
                <div className={css.desktopBookingForm}>
                  <BookingForm
                    onFetchAvailabilityForCalendar={onFetchAvailabilityForCalendar}
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
                    currentUser={currentUser}
                    onResendVerificationEmail={onResendVerificationEmail}
                    sendVerificationEmailInProgress={sendVerificationEmailInProgress}
                    sendVerificationEmailError={sendVerificationEmailError}
                    onManageDisableScrolling={onManageDisableScrolling}
                  />
                </div>
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

        {/* Inquiry Modal - for Contatta button */}
        <Modal
          id="ProductPage.inquiry"
          contentClassName={css.inquiryModalContent}
          isOpen={isAuthenticated && inquiryModalOpen}
          onClose={() => setInquiryModalOpen(false)}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <InquiryForm
            className={css.inquiryForm}
            submitButtonWrapperClassName={css.inquirySubmitButtonWrapper}
            listingTitle={title}
            authorDisplayName={authorDisplayName}
            sendInquiryError={sendInquiryError}
            onSubmit={onSubmitInquiry}
            inProgress={sendInquiryInProgress}
          />
        </Modal>

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
  const {
    currentUser,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
  } = state.user;

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
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
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
  onFetchAvailabilityForCalendar: (listing, options) =>
    dispatch(fetchAvailabilityForCalendar(listing, options)),
  onResendVerificationEmail: () => dispatch(sendVerificationEmail()),
});

const ProductPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EnhancedProductPage);

export default ProductPage;
