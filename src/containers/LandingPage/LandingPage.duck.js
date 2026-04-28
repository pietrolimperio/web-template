import { createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

const POPULAR_LISTINGS_COUNT = 8;

// ================ Action types ================ //

export const FETCH_POPULAR_REQUEST = 'app/NewLandingPage/FETCH_POPULAR_REQUEST';
export const FETCH_POPULAR_SUCCESS = 'app/NewLandingPage/FETCH_POPULAR_SUCCESS';
export const FETCH_POPULAR_ERROR = 'app/NewLandingPage/FETCH_POPULAR_ERROR';

// ================ Reducer ================ //

const initialState = {
  popularListingIds: [],
  fetchPopularInProgress: false,
  fetchPopularError: null,
};

const resultIds = data =>
  data.data
    .filter(l => !l.attributes.deleted && l.attributes.state === 'published')
    .map(l => l.id);

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case FETCH_POPULAR_REQUEST:
      return { ...state, fetchPopularInProgress: true, fetchPopularError: null };
    case FETCH_POPULAR_SUCCESS:
      return {
        ...state,
        fetchPopularInProgress: false,
        popularListingIds: payload.listingIds,
      };
    case FETCH_POPULAR_ERROR:
      return { ...state, fetchPopularInProgress: false, fetchPopularError: payload };
    default:
      return state;
  }
}

// ================ Action creators ================ //

const fetchPopularRequest = () => ({ type: FETCH_POPULAR_REQUEST });
const fetchPopularSuccess = listingIds => ({
  type: FETCH_POPULAR_SUCCESS,
  payload: { listingIds },
});
const fetchPopularError = e => ({
  type: FETCH_POPULAR_ERROR,
  error: true,
  payload: e,
});

// ================ Thunks ================ //

export const loadData = (params, search, config) => (dispatch, getState, sdk) => {
  dispatch(fetchPopularRequest());

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config?.layout?.listingImage || {};
  const aspectRatio = aspectHeight / aspectWidth;

  return sdk.listings
    .query({
      sort: '-createdAt',
      perPage: POPULAR_LISTINGS_COUNT,
      include: ['author', 'images'],
      'fields.listing': [
        'title',
        'geolocation',
        'price',
        'deleted',
        'state',
        'publicData.listingType',
        'publicData.transactionProcessAlias',
        'publicData.unitType',
        'publicData.cardStyle',
        'publicData.pickupEnabled',
        'publicData.shippingEnabled',
        'publicData.priceVariationsEnabled',
        'publicData.priceVariants',
        // ListingCard: category labels + new-price comparison (same fields as search / product page)
        'publicData.categoryId',
        'publicData.subcategoryId',
        'publicData.thirdCategoryId',
        'publicData.estimatedPriceNew',
      ],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName'],
      'fields.image': [
        'variants.scaled-small',
        'variants.scaled-medium',
        `variants.${variantPrefix}`,
        `variants.${variantPrefix}-2x`,
      ],
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
      'limit.images': 1,
    })
    .then(response => {
      const listingFields = config?.listing?.listingFields;
      dispatch(addMarketplaceEntities(response, { listingFields }));
      dispatch(fetchPopularSuccess(resultIds(response.data)));
      return response;
    })
    .catch(e => {
      dispatch(fetchPopularError(storableError(e)));
    });
};
