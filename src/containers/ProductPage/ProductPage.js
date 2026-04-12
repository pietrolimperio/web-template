import React, { useState, useEffect, useRef } from 'react';
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
import { types as sdkTypes } from '../../util/sdkLoader';
import { getCategoryNamesFromIds, getShortLocaleForCategoryDisplay } from '../../util/fieldHelpers';
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
import { formatMoney, getOrderTotalInMinorUnits } from '../../util/currency';
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
  AspectRatioWrapper,
  ResponsiveImage,
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
  fetchAutoDiscounts,
} from '../ListingPage/ListingPage.duck';

import {
  LoadingPage,
  ErrorPage,
  priceData,
  listingImages,
  listingWithoutThumbnailOnly,
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
import FetchLineItemsError from '../../components/OrderPanel/FetchLineItemsError/FetchLineItemsError';
import OwnerCard from './OwnerCard';
import { validateCoupon, isLeazBackendApiAvailable } from '../../util/leazBackendApi';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import ProductListingCard from '../../components/ProductListingCard/ProductListingCard';
import productListingCardCss from '../../components/ProductListingCard/ProductListingCard.module.css';

import css from './ProductPage.module.css';

const MIN_LENGTH_FOR_LONG_WORDS_IN_TITLE = 16;
const TODAY = new Date();
const MAX_BOOKING_DAYS = 80;

const MOCK_REVIEWS = [
  {
    id: { uuid: 'mock-review-1' },
    attributes: {
      rating: 5,
      content: 'Prodotto in condizioni perfette, esattamente come descritto. Il proprietario è stato molto disponibile e puntuale nella consegna. Consigliatissimo!',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    author: {
      id: { uuid: 'mock-author-1' },
      type: 'user',
      attributes: {
        banned: false,
        deleted: false,
        profile: { displayName: 'Marco R.', abbreviatedName: 'MR' },
      },
    },
  },
  {
    id: { uuid: 'mock-review-2' },
    attributes: {
      rating: 4,
      content: 'Ottima esperienza di noleggio. Il prodotto funzionava benissimo. Unica nota: la riconsegna potrebbe essere più flessibile.',
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    },
    author: {
      id: { uuid: 'mock-author-2' },
      type: 'user',
      attributes: {
        banned: false,
        deleted: false,
        profile: { displayName: 'Giulia L.', abbreviatedName: 'GL' },
      },
    },
  },
  {
    id: { uuid: 'mock-review-3' },
    attributes: {
      rating: 5,
      content: 'Fantastico! Ho noleggiato per un weekend e tutto è andato alla grande. Tornerò sicuramente.',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    author: {
      id: { uuid: 'mock-author-3' },
      type: 'user',
      attributes: {
        banned: false,
        deleted: false,
        profile: { displayName: 'Alessandro P.', abbreviatedName: 'AP' },
      },
    },
  },
];

const MOCK_RELATED_PRODUCTS = [
  {
    id: 'related-1',
    title: 'Zaino da Trekking 65L',
    price: '€12',
    category: 'Sport e Tempo Libero',
    owner: 'Marco R.',
    estimatedNewPrice: '€189',
    image: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=400&h=533&fit=crop',
  },
  {
    id: 'related-2',
    title: 'Tenda Campeggio 4 Posti',
    price: '€25',
    category: 'Outdoor',
    owner: 'Giulia L.',
    estimatedNewPrice: '€320',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=533&fit=crop',
  },
  {
    id: 'related-3',
    title: 'Macchina Fotografica Vintage',
    price: '€18',
    category: 'Fotografia',
    owner: 'Alessandro P.',
    estimatedNewPrice: '€450',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=533&fit=crop',
  },
  {
    id: 'related-4',
    title: 'Set Valigie Premium',
    price: '€30',
    category: 'Viaggi',
    owner: 'Sara M.',
    estimatedNewPrice: '€280',
    image: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=533&fit=crop',
  },
];

/**
 * Returns the best applicable automatic discount from an array.
 * Prefers percentage discounts with the highest value.
 */
const getBestDiscount = (discounts = []) => {
  if (!discounts.length) return null;
  return discounts.reduce((best, d) => {
    if (!best) return d;
    if (d.type === 'percentage' && best.type !== 'percentage') return d;
    if (d.type === best.type && d.value > best.value) return d;
    return best;
  }, null);
};

const formatDiscountLabel = (discount, intl) => {
  if (!discount) return null;
  if (discount.type === 'percentage') {
    return `-${discount.value}%`;
  }
  return `-${(discount.value / 100).toFixed(2)} €`;
};

const { UUID, Money } = sdkTypes;

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
    const variantType = variant.type || (variant.period || variant.dates ? 'period' : 'duration');

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

    if (variantType === 'period' && variant.period && typeof variant.period === 'string' && variant.period.trim()) {
      const formatPeriodDate = dateStr => {
        if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
          const year = parseInt(dateStr.substring(0, 4), 10);
          const month = parseInt(dateStr.substring(4, 6), 10) - 1;
          const day = parseInt(dateStr.substring(6, 8), 10);
          const date = new Date(year, month, day);
          const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
          return `${date.getDate()} ${monthNames[date.getMonth()]}`;
        }

        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
          return `${parsedDate.getDate()} ${monthNames[parsedDate.getMonth()]}`;
        }

        return dateStr;
      };

      const periodValues = variant.period.split(',').map(value => value.trim()).filter(Boolean);
      const firstPeriod = periodValues[0];

      if (firstPeriod && firstPeriod.includes('-')) {
        const [startStr, endStr] = firstPeriod.split('-').map(s => s.trim());
        if (startStr && endStr) {
          return `${formatPeriodDate(startStr)} - ${formatPeriodDate(endStr)}`;
        }
      }

      if (periodValues.length > 1) {
        const startStr = periodValues[0];
        const endStr = periodValues[periodValues.length - 1];
        if (startStr && endStr) {
          return `${formatPeriodDate(startStr)} - ${formatPeriodDate(endStr)}`;
        }
      }

      return formatPeriodDate(firstPeriod);
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
    
    if (variantType === 'period') {
      return '';
    }

    return variant.name || '';
  };

  const priceDisplay =
    variant.percentageDiscount != null
      ? `-${variant.percentageDiscount}%`
      : formatMoney(intl, new Money(variant.priceInSubunits, currency));

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

  const unitType = publicData?.unitType || 'day';
  const minimumBookingDays = config?.listing?.minimumBookingDays ?? 0;
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
  const [couponData, setCouponData] = useState(null); // { id, type, value } from validation
  const [couponError, setCouponError] = useState(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  const autoDiscounts = props.autoDiscounts || [];

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
      ...(autoDiscounts.length > 0 && { autoDiscounts }),
    };

    onFetchTransactionLineItems({
      orderData,
      listingId: listing.id,
      isOwnListing,
    });
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;

    if (!isLeazBackendApiAvailable()) {
      setCouponError('Coupon validation is not available');
      return;
    }

    setCouponError(null);
    setCouponValidating(true);

    try {
      const listingIdStr = listing?.id?.uuid ?? listing?.id ?? null;
      if (!listingIdStr) {
        setCouponError(intl.formatMessage({ id: 'ProductPage.couponError', defaultMessage: 'Errore durante la validazione del coupon' }));
        return;
      }
      const locale = (typeof localStorage !== 'undefined' && localStorage.getItem('marketplace_locale')) || intl.locale || 'it';
      const localeBase = locale.split('-')[0] || 'it';

      const orderTotal = lineItems ? getOrderTotalInMinorUnits(lineItems) : undefined;

      const result = await validateCoupon({
        code,
        listingId: String(listingIdStr),
        locale: localeBase,
        orderTotal,
      });

      if (result.valid) {
        setCouponApplied(true);
        setCouponData(
          result.id
            ? {
                id: result.id,
                type: result.type,
                value: result.value,
                minOrderValue: result.minOrderValue,
              }
            : null
        );
        if (canShowFullBookingUI) {
          fetchLineItemsForDatesAndDelivery(
            calendarSelectedDates[0],
            calendarSelectedDates[calendarSelectedDates.length - 1],
            undefined,
            code
          );
        }
      } else {
        let message;
        if (result.reasonCode === 'DISCOUNT_ALREADY_ACTIVE') {
          message = intl.formatMessage({
            id: 'ProductPage.couponReasonDiscountAlreadyActive',
            defaultMessage: 'Questo coupon non può essere usato quando è già attivo uno sconto su questo listing.',
          });
        } else if (result.reasonCode === 'MIN_ORDER_NOT_MET' && result.minOrderValue != null) {
          const amountFormatted = formatMoney(intl, new Money(result.minOrderValue, currency));
          message = intl.formatMessage(
            {
              id: 'ProductPage.couponReasonMinOrderNotMet',
              defaultMessage: "L'ordine deve avere un importo minimo di {amount}",
            },
            { amount: amountFormatted }
          );
        } else {
          message =
            result.reason ||
            intl.formatMessage({ id: 'ProductPage.couponInvalid', defaultMessage: 'Codice coupon non valido' });
        }
        setCouponError(message);
      }
    } catch (e) {
      setCouponError(e.message || intl.formatMessage({ id: 'ProductPage.couponError', defaultMessage: 'Errore durante la validazione del coupon' }));
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponData(null);
    setCouponError(null);
    if (canShowFullBookingUI) {
      fetchLineItemsForDatesAndDelivery(
        calendarSelectedDates[0],
        calendarSelectedDates[calendarSelectedDates.length - 1],
        undefined,
        ''
      );
    }
  };

  const getBookingUnitsForDates = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return unitType === 'night' ? diffDays : diffDays + 1;
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

  const hasValidDates = calendarSelectedDates.length >= 2;
  const bookingUnits = hasValidDates
    ? getBookingUnitsForDates(calendarSelectedDates[0], calendarSelectedDates[calendarSelectedDates.length - 1])
    : 0;
  const appliesToUnitType = unitType === 'day' || unitType === 'night';
  const commissionMinFromError = fetchLineItemsError?.minimumBookingUnits;
  const effectiveMinimum =
    appliesToUnitType && (minimumBookingDays > 0 || commissionMinFromError > 0)
      ? Math.max(minimumBookingDays || 0, commissionMinFromError || 0)
      : 0;
  const hasMinimumDuration =
    !appliesToUnitType || effectiveMinimum === 0 || bookingUnits >= effectiveMinimum;
  const canShowFullBookingUI =
    hasValidDates && hasMinimumDuration && !fetchLineItemsError;
  // Use exclusive end date (day after last selected) so LineItemBookingPeriod shows the correct last day
  const breakdownData = hasValidDates
    ? (() => {
        const lastSelected = calendarSelectedDates[calendarSelectedDates.length - 1];
        const endDateExclusive = new Date(lastSelected);
        endDateExclusive.setDate(endDateExclusive.getDate() + 1);
        return {
          startDate: calendarSelectedDates[0],
          endDate: endDateExclusive,
        };
      })()
    : null;
  const showEstimatedBreakdown =
    canShowFullBookingUI &&
    breakdownData &&
    lineItems &&
    !fetchLineItemsInProgress &&
    !fetchLineItemsError;
  const showBreakdownSkeleton = canShowFullBookingUI && fetchLineItemsInProgress;

  // Re-fetch line items when autoDiscounts arrive (fixes race: user selects dates before discounts load)
  const prevAutoDiscountsLengthRef = useRef(autoDiscounts.length);
  useEffect(() => {
    const prevLen = prevAutoDiscountsLengthRef.current;
    prevAutoDiscountsLengthRef.current = autoDiscounts.length;
    if (
      prevLen === 0 &&
      autoDiscounts.length > 0 &&
      calendarSelectedDates.length >= 2 &&
      canShowFullBookingUI
    ) {
      fetchLineItemsForDatesAndDelivery(
        calendarSelectedDates[0],
        calendarSelectedDates[calendarSelectedDates.length - 1],
        deliveryMethod,
        couponCode
      );
    }
  }, [autoDiscounts, calendarSelectedDates, deliveryMethod, couponCode, canShowFullBookingUI]);

  // Check if user is logged in but not verified
  const user = ensureCurrentUser(currentUser);
  const isUserUnverified = user.id && !user.attributes?.emailVerified;

  const handleFormSubmit = () => {
    if (calendarSelectedDates.length < 2 || !canShowFullBookingUI) return;

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
      ...(couponData && { couponData }),
      ...(autoDiscounts.length > 0 && { autoDiscounts }),
    };

    onSubmit(bookingData);
  };

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

      {/* Minimum duration message - when below minimum (config or commission-based) */}
      {hasValidDates && !hasMinimumDuration && effectiveMinimum > 0 && (
        <div className={css.minimumDurationMessage}>
          <FormattedMessage
            id="ProductPage.minimumDurationRequired"
            defaultMessage="La prenotazione minima è di {days} giorni"
            values={{ days: effectiveMinimum }}
          />
        </div>
      )}

      {/* Generic fetch error - when not the commission/minimum duration case */}
      {fetchLineItemsError && !commissionMinFromError && (
        <div className={css.minimumDurationMessage}>
          <FetchLineItemsError error={fetchLineItemsError} />
        </div>
      )}

      {/* Delivery method toggle chips - when multiple options */}
      {canShowFullBookingUI && hasDeliveryMethodChoice && (
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
      {canShowFullBookingUI && (showEstimatedBreakdown || showBreakdownSkeleton) && (
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
              autoDiscounts={autoDiscounts}
              couponCode={couponCode}
              couponData={couponData}
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
                        setCouponError(null);
                      }}
                      placeholder={intl.formatMessage({ id: 'BookingDatesForm.couponCodePlaceholder' })}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className={css.couponApplyButton}
                      onClick={couponApplied ? handleRemoveCoupon : handleApplyCoupon}
                      disabled={fetchLineItemsInProgress || couponValidating}
                      style={{
                        backgroundColor: marketplaceColor,
                        color: 'white',
                      }}
                    >
                      {couponValidating ? (
                        <FormattedMessage id="ProductPage.couponValidating" defaultMessage="Verifica..." />
                      ) : couponApplied ? (
                        <FormattedMessage id="ProductPage.couponRemove" defaultMessage="Remove" />
                      ) : (
                        <FormattedMessage id="ProductPage.couponApply" defaultMessage="Apply" />
                      )}
                    </button>
                  </div>
                  {couponError && <p className={css.couponError}>{couponError}</p>}
                  {couponApplied && couponData?.minOrderValue != null && (
                    <p className={css.couponMinOrderHint}>
                      <FormattedMessage
                        id="ProductPage.couponMinOrderValue"
                        defaultMessage="Valid for orders ≥ {amount}"
                        values={{
                          amount: formatMoney(intl, new Money(couponData.minOrderValue, currency)),
                        }}
                      />
                    </p>
                  )}
                </div>
              }
            />
          )}
          {/* Coupon code when skeleton is shown (when real breakdown is shown, coupon is inside OrderBreakdown after booking period) */}
          {canShowFullBookingUI && (showEstimatedBreakdown || showBreakdownSkeleton) && showBreakdownSkeleton && (
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
                  disabled={fetchLineItemsInProgress || couponValidating}
                  style={{
                    backgroundColor: marketplaceColor,
                    color: 'white',
                  }}
                >
                  {couponValidating ? (
                    <FormattedMessage id="ProductPage.couponValidating" defaultMessage="Verifica..." />
                  ) : couponApplied ? (
                    <FormattedMessage id="ProductPage.couponRemove" defaultMessage="Remove" />
                  ) : (
                    <FormattedMessage id="ProductPage.couponApply" defaultMessage="Apply" />
                  )}
                </button>
              </div>
              {couponError && <p className={css.couponError}>{couponError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className={css.submitButtonWrapper}>
        <PrimaryButton
          onClick={handleFormSubmit}
          disabled={!canShowFullBookingUI || isOwnListing}
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
    autoDiscounts,
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

  // Exclude thumbnail image (used only for search/category cards) from gallery display
  const listingForGallery = listingWithoutThumbnailOnly(currentListing);

  const facebookImages = listingImages(listingForGallery, 'facebook');
  const twitterImages = listingImages(listingForGallery, 'twitter');
  const schemaImages = listingImages(
    listingForGallery,
    `${config.layout.listingImage.variantPrefix}-2x`
  ).map(img => img.url);
  const marketplaceName = config.marketplaceName;
  const schemaTitle = intl.formatMessage(
    { id: 'ProductPage.schemaTitle' },
    { title, price: formattedPrice, marketplaceName }
  );

  // Get images for gallery (thumbnail excluded)
  const images = listingForGallery.images || [];
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

  const { aspectWidth = 4, aspectHeight = 3 } = config.layout?.listingImage || {};

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
        {/* ===== SPLIT HERO SECTION ===== */}
        <section className={css.heroSection}>
          {/* Left: Portrait Image Container */}
          <div className={css.heroImageContainer}>
            <div className={css.heroPortraitFrame} onClick={() => images.length > 0 && setImageModalOpen(true)}>
              {images.length > 0 ? (
                <img
                  src={mainImageUrl}
                  alt={title}
                  className={css.heroImage}
                />
              ) : (
                <ResponsiveImage
                  className={css.heroImageFallback}
                  image={null}
                  variants={[]}
                  alt={title}
                />
              )}

              {/* Image navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={classNames(css.heroImageNav, css.heroNavPrev)}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                    }}
                  >
                    <IconArrowHead direction="left" size="big" />
                  </button>
                  <button
                    type="button"
                    className={classNames(css.heroImageNav, css.heroNavNext)}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                    }}
                  >
                    <IconArrowHead direction="right" size="big" />
                  </button>
                  <div className={css.heroImageCounter}>
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                </>
              )}

              {images.length > 1 && (
                <button
                  type="button"
                  className={css.heroViewPhotos}
                  onClick={e => {
                    e.stopPropagation();
                    setImageModalOpen(true);
                  }}
                >
                  <FormattedMessage
                    id="ProductPage.viewPhotos"
                    defaultMessage="Vedi {count} foto"
                    values={{ count: images.length }}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Right: Product Info Panel */}
          <div className={css.heroInfoPanel}>
            {/* Action Bar for own listing */}
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

            {/* Breadcrumb */}
            {(() => {
              const id1 = publicData?.categoryId;
              const id2 = publicData?.subcategoryId;
              const id3 = publicData?.thirdCategoryId;
              const categories = config?.categoryConfiguration?.categories ?? [];
              const shortLocale = getShortLocaleForCategoryDisplay(config, intl?.locale);
              const names = getCategoryNamesFromIds(categories, id1, id2, id3, shortLocale);
              const categoryLabel = names.category ?? publicData?.category;
              const subcategoryLabel = names.subcategory ?? publicData?.subcategory;
              const thirdCategoryLabel = names.thirdCategory ?? publicData?.thirdCategory;
              const parts = [categoryLabel, subcategoryLabel, thirdCategoryLabel].filter(Boolean);
              if (!parts.length) return null;
              return (
                <nav className={css.heroBreadcrumb}>
                  {parts.map((part, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span>/</span>}
                      <NamedLink
                        className={css.heroBreadcrumbLink}
                        name="SearchPage"
                        to={{ search: '' }}
                      >
                        {part}
                      </NamedLink>
                    </React.Fragment>
                  ))}
                </nav>
              );
            })()}

            <h1 className={css.heroTitle}>
              {(() => {
                const words = title.split(/\s+/);
                if (words.length <= 3) {
                  return <span className={css.heroTitleAccent}>{title}</span>;
                }
                const leading = words.slice(0, -3).join(' ');
                const trailing = words.slice(-3).join(' ');
                return (
                  <>
                    {leading}{' '}<span className={css.heroTitleAccent}>{trailing}</span>
                  </>
                );
              })()}
            </h1>

            {/* Author section */}
            <div className={css.heroAuthorSection}>
              <AvatarSmall user={ensuredAuthor} className={css.heroAuthorAvatar} />
              <div className={css.heroAuthorInfo}>
                <span className={css.heroAuthorName}>
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
                  <div className={css.heroAuthorRating}>
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

            {/* Condition & Brand cards */}
            {(() => {
              const conditionRaw = publicData?.condition;
              const brandRaw = publicData?.brand;
              if (!conditionRaw && !brandRaw) return null;

              const toCamelCase = str =>
                str.replace(/(?:^\w|[A-Z]|\b\w)/g, (ch, i) =>
                  i === 0 ? ch.toLowerCase() : ch.toUpperCase()
                ).replace(/[\s\-_]+/g, '');
              const conditionKey = conditionRaw ? toCamelCase(conditionRaw) : '';
              const conditionMessageId = `ProductPage.condition.${conditionKey}`;
              const conditionLabel = conditionRaw
                ? intl.formatMessage({ id: conditionMessageId, defaultMessage: conditionRaw })
                : null;

              const fieldConfigs = listingConfig?.listingFields || [];
              const brandLabel = (() => {
                if (!brandRaw) return null;
                const cfg = fieldConfigs.find(f => f.key === 'brand');
                if (cfg?.enumOptions) {
                  const match = cfg.enumOptions.find(o => `${o.option}` === `${brandRaw}`);
                  if (match?.label) return match.label;
                }
                return String(brandRaw);
              })();

              return (
                <div className={css.heroFeatureCards}>
                  {conditionRaw && (
                    <div className={css.heroFeatureCard}>
                      <div className={css.heroFeatureCardIcon}>✓</div>
                      <div className={css.heroFeatureCardContent}>
                        <p className={css.heroFeatureCardLabel}>
                          <FormattedMessage id="ProductPage.conditionLabel" defaultMessage="Condizione" />
                        </p>
                        <h3 className={css.heroFeatureCardTitle}>{conditionLabel}</h3>
                      </div>
                    </div>
                  )}
                  {brandRaw && (
                    <div className={css.heroFeatureCard}>
                      <div className={css.heroFeatureCardIcon}>🏷</div>
                      <div className={css.heroFeatureCardContent}>
                        <p className={css.heroFeatureCardLabel}>
                          <FormattedMessage id="ProductPage.brandLabel" defaultMessage="Brand" />
                        </p>
                        <h3 className={css.heroFeatureCardTitle}>{brandLabel}</h3>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>

        {/* ===== CONTENT AREA ===== */}
        <div className={css.contentWrapper}>
          {/* Mobile Header (visible only on mobile) */}
          <div
            className={classNames(
              css.mobileHeader,
              mounted && currentListing.id && isOwnListing && css.mobileHeaderWithActionBar
            )}
          >
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

            <H4 as="h1" className={css.listingTitle}>
              {richTitle}
            </H4>

            {price && (
              <>
                <div className={css.priceContainer}>
                  <div className={css.priceInfo}>
                    <span className={css.price}>{formattedPrice}</span>
                    <span className={css.perUnit}>
                      <FormattedMessage id="ProductPage.perUnit" values={{ unitType }} />
                    </span>
                  </div>
                  {getBestDiscount(autoDiscounts) && (
                    <span className={css.discountBadge}>
                      {formatDiscountLabel(getBestDiscount(autoDiscounts), intl)}
                    </span>
                  )}
                </div>
                {isBooking && !isClosed && (
                  <button
                    type="button"
                    className={css.mobileRequestToBookLink}
                    onClick={() => {
                      const el = document.getElementById('mobile-booking-form');
                      if (el) {
                        const topbarEl = document.querySelector('[class*="Topbar_container"]') ||
                                       document.querySelector('[class*="TopbarDesktop"]') ||
                                       document.querySelector('nav');
                        const navbarHeight = topbarEl ? topbarEl.offsetHeight : 64;
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
                    const topbarEl = document.querySelector('[class*="Topbar_container"]') ||
                                   document.querySelector('[class*="TopbarDesktop"]') ||
                                   document.querySelector('nav');
                    const navbarHeight = topbarEl ? topbarEl.offsetHeight : 64;
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
            {/* Left Column - Details */}
            <div className={css.detailsColumn}>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className={css.thumbnailsContainer}>
                  <div className={css.thumbnailsScroll}>
                    {images.map((image, index) => {
                      const imgVariants = image.attributes?.variants || {};
                      const thumbUrl =
                        imgVariants['scaled-small']?.url ||
                        imgVariants['scaled-medium']?.url ||
                        imgVariants['listing-card-2x']?.url ||
                        imgVariants['listing-card']?.url;

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
                            src={thumbUrl}
                            alt={`Thumbnail ${index + 1}`}
                            className={css.thumbnailImage}
                            loading="lazy"
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

                  {(currentListing.attributes?.createdAt || currentListing.createdAt) && (
                    <div className={css.listingCreationDate}>
                      <FormattedMessage
                        id="ProductPage.listingCreated"
                        defaultMessage="Annuncio creato il {date}"
                        values={{
                          date: intl.formatDate(
                            currentListing.attributes?.createdAt || currentListing.createdAt,
                            { year: 'numeric', month: 'long', day: 'numeric' }
                          ),
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Custom listing fields / specs */}
              <CustomListingFields
                publicData={publicData}
                metadata={metadata}
                listingFieldConfigs={listingConfig.listingFields}
                categoryConfiguration={config.categoryConfiguration}
                intl={intl}
              />

              {/* Key Features */}
              {(() => {
                const keyFeatures = publicData.keyFeatures || publicData.key_features || [];
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

              {/* Booking Form - Mobile */}
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
                    autoDiscounts={autoDiscounts}
                  />
                </div>
              )}

              {/* Owner Card with map */}
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

              {/* Reviews (use mock data when no real reviews exist) */}
              <div className={css.reviewsSectionWrapper}>
                {reviews.length === 0 && (
                  <div className={css.reviewsBadgeOverlay}>
                    <div className={css.testDriveBadge}>
                      <span className={css.testDriveDot} />
                      Test Drive
                    </div>
                  </div>
                )}
                <SectionReviews
                  reviews={reviews.length > 0 ? reviews : MOCK_REVIEWS}
                  fetchReviewsError={fetchReviewsError}
                />
              </div>
            </div>

            {/* Right Column - Booking Card (Desktop) */}
            <div className={css.infoColumn}>
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

              <H4 as="h1" className={css.listingTitle}>
                {richTitle}
              </H4>

              {price && (
                <div className={css.priceContainer}>
                  <span className={css.price}>{formattedPrice}</span>
                  <span className={css.perUnit}>
                    <FormattedMessage id="ProductPage.perUnit" values={{ unitType }} />
                  </span>
                  {getBestDiscount(autoDiscounts) && (
                    <span className={css.discountBadge}>
                      {formatDiscountLabel(getBestDiscount(autoDiscounts), intl)}
                    </span>
                  )}
                </div>
              )}

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
                    autoDiscounts={autoDiscounts}
                  />
                </div>
              )}

              {isClosed && (
                <div className={css.closedListing}>
                  <FormattedMessage id="ProductPage.closedListing" defaultMessage="Questo annuncio è chiuso" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products Carousel (mock) */}
        <section className={css.relatedSection}>
          <div className={css.relatedInner}>
            <div className={css.relatedTitleRow}>
              <h2 className={css.relatedTitle}>
                <FormattedMessage id="ProductPage.relatedProducts" defaultMessage="Prodotti simili" />
              </h2>
              <div className={css.testDriveBadge}>
                <span className={css.testDriveDot} />
                Test Drive
              </div>
            </div>
            <div className={css.relatedGrid}>
              {MOCK_RELATED_PRODUCTS.map(product => (
                <ProductListingCard
                  key={product.id}
                  portraitImage
                  image={
                    <img
                      src={product.image}
                      alt={product.title}
                      className={productListingCardCss.image}
                      loading="lazy"
                    />
                  }
                  favoriteButton={
                    <button type="button" className={productListingCardCss.favoriteButton}>
                      ♡
                    </button>
                  }
                  category={product.category}
                  title={product.title}
                  owner={
                    <FormattedMessage
                      id="ProductPage.relatedCardOwner"
                      defaultMessage="di {name}"
                      values={{ name: product.owner }}
                    />
                  }
                  pricePrimary={
                    <span className={productListingCardCss.rentalPrice}>
                      {product.price}{' '}
                      <span className={productListingCardCss.priceUnit}>
                        <FormattedMessage id="ProductPage.perDay" defaultMessage="/ giorno" />
                      </span>
                    </span>
                  }
                  priceCompare={
                    <span className={productListingCardCss.estimatedPriceRow}>
                      <span className={productListingCardCss.estimatedPriceLabel}>
                        <FormattedMessage id="ListingCard.estimatedPriceInsteadOfLabel" />
                      </span>{' '}
                      <span
                        className={productListingCardCss.estimatedPriceAmount}
                        title={intl.formatMessage(
                          { id: 'ListingCard.estimatedRetailPriceHint' },
                          { price: product.estimatedNewPrice }
                        )}
                      >
                        {product.estimatedNewPrice}
                      </span>
                    </span>
                  }
                />
              ))}
            </div>
          </div>
        </section>

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
                loading="lazy"
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
    autoDiscounts,
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
    autoDiscounts: autoDiscounts || [],
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
  onFetchAutoDiscounts: (listingId, locale) => dispatch(fetchAutoDiscounts(listingId, locale)),
  onResendVerificationEmail: () => dispatch(sendVerificationEmail()),
});

const ProductPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EnhancedProductPage);

export default ProductPage;
