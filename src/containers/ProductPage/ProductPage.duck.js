/**
 * ProductPage duck
 * 
 * Extends ListingPage duck to add author reviews functionality
 */
import {
  loadData as ListingPageLoadData,
  FETCH_REVIEWS_REQUEST,
  FETCH_REVIEWS_SUCCESS,
  FETCH_REVIEWS_ERROR,
} from '../ListingPage/ListingPage.duck';
import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { types as sdkTypes } from '../../util/sdkLoader';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';

const { UUID } = sdkTypes;

// ================ Action types ================ //

export const QUERY_AUTHOR_REVIEWS_REQUEST = 'app/ProductPage/QUERY_AUTHOR_REVIEWS_REQUEST';
export const QUERY_AUTHOR_REVIEWS_SUCCESS = 'app/ProductPage/QUERY_AUTHOR_REVIEWS_SUCCESS';
export const QUERY_AUTHOR_REVIEWS_ERROR = 'app/ProductPage/QUERY_AUTHOR_REVIEWS_ERROR';

// ================ Action creators ================ //

export const queryAuthorReviewsRequest = () => ({
  type: QUERY_AUTHOR_REVIEWS_REQUEST,
});

export const queryAuthorReviewsSuccess = reviews => ({
  type: QUERY_AUTHOR_REVIEWS_SUCCESS,
  payload: reviews,
});

export const queryAuthorReviewsError = e => ({
  type: QUERY_AUTHOR_REVIEWS_ERROR,
  error: true,
  payload: e,
});

// ================ Thunks ================ //

export const queryUserReviews = userId => (dispatch, getState, sdk) => {
  dispatch(queryAuthorReviewsRequest());
  return sdk.reviews
    .query({
      subject_id: userId,
      state: 'public',
      include: ['author', 'author.profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    })
    .then(response => {
      const reviews = denormalisedResponseEntities(response);
      dispatch(queryAuthorReviewsSuccess(reviews));
    })
    .catch(e => {
      dispatch(queryAuthorReviewsError(storableError(e)));
    });
};

// ================ Reducer ================ //

const initialState = {
  authorReviews: [],
  queryAuthorReviewsError: null,
};

export default function productPageReducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case QUERY_AUTHOR_REVIEWS_REQUEST:
      return { ...state, queryAuthorReviewsError: null };
    case QUERY_AUTHOR_REVIEWS_SUCCESS:
      return { ...state, authorReviews: payload };
    case QUERY_AUTHOR_REVIEWS_ERROR:
      return { ...state, authorReviews: [], queryAuthorReviewsError: payload };
    default:
      return state;
  }
}

// ================ Load Data ================ //

export const loadData = (params, search, config) => (dispatch, getState, sdk) => {
  // First, load the listing and its reviews using ListingPage loadData
  return dispatch(ListingPageLoadData(params, search, config)).then(response => {
    // After listing is loaded, get the author ID from the denormalized listing in the store
    const listingId = new UUID(params.id);
    const state = getState();
    
    // Get the denormalized listing from the store
    const listingRef = { id: listingId, type: 'listing' };
    const listings = getMarketplaceEntities(state, [listingRef]);
    const listing = listings.length === 1 ? listings[0] : null;
    
    // Get author ID from the denormalized listing
    const authorId = listing?.author?.id?.uuid || listing?.author?.id;

    if (authorId) {
      // Fetch author reviews in parallel (we don't need to wait for it)
      dispatch(queryUserReviews(authorId));
    }

    return response;
  });
};



