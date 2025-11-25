import { types as sdkTypes } from '../../util/sdkLoader';
import { userLocation } from '../../util/maps';

const { LatLng: SDKLatLng, LatLngBounds: SDKLatLngBounds } = sdkTypes;

export const CURRENT_LOCATION_ID = 'current-location';

const GENERATED_BOUNDS_DEFAULT_DISTANCE = 500; // meters
// Distances for generated bounding boxes for different Mapbox place types
const PLACE_TYPE_BOUNDS_DISTANCES = {
  address: 500,
  country: 2000,
  region: 2000,
  postcode: 2000,
  district: 2000,
  place: 2000,
  locality: 2000,
  neighborhood: 2000,
  poi: 2000,
  'poi.landmark': 2000,
};

const locationBounds = (latlng, distance) => {
  if (!latlng) {
    return null;
  }

  const bounds = new window.mapboxgl.LngLat(latlng.lng, latlng.lat).toBounds(distance);
  return new SDKLatLngBounds(
    new SDKLatLng(bounds.getNorth(), bounds.getEast()),
    new SDKLatLng(bounds.getSouth(), bounds.getWest())
  );
};

const placeOrigin = prediction => {
  if (prediction && Array.isArray(prediction.center) && prediction.center.length === 2) {
    // Coordinates in Mapbox features are represented as [longitude, latitude].
    return new SDKLatLng(prediction.center[1], prediction.center[0]);
  }
  return null;
};

const placeBounds = prediction => {
  if (prediction) {
    if (Array.isArray(prediction.bbox) && prediction.bbox.length === 4) {
      // Bounds in Mapbox features are represented as [minX, minY, maxX, maxY]
      return new SDKLatLngBounds(
        new SDKLatLng(prediction.bbox[3], prediction.bbox[2]),
        new SDKLatLng(prediction.bbox[1], prediction.bbox[0])
      );
    } else {
      // If bounds are not available, generate them around the origin

      // Resolve bounds distance based on place type
      const placeType = Array.isArray(prediction.place_type) && prediction.place_type[0];

      const distance =
        (placeType && PLACE_TYPE_BOUNDS_DISTANCES[placeType]) || GENERATED_BOUNDS_DEFAULT_DISTANCE;

      return locationBounds(placeOrigin(prediction), distance);
    }
  }
  return null;
};

export const GeocoderAttribution = () => null;

/**
 * A forward geocoding (place name -> coordinates) implementation
 * using the Mapbox Geocoding API.
 */
class GeocoderMapbox {
  getClient() {
    const libLoaded = typeof window !== 'undefined' && window.mapboxgl && window.mapboxSdk;
    if (!libLoaded) {
      throw new Error('Mapbox libraries are required for GeocoderMapbox');
    }
    if (!this._client && window?.mapboxgl?.accessToken) {
      this._client = window.mapboxSdk({
        accessToken: window.mapboxgl.accessToken,
      });
    }
    return this._client;
  }

  // Public API
  //

  /**
   * Search places with the given name.
   *
   * @param {String} search query for place names
   * @param {String} countryLimit ISO country code for limiting results
   * @param {String} locale language code for results
   *
   * @return {Promise<{ search: String, predictions: Array<Object>}>}
   * results of the geocoding, should have the original search query
   * and an array of predictions. The format of the predictions is
   * only relevant for the `getPlaceDetails` function below.
   */
  getPlacePredictions(search, countryLimit, locale) {
    const client = this.getClient();

    // Build query parameters - country must be ISO 3166-1 alpha-2 code (e.g., 'it', not 'it-IT')
    const queryParams = {
      limit: 5,
      types: 'address',
      proximity: 'ip',
    };

    // Add country if provided (e.g., 'IT' -> 'it')
    if (countryLimit) {
      queryParams.country = countryLimit.toLowerCase();
    }

    // Add language if provided (can be full locale like 'it-IT')
    if (locale) {
      queryParams.language = locale;
    }

    // Create custom request to bypass SDK validation for proximity=ip
    // The SDK's forwardGeocode validates proximity as coordinates, but the REST API supports 'ip'
    // Note: Don't use encodeURIComponent here - the SDK handles encoding automatically
    const request = client.createRequest({
      method: 'GET',
      path: '/geocoding/v5/mapbox.places/:query.json',
      params: {
        query: search,
      },
      query: queryParams,
    });

    return request.send().then(response => {
      return {
        search,
        predictions: response.body.features,
      };
    });
  }

  /**
   * Get the ID of the given prediction.
   */
  getPredictionId(prediction) {
    return prediction.id;
  }

  /**
   * Get the address text of the given prediction.
   */
  getPredictionAddress(prediction) {
    if (prediction.predictionPlace) {
      // default prediction defined above
      return prediction.predictionPlace.address;
    }
    // prediction from Mapbox geocoding API
    return prediction.place_name;
  }

  /**
   * Fetch or read place details from the selected prediction.
   *
   * @param {Object} prediction selected prediction object
   *
   * @return {Promise<util.propTypes.place>} a place object
   */
  getPlaceDetails(prediction, currentLocationBoundsDistance) {
    if (this.getPredictionId(prediction) === CURRENT_LOCATION_ID) {
      return userLocation().then(latlng => {
        return {
          address: '',
          origin: latlng,
          bounds: locationBounds(latlng, currentLocationBoundsDistance),
        };
      });
    }

    if (prediction.predictionPlace) {
      return Promise.resolve(prediction.predictionPlace);
    }

    // Extract detailed address components from Mapbox response
    const extractAddressComponents = prediction => {
      const context = prediction.context || [];

      // Extract from context array
      const postalCode = context.find(c => c.id?.startsWith('postcode.'))?.text || '';
      const city = context.find(c => c.id?.startsWith('place.'))?.text || '';
      const region = context.find(c => c.id?.startsWith('region.'));
      const country = context.find(c => c.id?.startsWith('country.'))?.text || '';

      // Extract state/province code (last 2 characters of short_code, e.g., "IT-MB" -> "MB")
      const state = region?.short_code ? region.short_code.split('-').pop() : '';

      // Extract street name and number
      const street = prediction.text || '';
      const streetNumber = prediction.address || '';

      return {
        street,
        streetNumber,
        postalCode,
        city,
        state,
        country,
      };
    };

    const addressComponents = extractAddressComponents(prediction);
    const origin = placeOrigin(prediction);

    const placeDetails = {
      address: this.getPredictionAddress(prediction),
      origin: origin,
      bounds: placeBounds(prediction),
      // Add detailed address components for form pre-filling
      street: addressComponents.street,
      streetNumber: addressComponents.streetNumber,
      postalCode: addressComponents.postalCode,
      city: addressComponents.city,
      state: addressComponents.state,
      country: addressComponents.country,
    };

    return Promise.resolve(placeDetails);
  }
}

export default GeocoderMapbox;
