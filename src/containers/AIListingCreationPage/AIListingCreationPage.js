import React, { useState } from 'react';
import { bool, func, shape } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, intlShape, injectIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { DEFAULT_LOCALE } from '../../config/localeConfig';

import { Page, LayoutSingleColumn, NotificationBanner } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import ImageUpload from './ImageUpload';
import QuestionModal from './QuestionModal';
import LoadingOverlay from './LoadingOverlay';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';

import productApiInstance, {
  mapProductToListingData,
  isValidProductAnalysis,
} from '../../util/productApi';

import { createListingDraft, updateListing } from './AIListingCreationPage.duck';

import css from './AIListingCreationPage.module.css';


// Helper to convert currency ISO code to symbol (e.g., 'EUR' → '€', 'USD' → '$')
const getCurrencySymbol = currencyCode => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value || currencyCode;
  } catch {
    return currencyCode;
  }
};

// Question constraints
const QUESTION_CONSTRAINTS = {
  MAX_ROUNDS: 3,
  MAX_TOTAL_QUESTIONS: 10,
};

// Steps in the creation flow
const STEP_UPLOAD = 'upload';
const STEP_ANALYZING = 'analyzing';
const STEP_QUESTIONS = 'questions';
const STEP_REFINING = 'refining';
const STEP_PRICE_QUESTION = 'priceQuestion';
const STEP_SAVING = 'saving';

export const AIListingCreationPageComponent = ({
  currentUser = null,
  createListingDraftInProgress,
  createListingDraftError = null,
  onCreateListingDraft,
  onUpdateListing,
  history,
  intl,
}) => {
  const config = useConfiguration();

  // 🔧 TESTING MODE: Set to true to skip directly to location step
  const TEST_MODE_LOCATION = false;

  // State management
  const [step, setStep] = useState(TEST_MODE_LOCATION ? STEP_PRICE_QUESTION : STEP_UPLOAD);
  const [uploadedImages, setUploadedImages] = useState(
    TEST_MODE_LOCATION ? [new File(['test'], 'test.jpg', { type: 'image/jpeg' })] : []
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState(
    TEST_MODE_LOCATION ? ['https://via.placeholder.com/400'] : []
  );
  const [productAnalysis, setProductAnalysis] = useState(
    TEST_MODE_LOCATION
      ? {
          category: 'Test Category',
          subcategory: 'Test Subcategory',
          fields: {
            title: 'Test Product',
            description: 'Test Description',
          },
          questions: [],
          confidence: 'high',
        }
      : null
  );
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [totalQuestionsAsked, setTotalQuestionsAsked] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'PROHIBITED_CATEGORY' or null

  const user = ensureCurrentUser(currentUser);
  const emailVerified = user.attributes?.emailVerified || false;

  const parseSuggestedPrice = analysis => {
    const raw = analysis?.fields?.priceSuggestion;
    const match = raw?.match(/\d+/);
    return match ? parseInt(match[0], 10) * 100 : 2000;
  };

  const buildDefaultAvailability = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const timezone = getDefaultTimeZoneOnBrowser ? getDefaultTimeZoneOnBrowser() : 'Etc/UTC';

    return {
      availabilityPlan: {
        type: 'availability-plan/time',
        timezone,
        entries: [
          { dayOfWeek: 'mon', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'tue', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'thu', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'fri', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'sat', startTime: '00:00', endTime: '00:00', seats: 1 },
          { dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', seats: 1 },
        ],
      },
      availabilityExceptions: [],
      availableFrom: today.toISOString(),
      availableUntil: oneYearLater.toISOString(),
    };
  };

  const buildDefaultLocation = () => {
    const profile = user?.attributes?.profile;
    const address = profile?.privateData?.address;
    if (!address) {
      return null;
    }

    const addressLine1 = address.addressLine1 || '';
    const city = address.city || '';
    const postalCode = address.postalCode || '';
    const country = address.country || '';
    const state = address.state || '';
    const composedAddress = [addressLine1, city, postalCode, country].filter(Boolean).join(', ');

    const location = {
      address: composedAddress,
      building: '',
      locationVisible: true,
      handByHandAvailable: false,
      addressLine1,
      addressLine2: address.addressLine2 || '',
      city,
      state,
      postalCode,
      country,
    };

    if (address.geolocation) {
      location.geolocation = {
        lat: address.geolocation.lat,
        lng: address.geolocation.lng,
      };
    }

    return location;
  };

  const initializeDefaults = analysis => {
    const defaultPrice = parseSuggestedPrice(analysis);
    setPricingData({
      price: defaultPrice,
      priceVariationsEnabled: false,
      priceVariants: [],
    });
    setAvailabilityData(buildDefaultAvailability());
    setLocationData(buildDefaultLocation());
  };

  const buildListingDraftPayload = (finalProductData, effectivePricing, effectiveAvailability, effectiveLocation) => {
    // Map product data to Sharetribe listing format
    const listingData = mapProductToListingData(finalProductData, config);

    // Add required fields
    listingData.publicData = {
      ...listingData.publicData,
      listingType: 'daily-rental',
      unitType: 'day',
      transactionProcessAlias: 'default-booking/release-1',
    };

    // Pricing
    listingData.publicData.priceVariationsEnabled = effectivePricing.priceVariationsEnabled;
    if (effectivePricing.priceVariants && effectivePricing.priceVariants.length > 0) {
      listingData.publicData.priceVariants = effectivePricing.priceVariants;
    }
    listingData.price = {
      amount: effectivePricing.price,
      currency: config?.currency || 'EUR',
    };

    // Location
    if (effectiveLocation) {
      listingData.publicData.location = {
        address: effectiveLocation.address,
        building: effectiveLocation.building || '',
        ...(effectiveLocation.addressLine1 && { addressLine1: effectiveLocation.addressLine1 }),
        ...(effectiveLocation.addressLine2 && { addressLine2: effectiveLocation.addressLine2 }),
        ...(effectiveLocation.city && { city: effectiveLocation.city }),
        ...(effectiveLocation.state && { state: effectiveLocation.state }),
        ...(effectiveLocation.postalCode && { postalCode: effectiveLocation.postalCode }),
        ...(effectiveLocation.country && { country: effectiveLocation.country }),
      };
      listingData.publicData.locationVisible = effectiveLocation.locationVisible ?? true;
      listingData.publicData.handByHandAvailable = effectiveLocation.handByHandAvailable ?? false;
      if (effectiveLocation.geolocation) {
        listingData.geolocation = {
          lat: effectiveLocation.geolocation.lat,
          lng: effectiveLocation.geolocation.lng,
        };
      }
    }

    // Availability
    if (effectiveAvailability?.availabilityPlan) {
      listingData.availabilityPlan = effectiveAvailability.availabilityPlan;
    }
    if (effectiveAvailability?.availableFrom) {
      listingData.publicData.availableFrom = effectiveAvailability.availableFrom;
    }
    if (effectiveAvailability?.availableUntil) {
      listingData.publicData.availableUntil = effectiveAvailability.availableUntil;
    }

    return listingData;
  };

  const createDraftAndRedirectToPreview = async effectivePricingOverride => {
    if (!productAnalysis) {
      setErrorType(null);
      setError('Missing product information');
      return;
    }

    const effectivePricing =
      effectivePricingOverride ||
      pricingData || {
        price: parseSuggestedPrice(productAnalysis),
        priceVariationsEnabled: false,
        priceVariants: [],
      };
    const effectiveAvailability = availabilityData || buildDefaultAvailability();
    const effectiveLocation = locationData || buildDefaultLocation();

    setStep(STEP_SAVING);
    setError(null);
    setErrorType(null);

    try {
      const listingData = buildListingDraftPayload(
        productAnalysis,
        effectivePricing,
        effectiveAvailability,
        effectiveLocation
      );

      const result = await onCreateListingDraft(listingData, config);

      if (result && result.data && result.data.data) {
        const listing = result.data.data;
        const listingId = listing.id;

        if (uploadedImages.length > 0) {
          await onUpdateListing(listingId, { images: uploadedImages }, config);
        }

        if (effectiveAvailability?.availabilityExceptions?.length > 0) {
          await onUpdateListing(
            listingId,
            { availabilityExceptions: effectiveAvailability.availabilityExceptions },
            config
          );
        }

        history.push(`/l/edit/${listingId.uuid}/draft`);
      } else {
        throw new Error('Failed to create listing draft');
      }
    } catch (err) {
      console.error('❌ Draft creation after price error:', err);
      setErrorType(null);
      setError(err.message || 'Failed to create listing draft');
      setStep(STEP_PRICE_QUESTION);
    }
  };

  // Handle image selection
  const handleImagesSelected = files => {
    setUploadedImages(files);
    setError(null);
    setErrorType(null);
  };

  // Handle AI analysis start
  const handleStartAnalysis = async () => {
    if (uploadedImages.length === 0) {
      setErrorType(null);
      setError('Please upload at least one image');
      return;
    }

    setStep(STEP_ANALYZING);
    setError(null);
    setErrorType(null);

    try {
      // Call AI API to analyze product
      const locale =
        typeof window !== 'undefined' && typeof localStorage !== 'undefined'
          ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
          : DEFAULT_LOCALE;

      const analysis = await productApiInstance.analyze(uploadedImages, locale);

      if (!isValidProductAnalysis(analysis)) {
        throw new Error('Invalid product analysis received');
      }

      setProductAnalysis(analysis);
      initializeDefaults(analysis);
      setRoundNumber(1);

      const questions = analysis.questions || [];
      setCurrentQuestions(questions);
      setTotalQuestionsAsked(questions.length);

      // If questions exist, show them; otherwise go to price question
      if (questions.length > 0) {
        setStep(STEP_QUESTIONS);
      } else {
        setStep(STEP_PRICE_QUESTION);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      // Check for PROHIBITED_CATEGORY error
      if (err.errorCode === 'PROHIBITED_CATEGORY') {
        setErrorType('PROHIBITED_CATEGORY');
        setError(err.message || 'Failed to analyze product images');
      } else {
        setErrorType(null);
        setError(err.message || 'Failed to analyze product images');
      }
      setStep(STEP_UPLOAD);
    }
  };

  // Handle question modal completion
  const handleQuestionComplete = async answers => {
    if (!productAnalysis) return;

    // If no answers, just move to next step
    if (Object.keys(answers).length === 0) {
      setStep(STEP_PRICE_QUESTION);
      return;
    }

    setStep(STEP_REFINING);
    setError(null);
    setErrorType(null);

    try {
      // Call refine API
      const locale =
        typeof window !== 'undefined' && typeof localStorage !== 'undefined'
          ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
          : DEFAULT_LOCALE;
      const refined = await productApiInstance.refine({
        previousAnalysis: productAnalysis,
        answers,
        locale,
        totalQuestionsAsked,
        roundNumber,
      });

      setProductAnalysis(refined);

      const newQuestions = refined.questions || [];
      const newTotal = totalQuestionsAsked + newQuestions.length;
      setTotalQuestionsAsked(newTotal);
      setRoundNumber(roundNumber + 1);

      // Check stopping conditions
      if (
        newQuestions.length === 0 ||
        newTotal >= QUESTION_CONSTRAINTS.MAX_TOTAL_QUESTIONS ||
        roundNumber >= QUESTION_CONSTRAINTS.MAX_ROUNDS
      ) {
        // No more questions, proceed to manual price question
        setStep(STEP_PRICE_QUESTION);
      } else {
        // More questions to ask
        setCurrentQuestions(newQuestions);
        setStep(STEP_QUESTIONS);
      }
    } catch (err) {
      console.error('Refinement error:', err);
      setErrorType(null);
      setError(err.message || 'Failed to refine product analysis');
      setStep(STEP_UPLOAD);
    }
  };

  // Handle skip all questions
  const handleSkipAll = async partialAnswers => {
    // Still refine with partial answers if provided
    if (Object.keys(partialAnswers).length > 0 && productAnalysis) {
      setStep(STEP_REFINING);
      try {
        const locale =
          typeof window !== 'undefined' && typeof localStorage !== 'undefined'
            ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
            : DEFAULT_LOCALE;
        const refined = await productApiInstance.refine({
          previousAnalysis: productAnalysis,
          answers: partialAnswers,
          locale,
          totalQuestionsAsked,
          roundNumber,
        });
        setProductAnalysis(refined);
      } catch (err) {
        console.error('Refinement error:', err);
        // Continue anyway
      }
    }
    setStep(STEP_PRICE_QUESTION);
  };

  // Handle cancel questions
  const handleCancelQuestions = () => {
      setStep(STEP_UPLOAD);
  };

  // Manual price question (single question shown like the AI ones)
  const handlePriceQuestionComplete = async answers => {
    const raw =
      answers?.manual_price ??
      answers?.price ??
      answers?.[Object.keys(answers || {}).find(key => answers[key] !== undefined)];

    const numeric = parseFloat(raw);
    const basePrice = Number.isFinite(numeric) ? Math.round(numeric * 100) : parseSuggestedPrice(productAnalysis);

    const priceData = {
      price: basePrice,
      priceVariationsEnabled: false,
      priceVariants: [],
    };

    setPricingData(priceData);
    await createDraftAndRedirectToPreview(priceData);
  };

  const handleSkipPriceQuestion = async () => {
    let effective = pricingData;
    if (!effective) {
      const defaultPrice = parseSuggestedPrice(productAnalysis);
      effective = {
        price: defaultPrice,
        priceVariationsEnabled: false,
        priceVariants: [],
      };
      setPricingData(effective);
    }
    await createDraftAndRedirectToPreview(effective);
  };

  // Render content based on current step
  const renderContent = () => {
    const suggestedCents = pricingData?.price || parseSuggestedPrice(productAnalysis);
    const suggested = suggestedCents / 100;
    const priceQuestion = {
      id: 'manual_price',
      type: 'slider',
      question: intl.formatMessage({
        id: 'AIListingCreation.priceQuestion.title',
        defaultMessage: 'Conferma o modifica il prezzo al giorno per il noleggio di questo prodotto',
      }),
      subtitle: intl.formatMessage({
        id: 'AIListingCreation.priceQuestion.subtitle',
        defaultMessage: 'Gli utenti vedranno un prezzo maggiorato delle commissioni di servizio',
      }),
      unit: getCurrencySymbol(config?.currency || 'EUR'),
      min: Math.max(0, suggested / 2),
      max: suggested * 2,
      step: 0.5,
    };

    switch (step) {
      case STEP_UPLOAD:
        return (
          <div className={css.stepContent}>
            <div className={css.stepHeader}>
              <h1 className={css.stepTitle}>
                <FormattedMessage
                  id="AIListingCreation.uploadTitle"
                  defaultMessage="Upload Product Images"
                />
              </h1>
              <p className={css.stepDescription}>
                <FormattedMessage
                  id="AIListingCreation.uploadDescription"
                  defaultMessage="Take clear photos of your product with your camera. Our AI will analyze them and create a listing for you."
                />
              </p>
            </div>
            <ImageUpload
              onImagesSelected={handleImagesSelected}
              onAnalyze={handleStartAnalysis}
              isAnalyzing={false}
            />
          </div>
        );

      case STEP_ANALYZING:
        return <LoadingOverlay titleId="ImageUpload.analyzingButton" />;

      case STEP_QUESTIONS:
        return (
          <QuestionModal
            questions={currentQuestions}
            onComplete={handleQuestionComplete}
            onSkipAll={handleSkipAll}
            onCancel={handleCancelQuestions}
            isRefining={false}
          />
        );

      case STEP_REFINING:
        return (
          <QuestionModal
            questions={currentQuestions}
            onComplete={handleQuestionComplete}
            onSkipAll={handleSkipAll}
            onCancel={handleCancelQuestions}
            isRefining={true}
          />
        );

      case STEP_PRICE_QUESTION:
        return (
          <QuestionModal
            questions={[priceQuestion]}
            onComplete={handlePriceQuestionComplete}
            onSkipAll={handleSkipPriceQuestion}
            onCancel={handleCancelQuestions}
            isRefining={false}
            allowSkip={false}
          />
        );

      case STEP_SAVING:
        return (
          <LoadingOverlay
            titleId="AIListingCreation.savingTitle"
          />
        );

      default:
        return null;
    }
  };

  // Page schema for SEO
  const title = intl.formatMessage(
    { id: 'AIListingCreationPage.title' },
    { marketplaceName: config.marketplaceName }
  );
  const description = intl.formatMessage({ id: 'AIListingCreationPage.description' });

  const schemaTitle = intl.formatMessage(
    { id: 'AIListingCreationPage.schemaTitle' },
    { marketplaceName: config.marketplaceName }
  );

  return (
    <Page
      className={css.root}
      title={title}
      scrollingDisabled={false}
      author={user?.attributes?.profile?.displayName}
      contentType="website"
      description={description}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
      }}
    >
      <LayoutSingleColumn
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
        className={css.layout}
      >
        <div className={css.content}>
          {error && (
            <NotificationBanner
              title={intl.formatMessage({
                id: 'AIListingCreationPage.errorTitle',
                defaultMessage: 'Error',
              })}
              message={
                errorType === 'PROHIBITED_CATEGORY'
                  ? intl.formatMessage({
                      id: 'AIListingCreationPage.prohibitedCategoryErrorMessage',
                      defaultMessage:
                        'The product seems not aligned with our policy. If you\'re not sure, please reach out to our customer service.',
                    })
                  : intl.formatMessage({
                      id: 'AIListingCreationPage.errorMessage',
                      defaultMessage: 'Please try again',
                    })
              }
              type="error"
              duration={5000}
              onClose={() => {
                setError(null);
                setErrorType(null);
              }}
            />
          )}

          {/* Show content with opacity overlay if email not verified */}
          <div
            style={{
              opacity: emailVerified ? 1 : 0.3,
              pointerEvents: emailVerified ? 'auto' : 'none',
            }}
          >
            {renderContent()}
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

AIListingCreationPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  createListingDraftInProgress: bool.isRequired,
  createListingDraftError: propTypes.error,
  onCreateListingDraft: func.isRequired,
  onUpdateListing: func.isRequired,
  history: shape({
    push: func.isRequired,
  }).isRequired,
  intl: intlShape.isRequired,
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    createListingDraftInProgress,
    createListingDraftError,
  } = state.AIListingCreationPage;

  return {
    currentUser,
    createListingDraftInProgress,
    createListingDraftError,
  };
};

const mapDispatchToProps = dispatch => ({
  onCreateListingDraft: (data, config) => dispatch(createListingDraft(data, config)),
  onUpdateListing: (listingId, data, config) => dispatch(updateListing(listingId, data, config)),
});

const AIListingCreationPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(AIListingCreationPageComponent);

export default AIListingCreationPage;
