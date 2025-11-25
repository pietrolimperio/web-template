import React, { useState } from 'react';
import { bool, func, object, shape, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, intlShape, injectIntl } from '../../util/reactIntl';
import { createResourceLocatorString } from '../../util/routes';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { types as sdkTypes } from '../../util/sdkLoader';
import { DEFAULT_LOCALE } from '../../config/localeConfig';

import { Page, LayoutSingleColumn, NotificationBanner } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import ImageUpload from './ImageUpload';
import QuestionModal from './QuestionModal';
import CalendarAvailability from './CalendarAvailability';
import PricingConfiguration from './PricingConfiguration';
import LocationInput from './LocationInput';
import ListingConfigurationPage from './ListingConfigurationPage';
import PDPPreview from './PDPPreview';
import LoadingOverlay from './LoadingOverlay';

import productApiInstance, {
  mapProductToListingData,
  isValidProductAnalysis,
} from '../../util/productApi';

import { createListingDraft, updateListing, publishListing } from './AIListingCreationPage.duck';

import css from './AIListingCreationPage.module.css';

const { Money, UUID } = sdkTypes;

// Hardcoded AI Model (as per requirements)
const AI_MODEL = 'gemini-2.5-flash';

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
const STEP_CONFIGURATION = 'configuration'; // Combined calendar, pricing, and location
const STEP_CALENDAR = 'calendar';
const STEP_PRICING = 'pricing';
const STEP_LOCATION = 'location';
const STEP_PREVIEW = 'preview';
const STEP_SAVING = 'saving';

export const AIListingCreationPageComponent = ({
  currentUser = null,
  createListingDraftInProgress,
  createListingDraftError = null,
  publishListingInProgress,
  publishListingError = null,
  onCreateListingDraft,
  onUpdateListing,
  onPublishListing,
  history,
  intl,
}) => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();

  // 🔧 TESTING MODE: Set to true to skip directly to location step
  const TEST_MODE_LOCATION = false;

  // State management
  const [step, setStep] = useState(TEST_MODE_LOCATION ? STEP_CONFIGURATION : STEP_UPLOAD);
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
  const [configurationData, setConfigurationData] = useState(null); // Combined data
  const [createdListingId, setCreatedListingId] = useState(null);
  const [error, setError] = useState(null);

  const user = ensureCurrentUser(currentUser);
  const isAuthenticated = !!user.id;
  const emailVerified = user.attributes?.emailVerified || false;

  // Handle image selection
  const handleImagesSelected = (files, previewUrls) => {
    setUploadedImages(files);
    setImagePreviewUrls(previewUrls);
    setError(null);
  };

  // Handle AI analysis start
  const handleStartAnalysis = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setStep(STEP_ANALYZING);
    setError(null);

    try {
      // Call AI API to analyze product
      const locale = localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
      const formData = new FormData();
      uploadedImages.forEach(img => formData.append('images', img));
      formData.append('locale', locale);
      formData.append('model', AI_MODEL);

      const analysis = await productApiInstance.analyze(uploadedImages, locale);

      if (!isValidProductAnalysis(analysis)) {
        throw new Error('Invalid product analysis received');
      }

      setProductAnalysis(analysis);
      setRoundNumber(1);

      const questions = analysis.questions || [];
      setCurrentQuestions(questions);
      setTotalQuestionsAsked(questions.length);

      // If questions exist, show them; otherwise go to configuration
      if (questions.length > 0) {
        setStep(STEP_QUESTIONS);
      } else {
        setStep(STEP_CONFIGURATION);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze product images');
      setStep(STEP_UPLOAD);
    }
  };

  // Handle question modal completion
  const handleQuestionComplete = async answers => {
    if (!productAnalysis) return;

    // If no answers, just move to next step
    if (Object.keys(answers).length === 0) {
      setStep(STEP_CONFIGURATION);
      return;
    }

    setStep(STEP_REFINING);
    setError(null);

    try {
      // Call refine API
      const locale = localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
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
        // No more questions, proceed to configuration
        setStep(STEP_CONFIGURATION);
      } else {
        // More questions to ask
        setCurrentQuestions(newQuestions);
        setStep(STEP_QUESTIONS);
      }
    } catch (err) {
      console.error('Refinement error:', err);
      setError(err.message || 'Failed to refine product analysis');
      setStep(STEP_QUESTIONS);
    }
  };

  // Handle skip all questions
  const handleSkipAll = async partialAnswers => {
    // Still refine with partial answers if provided
    if (Object.keys(partialAnswers).length > 0 && productAnalysis) {
      setStep(STEP_REFINING);
      try {
        const locale = localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE;
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
    setStep(STEP_CONFIGURATION);
  };

  // Handle cancel questions
  const handleCancelQuestions = () => {
    if (
      window.confirm(
        'Are you sure you want to cancel? You can continue without answering questions.'
      )
    ) {
      setStep(STEP_CONFIGURATION);
    }
  };

  // Handle configuration page completion (combined calendar, pricing, location)
  const handleConfigurationComplete = async data => {
    setConfigurationData(data);
    setAvailabilityData(data.availability);
    setPricingData(data.pricing);
    setLocationData(data.location);

    // Create draft listing and redirect to preview page
    setStep(STEP_SAVING);
    setError(null);

    try {
      // Map product data to Sharetribe listing format
      const listingData = mapProductToListingData(productAnalysis, config);

      // Add required fields
      listingData.publicData = {
        ...listingData.publicData,
        listingType: 'daily-rental',
        unitType: 'day',
        transactionProcessAlias: 'default-booking/release-1',
      };

      // Add pricing data
      if (data.pricing) {
        listingData.publicData.priceVariationsEnabled = data.pricing.priceVariationsEnabled;
        if (data.pricing.priceVariants && data.pricing.priceVariants.length > 0) {
          listingData.publicData.priceVariants = data.pricing.priceVariants;
        }
        // Set price from pricing data
        listingData.price = {
          amount: data.pricing.price,
          currency: config?.currency || 'EUR',
        };
      }

      // Add location data with structured address fields
      if (data.location) {
        listingData.publicData.location = {
          address: data.location.address,
          building: data.location.building || '',
          // Structured address fields
          ...(data.location.addressLine1 && { addressLine1: data.location.addressLine1 }),
          ...(data.location.addressLine2 && { addressLine2: data.location.addressLine2 }),
          ...(data.location.city && { city: data.location.city }),
          ...(data.location.state && { state: data.location.state }),
          ...(data.location.postalCode && { postalCode: data.location.postalCode }),
          ...(data.location.country && { country: data.location.country }),
        };
        listingData.publicData.locationVisible = data.location.locationVisible;
        listingData.publicData.handByHandAvailable = data.location.handByHandAvailable;
        // Add geolocation if available
        if (data.location.geolocation) {
          listingData.geolocation = {
            lat: data.location.geolocation.lat,
            lng: data.location.geolocation.lng,
          };
        }
      }

      // Add availability plan
      if (data.availability?.availabilityPlan) {
        listingData.availabilityPlan = data.availability.availabilityPlan;
      }

      // Create draft listing
      console.log('🚀 Creating draft listing...');
      const result = await onCreateListingDraft(listingData, config);

      if (result && result.data && result.data.data) {
        const listing = result.data.data;
        const listingId = listing.id;
        setCreatedListingId(listingId);

        // Upload images
        if (uploadedImages.length > 0) {
          console.log('📷 Uploading images...');
          await onUpdateListing(listingId, { images: uploadedImages }, config);
        }

        // Add availability exceptions
        if (data.availability?.availabilityExceptions?.length > 0) {
          console.log('📅 Adding availability exceptions...');
          await onUpdateListing(
            listingId,
            { availabilityExceptions: data.availability.availabilityExceptions },
            config
          );
        }

        // Redirect to preview page
        console.log('✅ Draft created successfully, redirecting to preview...');
        history.push(`/l/create-preview/${listingId.uuid}`);
      } else {
        throw new Error('Failed to create listing draft');
      }
    } catch (err) {
      console.error('❌ Failed to create draft:', err);
      setError(err.message || 'Failed to create listing draft');
      setStep(STEP_CONFIGURATION);
    }
  };

  // Handle back from configuration
  const handleBackFromConfiguration = () => {
    if (currentQuestions.length > 0) {
      setStep(STEP_QUESTIONS);
    } else {
      setStep(STEP_UPLOAD);
    }
  };

  // Handle calendar availability completion
  const handleAvailabilityComplete = availability => {
    setAvailabilityData(availability);
    setStep(STEP_PRICING);
  };

  // Handle back from calendar
  const handleBackFromCalendar = () => {
    // Go back to questions if we had them
    if (currentQuestions.length > 0) {
      setStep(STEP_QUESTIONS);
    } else {
      setStep(STEP_UPLOAD);
    }
  };

  // Handle pricing complete
  const handlePricingComplete = pricing => {
    setPricingData(pricing);
    setStep(STEP_LOCATION);
  };

  // Handle back from pricing
  const handleBackFromPricing = () => {
    setStep(STEP_CALENDAR);
  };

  // Handle location complete
  const handleLocationComplete = location => {
    setLocationData(location);
    setStep(STEP_PREVIEW);
  };

  // Handle back from location
  const handleBackFromLocation = () => {
    setStep(STEP_PRICING);
  };

  // Handle save as draft
  const handleSaveDraft = async finalProductData => {
    setStep(STEP_SAVING);
    setError(null);

    try {
      // Map product data to Sharetribe listing format
      const listingData = mapProductToListingData(finalProductData, config);

      // Add required fields
      listingData.publicData = {
        ...listingData.publicData,
        listingType: 'daily-rental',
        unitType: 'day',
        transactionProcessAlias: 'default-booking/release-1',
      };

      // Add pricing data
      if (pricingData) {
        listingData.publicData.priceVariationsEnabled = pricingData.priceVariationsEnabled;
        if (pricingData.priceVariants && pricingData.priceVariants.length > 0) {
          listingData.publicData.priceVariants = pricingData.priceVariants;
        }
        // Set price from pricing data
        listingData.price = {
          amount: pricingData.price,
          currency: config?.currency || 'EUR',
        };
      }

      // Add location data with structured address fields
      if (locationData) {
        listingData.publicData.location = {
          address: locationData.address,
          building: locationData.building || '',
          // Structured address fields
          ...(locationData.addressLine1 && { addressLine1: locationData.addressLine1 }),
          ...(locationData.addressLine2 && { addressLine2: locationData.addressLine2 }),
          ...(locationData.city && { city: locationData.city }),
          ...(locationData.state && { state: locationData.state }),
          ...(locationData.postalCode && { postalCode: locationData.postalCode }),
          ...(locationData.country && { country: locationData.country }),
        };
        listingData.publicData.locationVisible = locationData.locationVisible;
        listingData.publicData.handByHandAvailable = locationData.handByHandAvailable;
        // Add geolocation if available
        if (locationData.geolocation) {
          listingData.geolocation = {
            lat: locationData.geolocation.lat,
            lng: locationData.geolocation.lng,
          };
        }
      }

      // Add availability plan
      if (availabilityData?.availabilityPlan) {
        listingData.availabilityPlan = availabilityData.availabilityPlan;
      }

      // Create draft listing
      const result = await onCreateListingDraft(listingData, config);

      if (result && result.data && result.data.id) {
        const listingId = result.data.id;
        setCreatedListingId(listingId);

        // Upload images
        if (uploadedImages.length > 0) {
          await onUpdateListing(listingId, { images: uploadedImages }, config);
        }

        // Add availability exceptions
        if (availabilityData?.availabilityExceptions?.length > 0) {
          await onUpdateListing(
            listingId,
            { availabilityExceptions: availabilityData.availabilityExceptions },
            config
          );
        }

        // Redirect to edit page
        const routes = routeConfiguration;
        const editListingPath = createResourceLocatorString(
          'EditListingPage',
          routes,
          { id: listingId.uuid, slug: listingData.title, type: 'edit', tab: 'details' },
          {}
        );
        history.push(editListingPath);
      } else {
        throw new Error('Failed to create listing draft');
      }
    } catch (err) {
      console.error('Save draft error:', err);
      setError(err.message || 'Failed to save listing as draft');
      setStep(STEP_PREVIEW);
    }
  };

  // Handle publish listing
  const handlePublish = async finalProductData => {
    setStep(STEP_SAVING);
    setError(null);

    try {
      // Map product data to Sharetribe listing format
      const listingData = mapProductToListingData(finalProductData, config);
      console.log('📋 Mapped listing data:', listingData);

      // Add required fields for consistency with legacy flow
      listingData.publicData = {
        ...listingData.publicData,
        listingType: 'daily-rental',
        unitType: 'day',
        transactionProcessAlias: 'default-booking/release-1',
      };

      // Add pricing data
      if (pricingData) {
        listingData.publicData.priceVariationsEnabled = pricingData.priceVariationsEnabled;
        if (pricingData.priceVariants && pricingData.priceVariants.length > 0) {
          listingData.publicData.priceVariants = pricingData.priceVariants;
        }
        // Update price to the default from pricing configuration
        const defaultPriceVariant = pricingData.priceVariants?.find(
          v => v.name === 'price_default'
        );
        if (defaultPriceVariant) {
          listingData.price = {
            amount: defaultPriceVariant.priceInSubunits,
            currency: config?.currency || 'USD',
          };
        }
      }

      // Add location data with structured address fields
      if (locationData) {
        listingData.publicData.location = {
          address: locationData.address,
          building: locationData.building || '',
          // Structured address fields
          ...(locationData.addressLine1 && { addressLine1: locationData.addressLine1 }),
          ...(locationData.addressLine2 && { addressLine2: locationData.addressLine2 }),
          ...(locationData.city && { city: locationData.city }),
          ...(locationData.state && { state: locationData.state }),
          ...(locationData.postalCode && { postalCode: locationData.postalCode }),
          ...(locationData.country && { country: locationData.country }),
        };
        // Add geolocation if available
        if (locationData.geolocation) {
          listingData.geolocation = {
            lat: locationData.geolocation.lat,
            lng: locationData.geolocation.lng,
          };
        }
      }

      // Add availability plan
      if (availabilityData?.availabilityPlan) {
        listingData.availabilityPlan = availabilityData.availabilityPlan;
      }

      // Create draft listing first
      console.log('🚀 Creating draft listing...');
      const result = await onCreateListingDraft(listingData, config);
      console.log('✅ Create draft result:', result);

      // Response structure: result.data.data.id (not result.data.id)
      if (result && result.data && result.data.data && result.data.data.id) {
        const listingId = result.data.data.id;
        setCreatedListingId(listingId);
        console.log('📝 Listing ID:', listingId);

        // Upload images
        if (uploadedImages.length > 0) {
          console.log('📤 Uploading images:', uploadedImages.length, 'files');
          console.log(
            '📄 Image details:',
            uploadedImages.map(img => ({
              name: img.name,
              size: img.size,
              type: img.type,
            }))
          );
          try {
            await onUpdateListing(listingId, { images: uploadedImages }, config);
            console.log('✅ Images uploaded successfully');
          } catch (imageError) {
            console.error('❌ Image upload failed:', imageError);
            console.error('❌ Image error details:', {
              message: imageError.message,
              status: imageError.status,
              apiErrors: imageError.apiErrors,
            });
            // Continue without images for now - don't fail the entire publish
            console.warn('⚠️  Continuing without images - you can add them later');
          }
        }

        // Publish listing first (must be published before adding availability exceptions)
        await onPublishListing(listingId);

        // Add availability exceptions AFTER publishing
        if (availabilityData?.availabilityExceptions?.length > 0) {
          await onUpdateListing(
            listingId,
            { availabilityExceptions: availabilityData.availabilityExceptions },
            config
          );
        }

        // Redirect to listing page
        const routes = routeConfiguration;
        const listingPath = createResourceLocatorString(
          'ListingPage',
          routes,
          { id: listingId.uuid, slug: listingData.title },
          {}
        );
        history.push(listingPath);
      } else {
        console.error('❌ Unexpected result structure:', result);
        throw new Error('Failed to create listing - invalid response structure');
      }
    } catch (err) {
      console.error('❌ Publish error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response,
        status: err.status,
      });
      setError(err.message || 'Failed to publish listing');
      setStep(STEP_PREVIEW);
    }
  };

  // Render content based on current step
  const renderContent = () => {
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

      case STEP_CONFIGURATION:
        return (
          <div className={css.stepContent}>
            <ListingConfigurationPage
              suggestedPrice={productAnalysis?.fields?.priceSuggestion}
              currentUser={currentUser}
              onComplete={handleConfigurationComplete}
              onBack={handleBackFromConfiguration}
              isSubmitting={false}
            />
          </div>
        );

      case STEP_CALENDAR:
        return (
          <div className={css.stepContent}>
            <CalendarAvailability
              onComplete={handleAvailabilityComplete}
              onBack={handleBackFromCalendar}
              isSubmitting={false}
            />
          </div>
        );

      case STEP_PRICING:
        return (
          <div className={css.stepContent}>
            <PricingConfiguration
              suggestedPrice={productAnalysis?.fields?.priceSuggestion}
              currency={config?.currency || 'USD'}
              onComplete={handlePricingComplete}
              onBack={handleBackFromPricing}
              isSubmitting={false}
            />
          </div>
        );

      case STEP_LOCATION:
        // Debug logging for location step
        console.log('📍 LOCATION STEP - Debugging Data:');
        console.log('currentUser exists:', !!currentUser);
        console.log('currentUser object:', currentUser);
        if (currentUser && currentUser.attributes) {
          console.log('currentUser.attributes:', currentUser.attributes);
          if (currentUser.attributes.profile) {
            console.log('profile exists:', !!currentUser.attributes.profile);
            console.log('privateData:', currentUser.attributes.profile.privateData);
            console.log('publicData:', currentUser.attributes.profile.publicData);
            if (currentUser.attributes.profile.privateData?.address) {
              console.log(
                '✅ privateData.address found:',
                currentUser.attributes.profile.privateData.address
              );
            } else {
              console.log('❌ No privateData.address found');
            }
          } else {
            console.log('❌ No profile found');
          }
        } else {
          console.log('❌ No currentUser.attributes found');
        }
        return (
          <div className={css.stepContent}>
            <LocationInput
              currentUser={currentUser}
              onComplete={handleLocationComplete}
              onBack={handleBackFromLocation}
              isSubmitting={false}
            />
          </div>
        );

      case STEP_PREVIEW:
        return (
          <div className={css.stepContent}>
            <PDPPreview
              productData={productAnalysis}
              images={uploadedImages}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              isSaving={false}
              isPublishing={false}
            />
          </div>
        );

      case STEP_SAVING:
        return (
          <LoadingOverlay
            titleId="AIListingCreation.savingTitle"
            messageId="AIListingCreation.savingDescription"
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
              message={intl.formatMessage({
                id: 'AIListingCreationPage.errorMessage',
                defaultMessage: 'Please try again',
              })}
              type="error"
              duration={5000}
              onClose={() => setError(null)}
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
  publishListingInProgress: bool.isRequired,
  publishListingError: propTypes.error,
  onCreateListingDraft: func.isRequired,
  onUpdateListing: func.isRequired,
  onPublishListing: func.isRequired,
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
    publishListingInProgress,
    publishListingError,
  } = state.AIListingCreationPage;

  return {
    currentUser,
    createListingDraftInProgress,
    createListingDraftError,
    publishListingInProgress,
    publishListingError,
  };
};

const mapDispatchToProps = dispatch => ({
  onCreateListingDraft: (data, config) => dispatch(createListingDraft(data, config)),
  onUpdateListing: (listingId, data, config) => dispatch(updateListing(listingId, data, config)),
  onPublishListing: listingId => dispatch(publishListing(listingId)),
});

const AIListingCreationPage = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(AIListingCreationPageComponent);

export default AIListingCreationPage;
