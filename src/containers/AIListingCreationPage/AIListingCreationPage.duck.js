import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';

// Helper to get proper image variant info for uploads
const getImageVariantInfo = listingImageConfig => {
  const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } = listingImageConfig;
  const aspectRatio = aspectHeight / aspectWidth;
  const fieldsImage = [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`];

  return {
    fieldsImage,
    imageVariants: {
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
    },
  };
};

// ================ Action types ================ //

export const CREATE_LISTING_DRAFT_REQUEST = 'app/AIListingCreationPage/CREATE_LISTING_DRAFT_REQUEST';
export const CREATE_LISTING_DRAFT_SUCCESS = 'app/AIListingCreationPage/CREATE_LISTING_DRAFT_SUCCESS';
export const CREATE_LISTING_DRAFT_ERROR = 'app/AIListingCreationPage/CREATE_LISTING_DRAFT_ERROR';

export const PUBLISH_LISTING_REQUEST = 'app/AIListingCreationPage/PUBLISH_LISTING_REQUEST';
export const PUBLISH_LISTING_SUCCESS = 'app/AIListingCreationPage/PUBLISH_LISTING_SUCCESS';
export const PUBLISH_LISTING_ERROR = 'app/AIListingCreationPage/PUBLISH_LISTING_ERROR';

export const UPLOAD_IMAGE_REQUEST = 'app/AIListingCreationPage/UPLOAD_IMAGE_REQUEST';
export const UPLOAD_IMAGE_SUCCESS = 'app/AIListingCreationPage/UPLOAD_IMAGE_SUCCESS';
export const UPLOAD_IMAGE_ERROR = 'app/AIListingCreationPage/UPLOAD_IMAGE_ERROR';

export const UPDATE_LISTING_REQUEST = 'app/AIListingCreationPage/UPDATE_LISTING_REQUEST';
export const UPDATE_LISTING_SUCCESS = 'app/AIListingCreationPage/UPDATE_LISTING_SUCCESS';
export const UPDATE_LISTING_ERROR = 'app/AIListingCreationPage/UPDATE_LISTING_ERROR';

// ================ Reducer ================ //

const initialState = {
  createListingDraftInProgress: false,
  createListingDraftError: null,
  publishListingInProgress: false,
  publishListingError: null,
  uploadImageInProgress: false,
  uploadImageError: null,
  updateListingInProgress: false,
  updateListingError: null,
  draftListing: null,
  uploadedImages: [],
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case CREATE_LISTING_DRAFT_REQUEST:
      return {
        ...state,
        createListingDraftInProgress: true,
        createListingDraftError: null,
      };
    case CREATE_LISTING_DRAFT_SUCCESS:
      return {
        ...state,
        createListingDraftInProgress: false,
        draftListing: payload,
      };
    case CREATE_LISTING_DRAFT_ERROR:
      return {
        ...state,
        createListingDraftInProgress: false,
        createListingDraftError: payload,
      };

    case PUBLISH_LISTING_REQUEST:
      return {
        ...state,
        publishListingInProgress: true,
        publishListingError: null,
      };
    case PUBLISH_LISTING_SUCCESS:
      return {
        ...state,
        publishListingInProgress: false,
      };
    case PUBLISH_LISTING_ERROR:
      return {
        ...state,
        publishListingInProgress: false,
        publishListingError: payload,
      };

    case UPLOAD_IMAGE_REQUEST:
      return {
        ...state,
        uploadImageInProgress: true,
        uploadImageError: null,
      };
    case UPLOAD_IMAGE_SUCCESS:
      return {
        ...state,
        uploadImageInProgress: false,
        uploadedImages: [...state.uploadedImages, payload],
      };
    case UPLOAD_IMAGE_ERROR:
      return {
        ...state,
        uploadImageInProgress: false,
        uploadImageError: payload,
      };

    case UPDATE_LISTING_REQUEST:
      return {
        ...state,
        updateListingInProgress: true,
        updateListingError: null,
      };
    case UPDATE_LISTING_SUCCESS:
      return {
        ...state,
        updateListingInProgress: false,
      };
    case UPDATE_LISTING_ERROR:
      return {
        ...state,
        updateListingInProgress: false,
        updateListingError: payload,
      };

    default:
      return state;
  }
}

// ================ Action creators ================ //

export const createListingDraftRequest = () => ({ type: CREATE_LISTING_DRAFT_REQUEST });
export const createListingDraftSuccess = listing => ({
  type: CREATE_LISTING_DRAFT_SUCCESS,
  payload: listing,
});
export const createListingDraftError = error => ({
  type: CREATE_LISTING_DRAFT_ERROR,
  payload: error,
  error: true,
});

export const publishListingRequest = () => ({ type: PUBLISH_LISTING_REQUEST });
export const publishListingSuccess = () => ({ type: PUBLISH_LISTING_SUCCESS });
export const publishListingError = error => ({
  type: PUBLISH_LISTING_ERROR,
  payload: error,
  error: true,
});

export const uploadImageRequest = () => ({ type: UPLOAD_IMAGE_REQUEST });
export const uploadImageSuccess = image => ({
  type: UPLOAD_IMAGE_SUCCESS,
  payload: image,
});
export const uploadImageError = error => ({
  type: UPLOAD_IMAGE_ERROR,
  payload: error,
  error: true,
});

export const updateListingRequest = () => ({ type: UPDATE_LISTING_REQUEST });
export const updateListingSuccess = () => ({ type: UPDATE_LISTING_SUCCESS });
export const updateListingError = error => ({
  type: UPDATE_LISTING_ERROR,
  payload: error,
  error: true,
});

// ================ Thunks ================ //

/**
 * Create a draft listing
 */
export const createListingDraft = listingData => (dispatch, getState, sdk) => {
  dispatch(createListingDraftRequest());

  const {
    title,
    description,
    price,
    publicData,
    privateData,
    availabilityPlan,
    ...rest
  } = listingData;

  // Build listing creation params
  const createParams = {
    title: title.trim(),
    description,
    publicData: publicData || {},
    privateData: privateData || {},
  };

  // Add price if provided
  if (price) {
    createParams.price = price;
  }

  // Add availability plan if provided
  if (availabilityPlan) {
    createParams.availabilityPlan = availabilityPlan;
  }

  return sdk.ownListings
    .createDraft(createParams, { expand: true })
    .then(response => {
      const listing = response.data.data;
      dispatch(createListingDraftSuccess(listing));
      return response;
    })
    .catch(e => {
      console.error('SDK createDraft error:', e);
      dispatch(createListingDraftError(storableError(e)));
      throw e;
    });
};

/**
 * Publish a listing
 */
export const publishListing = listingId => (dispatch, getState, sdk) => {
  dispatch(publishListingRequest());

  return sdk.ownListings
    .publishDraft({ id: listingId }, { expand: true })
    .then(response => {
      dispatch(publishListingSuccess());
      return response;
    })
    .catch(e => {
      dispatch(publishListingError(storableError(e)));
      throw e;
    });
};

/**
 * Update a listing (images, availability exceptions, etc.)
 */
export const updateListing = (listingId, updateData, config) => (dispatch, getState, sdk) => {
  dispatch(updateListingRequest());

  const { images, availabilityExceptions, ...otherUpdates } = updateData;

  // Handle image uploads
  const uploadImagesPromise = images
    ? Promise.all(
        images.map(imageFile => {
          // Get proper image variant configuration
          const imageVariantInfo = getImageVariantInfo(config?.layout?.listingImage || {});
          const queryParams = {
            expand: true,
            'fields.image': imageVariantInfo.fieldsImage,
            ...imageVariantInfo.imageVariants,
          };

          // Upload image with correct query params (second parameter!)
          return sdk.images
            .upload({ image: imageFile }, queryParams)
            .then(response => {
              const imageId = response.data.data.id;
              return sdk.ownListings.addImage(
                { id: listingId, imageId },
                { expand: true, include: ['images'] }
              );
            });
        })
      )
    : Promise.resolve();

  // Handle availability exceptions (create each one individually)
  const updateExceptionsPromise = availabilityExceptions && availabilityExceptions.length > 0
    ? Promise.all(
        availabilityExceptions.map(exception =>
          sdk.availabilityExceptions.create(
            {
              listingId,
              start: exception.start,
              end: exception.end,
              seats: exception.seats,
            },
            { expand: true }
          )
        )
      )
    : Promise.resolve();

  // Handle other updates
  const updateListingPromise =
    Object.keys(otherUpdates).length > 0
      ? sdk.ownListings.update(
          {
            id: listingId,
            ...otherUpdates,
          },
          { expand: true }
        )
      : Promise.resolve();

  return Promise.all([uploadImagesPromise, updateExceptionsPromise, updateListingPromise])
    .then(responses => {
      dispatch(updateListingSuccess());
      return responses[responses.length - 1]; // Return last response
    })
    .catch(e => {
      dispatch(updateListingError(storableError(e)));
      throw e;
    });
};

/**
 * Upload an image to a listing
 */
export const uploadImage = (listingId, imageFile, config) => (dispatch, getState, sdk) => {
  dispatch(uploadImageRequest());

  // Get proper image variant configuration
  const imageVariantInfo = getImageVariantInfo(config?.layout?.listingImage || {});
  const queryParams = {
    expand: true,
    'fields.image': imageVariantInfo.fieldsImage,
    ...imageVariantInfo.imageVariants,
  };

  // Upload image with correct query params (second parameter!)
  return sdk.images
    .upload({ image: imageFile }, queryParams)
    .then(response => {
      const imageId = response.data.data.id;

      // Add image to listing
      return sdk.ownListings.addImage(
        { id: listingId, imageId },
        { expand: true, include: ['images'] }
      );
    })
    .then(response => {
      const listing = response.data.data;
      const images = listing.relationships.images.data;
      dispatch(uploadImageSuccess(images[images.length - 1]));
      return response;
    })
    .catch(e => {
      dispatch(uploadImageError(storableError(e)));
      throw e;
    });
};

/**
 * Load initial data for the page
 */
export const loadData = () => (dispatch, getState, sdk) => {
  // No initial data loading needed for this page
  return Promise.resolve();
};
