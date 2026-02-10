import React, { useState, useEffect } from 'react';
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
import CategoryModal from './CategoryModal';
import LoadingOverlay from './LoadingOverlay';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';

import productApiInstance, {
  mapProductToListingData,
  isValidProductAnalysis,
} from '../../util/productApi';

import { createListingDraft, updateListing } from './AIListingCreationPage.duck';
import {
  saveGuestListingData,
  loadGuestListingData,
  clearGuestListingData,
} from '../../util/guestListingStorage';

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
const STEP_CATEGORIES = 'categories';
const STEP_PRICE_QUESTION = 'priceQuestion';
const STEP_SAVING = 'saving';

export const AIListingCreationPageComponent = ({
  currentUser = null,
  isAuthenticated = false,
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

  // Check if user is guest (not authenticated)
  const isGuest = !isAuthenticated || !currentUser?.id;

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

  // Load saved guest listing data on mount if guest
  useEffect(() => {
    if (isGuest) {
      const savedData = loadGuestListingData();
      if (savedData) {
        // Check if all required data is available (wizard completed)
        // Required: productAnalysis, pricingData, availabilityData, images, and listingData
        // Location is optional (can be added later)
        const hasProductAnalysis = !!savedData.productAnalysis;
        const hasPricingData = savedData.pricingData !== null && savedData.pricingData !== undefined;
        const hasAvailabilityData = savedData.availabilityData !== null && savedData.availabilityData !== undefined;
        const hasImages = savedData.images && Array.isArray(savedData.images) && savedData.images.length > 0;
        const hasListingData = !!savedData.listingData;
        
        const hasAllData = hasProductAnalysis && 
                          hasPricingData && 
                          hasAvailabilityData && 
                          hasImages &&
                          hasListingData;
        
        if (hasAllData) {
          // All data available, redirect directly to guest preview
          history.push('/l/guest-preview-listing');
          return;
        }
        
        // Restore state from saved data
        if (savedData.images && savedData.images.length > 0) {
          setUploadedImages(savedData.images);
          // Recreate preview URLs
          const previews = savedData.images.map(file => URL.createObjectURL(file));
          setImagePreviewUrls(previews);
        }
        if (savedData.productAnalysis) {
          setProductAnalysis(savedData.productAnalysis);
        }
        if (savedData.pricingData) {
          setPricingData(savedData.pricingData);
        }
        if (savedData.availabilityData) {
          setAvailabilityData(savedData.availabilityData);
        }
        if (savedData.locationData) {
          setLocationData(savedData.locationData);
        }
        // Determine step based on what data is available
        if (savedData.productAnalysis) {
          if (savedData.pricingData) {
            // Has pricing but missing other data, show price question
            setStep(STEP_PRICE_QUESTION);
          } else {
            setStep(STEP_PRICE_QUESTION);
          }
        } else if (savedData.images && savedData.images.length > 0) {
          setStep(STEP_UPLOAD);
        }
      }
    }
  }, [isGuest, history]);

  // Save data to storage whenever it changes (ONLY for guest users)
  // IMPORTANT: Only save after refine - never after analyze (raw analysis before questions)
  // Steps STEP_CATEGORIES, STEP_PRICE_QUESTION, STEP_SAVING indicate we have refined data
  // (or went straight to categories when there were no questions)
  useEffect(() => {
    const isDefinitelyGuest = !isAuthenticated && !currentUser?.id;
    const stepsAfterRefine = [STEP_CATEGORIES, STEP_PRICE_QUESTION, STEP_SAVING];

    if (
      isDefinitelyGuest &&
      productAnalysis &&
      stepsAfterRefine.includes(step)
    ) {
      const listingData = buildListingDraftPayload(
        productAnalysis,
        pricingData || { price: parseSuggestedPrice(productAnalysis), priceVariationsEnabled: false, priceVariants: [] },
        availabilityData || buildDefaultAvailability(),
        locationData || buildDefaultLocation()
      );
      saveGuestListingData(
        listingData,
        uploadedImages,
        productAnalysis,
        pricingData,
        availabilityData,
        locationData
      );
    }
    // NOTE: We do NOT clear guest data here when user becomes authenticated
    // Data will be cleared in useGuestListingAfterAuth only after draft is created
  }, [isAuthenticated, currentUser?.id, productAnalysis, pricingData, availabilityData, locationData, uploadedImages, step]);

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

    // Add required fields - company users get instant-booking by default, others get default-booking
    const customerType = currentUser?.attributes?.profile?.publicData?.customerType;
    const defaultTransactionProcess =
      customerType === 'company' ? 'instant-booking/release-1' : 'default-booking/release-1';
    listingData.publicData = {
      ...listingData.publicData,
      listingType: 'daily-rental',
      unitType: 'day',
      transactionProcessAlias: defaultTransactionProcess,
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
      listingData.publicData.shippingEnabled = effectiveLocation.shippingEnabled ?? true;
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

      // If guest user, save to storage and redirect to guest preview
      // Double check that user is actually a guest (not authenticated)
      if (isGuest && !isAuthenticated && !currentUser?.id) {
        // Save all data to storage
        saveGuestListingData(
          listingData,
          uploadedImages,
          productAnalysis,
          effectivePricing,
          effectiveAvailability,
          effectiveLocation
        );
        // Note: We do NOT set the flag here - it will be set only when user tries to publish
        // Redirect to guest preview page
        history.push('/l/guest-preview-listing');
        return;
      }

      // Authenticated user: create draft as before
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
  const handleImagesSelected = (files, previewUrls) => {
    setUploadedImages(files);
    if (previewUrls) {
      setImagePreviewUrls(previewUrls);
    }
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

      // If questions exist, show them; otherwise go to categories step
      if (questions.length > 0) {
        setStep(STEP_QUESTIONS);
      } else {
        setStep(STEP_CATEGORIES);
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
      setStep(STEP_CATEGORIES);
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
        // No more questions, proceed to categories step
        setStep(STEP_CATEGORIES);
      } else {
        // More questions to ask
        setCurrentQuestions(newQuestions);
        setStep(STEP_QUESTIONS);
      }
    } catch (err) {
      console.error('Refinement error:', err);
      if (err.errorCode === 'PROHIBITED_CATEGORY') {
        setErrorType('PROHIBITED_CATEGORY');
        setError(err.message || 'Failed to refine product analysis');
      } else {
        setErrorType(null);
        setError(err.message || 'Failed to refine product analysis');
      }
      setStep(STEP_UPLOAD);
    }
  };

  // Handle skip all questions
  const handleSkipAll = async partialAnswers => {
    // Still refine with partial answers if provided
    if (productAnalysis) {
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
        setStep(STEP_CATEGORIES);
      } catch (err) {
        console.error('Refinement error:', err);
        if (err.errorCode === 'PROHIBITED_CATEGORY') {
          setErrorType('PROHIBITED_CATEGORY');
          setError(err.message || 'Failed to refine product analysis');
        } else {
          setErrorType(null);
          setError(err.message || 'Failed to refine product analysis');
        }
        setStep(STEP_UPLOAD);
      }
    }
  };

  // Handle cancel questions - user confirmed "Yes, Interrupt" on the popup
  const handleCancelQuestions = () => {
    clearGuestListingData();
    setStep(STEP_UPLOAD);
  };

  // Handle category modal completion
  const handleCategoryComplete = categoriesData => {
    if (!productAnalysis) return;

    // Update productAnalysis with selected categories
    const updatedAnalysis = {
      ...productAnalysis,
      category: categoriesData.category,
      subcategory: categoriesData.subcategory,
      thirdCategory: categoriesData.thirdCategory,
      categoryId: categoriesData.categoryId,
      subcategoryId: categoriesData.subcategoryId,
      thirdCategoryId: categoriesData.thirdCategoryId,
    };

    setProductAnalysis(updatedAnalysis);
    setStep(STEP_PRICE_QUESTION);
  };

  // Handle cancel categories - user confirmed "Yes, Interrupt" on the popup
  const handleCancelCategories = () => {
    clearGuestListingData();
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
      defaultValue: suggested, // Use priceSuggestion as initial value
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

      case STEP_CATEGORIES:
        return (
          <CategoryModal
            initialCategoryId={productAnalysis?.categoryId || productAnalysis?.category || null}
            initialSubcategoryId={productAnalysis?.subcategoryId || productAnalysis?.subcategory || null}
            initialThirdCategoryId={productAnalysis?.thirdCategoryId || productAnalysis?.thirdCategory || null}
            onComplete={handleCategoryComplete}
            onCancel={handleCancelCategories}
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

          {renderContent()}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

AIListingCreationPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  isAuthenticated: bool,
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
  const { isAuthenticated } = state;
  const {
    createListingDraftInProgress,
    createListingDraftError,
  } = state.AIListingCreationPage;

  return {
    currentUser,
    isAuthenticated,
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
