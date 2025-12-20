# Guida Completa all'Architettura del Progetto Sharetribe

## Indice

1. [Panoramica Generale](#panoramica-generale)
2. [Architettura del Progetto](#architettura-del-progetto)
3. [React: Fondamenti e Pattern](#react-fondamenti-e-pattern)
4. [Redux: Gestione dello Stato](#redux-gestione-dello-stato)
5. [Comunicazione con Sharetribe Marketplace API](#comunicazione-con-sharetribe-marketplace-api)
6. [Integrazione con Stripe](#integrazione-con-stripe)
7. [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
8. [Routing e Navigazione](#routing-e-navigazione)
9. [Sistema di Configurazione](#sistema-di-configurazione)
10. [Flussi Principali](#flussi-principali)
11. [Caratteristiche JavaScript/ES6+ Utilizzate](#caratteristiche-javascriptes6-utilizzate)

---

## Panoramica Generale

Questo progetto è un **marketplace web** basato su **Sharetribe Flex**, costruito con:
- **Frontend**: React 18.3.1 con Redux per la gestione dello stato
- **Backend**: Node.js/Express per il server-side rendering e API endpoints
- **SDK**: Sharetribe Flex SDK per comunicare con l'API di Sharetribe
- **Pagamenti**: Stripe per elaborare i pagamenti
- **Build**: Webpack (tramite sharetribe-scripts)

### Stack Tecnologico Principale

```javascript
// package.json mostra le dipendenze principali:
{
  "react": "^18.3.1",
  "react-redux": "^8.1.2",
  "redux": "^4.2.1",
  "redux-thunk": "^2.4.2",
  "sharetribe-flex-sdk": "^1.21.1",
  "express": "^4.21.2",
  "react-router-dom": "^5.3.4"
}
```

---

## Architettura del Progetto

### Struttura delle Directory

```
web-template/
├── src/                    # Codice sorgente frontend
│   ├── app.js             # Componente principale React
│   ├── index.js           # Entry point client-side
│   ├── store.js           # Configurazione Redux store
│   ├── reducers.js        # Root reducer
│   ├── components/        # Componenti React riutilizzabili
│   ├── containers/        # Container components (pagine)
│   ├── ducks/             # Redux ducks (actions + reducers)
│   ├── routing/           # Configurazione routing
│   ├── util/              # Utility functions
│   ├── config/            # File di configurazione
│   └── translations/      # File di traduzione
├── server/                # Codice server-side
│   ├── index.js          # Server Express principale
│   ├── apiServer.js      # Server API per sviluppo
│   ├── apiRouter.js      # Router per endpoint API
│   ├── api/              # Endpoint API specifici
│   └── api-util/         # Utility per SDK
└── ext/                   # File di estensione (transaction processes)
```

### Flusso di Esecuzione

1. **Avvio Applicazione**:
   - Client: `src/index.js` → crea store Redux → renderizza `ClientApp`
   - Server: `server/index.js` → SSR → serve HTML pre-renderizzato

2. **Navigazione**:
   - React Router gestisce le route
   - Ogni route può avere `loadData` per pre-caricare dati
   - Redux store mantiene lo stato globale

3. **Comunicazione API**:
   - Frontend → Server API (`/api/*`) → Sharetribe SDK → Marketplace API
   - Frontend → Stripe SDK (direttamente dal browser)

---

## React: Fondamenti e Pattern

### Componenti Funzionali vs Class Components

Questo progetto usa **esclusivamente componenti funzionali** (non class components):

```javascript
// ✅ Pattern utilizzato nel progetto
const MyComponent = ({ title, onClick }) => {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onClick}>Click</button>
    </div>
  );
};

// ❌ Pattern NON utilizzato (vecchio stile)
class MyComponent extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
```

### Hooks: useState e useEffect

Esempio reale da `src/app.js`:

```javascript
// Hook per gestire lo stato locale
const [mounted, setMounted] = useState(false);
const [currentAreas, setAreas] = useState(parseDefaultAreasFromProps(props));

// useEffect per side effects (equivalente a componentDidMount/Update)
useEffect(() => {
  setMounted(true);
}, []); // Array vuoto = esegue solo al mount

useEffect(() => {
  let resizeListeners = [];
  if (mounted && responsiveAreas) {
    resizeListeners = handleResponsiveAreasOnBrowser(responsiveAreas, setAreas);
  }
  
  // Cleanup function (equivalente a componentWillUnmount)
  return () => {
    resizeListeners.forEach(listener => {
      const { mediaQueryList, resizeListener } = listener;
      mediaQueryList.removeEventListener('change', resizeListener);
    });
  };
}, [mounted]); // Esegue quando 'mounted' cambia
```

### Esempio Reale: PreviewListingPage

Da `src/containers/PreviewListingPage/PreviewListingPage.js`:

```1:150:src/containers/PreviewListingPage/PreviewListingPage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { bool, func, object, shape, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl, intlShape, injectIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { currencyFormatting } from '../../config/settingsCurrency';
import { ensureCurrentUser, ensureOwnListing } from '../../util/data';
import { LISTING_STATE_DRAFT } from '../../util/types';
import { createResourceLocatorString, findRouteByRouteName } from '../../util/routes';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';

// Helper function to delete image from listing
const deleteImageFromListing = (currentImages, imageUuid, listingId, config, sdk, dispatch) => {
  // Helper function to extract image ID (similar to EditListingPage.duck.js)
  const getImageId = img => img.imageId || img.id;
  
  // Remove the image to delete from the images array
  const imageIds = currentImages
    .map(getImageId)
    .filter(id => {
      // Compare UUIDs - handle both UUID objects and string UUIDs
      const idUuid = typeof id === 'object' ? id.uuid : id;
      return idUuid !== imageUuid;
    });

  const imageVariantInfo = getImageVariantInfo(config?.layout?.listingImage || {});
  const queryParams = {
    expand: true,
    include: ['images'],
    'fields.image': imageVariantInfo.fieldsImage,
    ...imageVariantInfo.imageVariants,
  };

  // Update listing with new images array
  return sdk.ownListings.update(
    { id: listingId, images: imageIds },
    queryParams
  ).then(response => {
    // Refresh the listing in the store
    return dispatch(requestShowListing({ id: listingId }, config));
  });
};
import { requirePayoutDetails } from '../../util/configHelpers';
import { INQUIRY_PROCESS_NAME } from '../../transactions/transaction';
import { types as sdkTypes, createImageVariantConfig, createInstance } from '../../util/sdkLoader';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';

const { UUID } = sdkTypes;

import {
  Page,
  LayoutSingleColumn,
  NamedLink,
  PrimaryButton,
  SecondaryButton,
  Modal,
  IconSpinner,
  Map,
  IconClose,
  IconDelete,
  NotificationBanner,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import NotFoundPage from '../NotFoundPage/NotFoundPage';
import LoadingPage from '../LoadingPage/LoadingPage';
import AvailabilityCalendar from '../AIListingCreationPage/AvailabilityCalendar';
import LocationAutocompleteInputImpl from '../../components/LocationAutocompleteInput/LocationAutocompleteInput';

import {
  requestPublishListingDraft,
  clearPublishError,
  requestShowListing,
  requestUpdateListing,
} from '../EditListingPage/EditListingPage.duck';
import { getStripeConnectAccountLink, createStripeAccount, fetchStripeAccount } from '../../ducks/stripeConnectAccount.duck';

import css from './PreviewListingPage.module.css';

const STRIPE_ONBOARDING_RETURN_URL_SUCCESS = 'success';
const STRIPE_ONBOARDING_RETURN_URL_FAILURE = 'failure';

// Get country code for location search based on locale
const getCountryForLocale = locale => {
  // Extract base locale (e.g., 'it' from 'it-IT')
  const baseLocale = locale ? locale.split('-')[0].toLowerCase() : 'en';
  const countryMap = {
    en: 'GB',
    de: 'DE',
    fr: 'FR',
    it: 'IT',
    es: 'ES',
    pt: 'PT',
  };
  return countryMap[baseLocale] || 'IT';
};

/**
 * Geocode an address using Mapbox Geocoding API
 * @param {string} addressString - Full address string
 * @param {string} countryCode - ISO country code for limiting results (e.g., 'IT')
 * @returns {Promise<{lat: number, lng: number}|null>} - Geolocation coordinates or null if not found
 */
const geocodeAddress = async (addressString, countryCode) => {
  if (!addressString || !addressString.trim()) {
    return null;
  }

  // Check if Mapbox SDK is available
  if (typeof window === 'undefined' || !window.mapboxgl || !window.mapboxSdk || !window.mapboxgl.accessToken) {
    console.warn('Mapbox SDK not available for geocoding');
    return null;
  }

  try {
    const client = window.mapboxSdk({
      accessToken: window.mapboxgl.accessToken,
    });

    const queryParams = {
      limit: 1,
      types: 'address',
    };

    // Add country if provided
    if (countryCode) {
      queryParams.country = countryCode.toLowerCase();
    }

    const request = client.createRequest({
      method: 'GET',
      path: '/geocoding/v5/mapbox.places/:query.json',
      params: {
        query: addressString,
      },
      query: queryParams,
    });

    const response = await request.send();

    if (response.body && response.body.features && response.body.features.length > 0) {
      const feature = response.body.features[0];
      if (feature.center && Array.isArray(feature.center) && feature.center.length === 2) {
        // Mapbox returns coordinates as [longitude, latitude]
        const [lng, lat] = feature.center;
        return { lat, lng };
```

**Spiegazione**:
- `useState`: gestisce lo stato locale del componente (es. `mounted`, `currentAreas`)
- `useEffect`: esegue side effects (es. setup listeners, cleanup)
- `useCallback`: memoizza funzioni per evitare re-render inutili
- `useRef`: mantiene riferimenti a valori che non causano re-render

### Props e Destructuring

```javascript
// Destructuring delle props
const PreviewListingPage = ({ 
  params, 
  location, 
  currentUser, 
  listing, 
  ...otherProps 
}) => {
  // Usa le props destrutturate
  const listingId = params.id;
  const searchParams = location.search;
};
```

### Context API

Il progetto usa React Context per configurazione e routing:

```javascript
// Esempio da src/app.js
import { ConfigurationProvider } from './context/configurationContext';
import { RouteConfigurationProvider } from './context/routeConfigurationContext';

// Provider wrappa l'app
<ConfigurationProvider value={appConfig}>
  <RouteConfigurationProvider value={routeConfig}>
    {children}
  </RouteConfigurationProvider>
</ConfigurationProvider>

// Uso nei componenti
const MyComponent = () => {
  const config = useConfiguration();
  const routeConfig = useRouteConfiguration();
  // Usa config e routeConfig
};
```

---

## Redux: Gestione dello Stato

### Architettura Redux

Redux segue il pattern **unidirectional data flow**:

```
Action → Reducer → Store → Component
   ↑                              ↓
   └────────── Dispatch ──────────┘
```

### Configurazione dello Store

Da `src/store.js`:

```1:26:src/store.js
// We create Redux store directly, instead of using any extra dependencies.
import { legacy_createStore as createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import createReducer from './reducers';
import * as analytics from './analytics/analytics';
import appSettings from './config/settings';

/**
 * Create a new store with the given initial state. Adds Redux
 * middleware and enhancers.
 */
export default function configureStore(initialState = {}, sdk = null, analyticsHandlers = []) {
  const middlewares = [thunk.withExtraArgument(sdk), analytics.createMiddleware(analyticsHandlers)];

  // Enable Redux Devtools in client side dev mode.
  const composeEnhancers =
    appSettings.dev && typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      : compose;

  const enhancer = composeEnhancers(applyMiddleware(...middlewares));

  const store = createStore(createReducer(), initialState, enhancer);

  return store;
}
```

**Spiegazione**:
- `createStore`: crea lo store Redux
- `thunk.withExtraArgument(sdk)`: middleware per async actions (passa SDK come argomento extra)
- `composeEnhancers`: abilita Redux DevTools in sviluppo

### Pattern "Duck"

Il progetto usa il pattern **Duck** (actions + reducer nello stesso file):

Esempio da `src/ducks/auth.duck.js`:

```1:150:src/ducks/auth.duck.js
import * as log from '../util/log';
import { storableError } from '../util/errors';
import { clearCurrentUser, fetchCurrentUser } from './user.duck';
import { createUserWithIdp } from '../util/api';

const authenticated = authInfo => authInfo?.isAnonymous === false;
const loggedInAs = authInfo => authInfo?.isLoggedInAs === true;

// ================ Action types ================ //

export const AUTH_INFO_REQUEST = 'app/auth/AUTH_INFO_REQUEST';
export const AUTH_INFO_SUCCESS = 'app/auth/AUTH_INFO_SUCCESS';

export const LOGIN_REQUEST = 'app/auth/LOGIN_REQUEST';
export const LOGIN_SUCCESS = 'app/auth/LOGIN_SUCCESS';
export const LOGIN_ERROR = 'app/auth/LOGIN_ERROR';

export const LOGOUT_REQUEST = 'app/auth/LOGOUT_REQUEST';
export const LOGOUT_SUCCESS = 'app/auth/LOGOUT_SUCCESS';
export const LOGOUT_ERROR = 'app/auth/LOGOUT_ERROR';

export const SIGNUP_REQUEST = 'app/auth/SIGNUP_REQUEST';
export const SIGNUP_SUCCESS = 'app/auth/SIGNUP_SUCCESS';
export const SIGNUP_ERROR = 'app/auth/SIGNUP_ERROR';

export const CONFIRM_REQUEST = 'app/auth/CONFIRM_REQUEST';
export const CONFIRM_SUCCESS = 'app/auth/CONFIRM_SUCCESS';
export const CONFIRM_ERROR = 'app/auth/CONFIRM_ERROR';

// Generic user_logout action that can be handled elsewhere
// E.g. src/reducers.js clears store as a consequence
export const USER_LOGOUT = 'app/USER_LOGOUT';

// ================ Reducer ================ //

const initialState = {
  isAuthenticated: false,

  // is marketplace operator logged in as a marketplace user
  isLoggedInAs: false,

  // scopes associated with current token
  authScopes: [],

  // auth info
  authInfoLoaded: false,

  // login
  loginError: null,
  loginInProgress: false,

  // logout
  logoutError: null,
  logoutInProgress: false,

  // signup
  signupError: null,
  signupInProgress: false,

  // confirm (create use with idp)
  confirmError: null,
  confirmInProgress: false,
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case AUTH_INFO_REQUEST:
      return state;
    case AUTH_INFO_SUCCESS:
      return {
        ...state,
        authInfoLoaded: true,
        isAuthenticated: authenticated(payload),
        isLoggedInAs: loggedInAs(payload),
        authScopes: payload.scopes,
      };

    case LOGIN_REQUEST:
      return {
        ...state,
        loginInProgress: true,
        loginError: null,
        logoutError: null,
        signupError: null,
      };
    case LOGIN_SUCCESS:
      return { ...state, loginInProgress: false, isAuthenticated: true };
    case LOGIN_ERROR:
      return { ...state, loginInProgress: false, loginError: payload };

    case LOGOUT_REQUEST:
      return { ...state, logoutInProgress: true, loginError: null, logoutError: null };
    case LOGOUT_SUCCESS:
      return {
        ...state,
        logoutInProgress: false,
        isAuthenticated: false,
        isLoggedInAs: false,
        authScopes: [],
      };
    case LOGOUT_ERROR:
      return { ...state, logoutInProgress: false, logoutError: payload };

    case SIGNUP_REQUEST:
      return { ...state, signupInProgress: true, loginError: null, signupError: null };
    case SIGNUP_SUCCESS:
      return { ...state, signupInProgress: false };
    case SIGNUP_ERROR:
      return { ...state, signupInProgress: false, signupError: payload };

    case CONFIRM_REQUEST:
      return { ...state, confirmInProgress: true, loginError: null, confirmError: null };
    case CONFIRM_SUCCESS:
      return { ...state, confirmInProgress: false, isAuthenticated: true };
    case CONFIRM_ERROR:
      return { ...state, confirmInProgress: false, confirmError: payload };

    default:
      return state;
  }
}

// ================ Selectors ================ //

export const authenticationInProgress = state => {
  const { loginInProgress, logoutInProgress, signupInProgress, confirmInProgress } = state.auth;
  return loginInProgress || logoutInProgress || signupInProgress || confirmInProgress;
};

// ================ Action creators ================ //

export const authInfoRequest = () => ({ type: AUTH_INFO_REQUEST });
export const authInfoSuccess = info => ({ type: AUTH_INFO_SUCCESS, payload: info });

export const loginRequest = () => ({ type: LOGIN_REQUEST });
export const loginSuccess = () => ({ type: LOGIN_SUCCESS });
export const loginError = error => ({ type: LOGIN_ERROR, payload: error, error: true });

export const logoutRequest = () => ({ type: LOGOUT_REQUEST });
export const logoutSuccess = () => ({ type: LOGOUT_SUCCESS });
export const logoutError = error => ({ type: LOGOUT_ERROR, payload: error, error: true });

export const signupRequest = () => ({ type: SIGNUP_REQUEST });
export const signupSuccess = () => ({ type: SIGNUP_SUCCESS });
export const signupError = error => ({ type: SIGNUP_ERROR, payload: error, error: true });

export const confirmRequest = () => ({ type: CONFIRM_REQUEST });
export const confirmSuccess = () => ({ type: CONFIRM_SUCCESS });
export const confirmError = error => ({ type: CONFIRM_ERROR, payload: error, error: true });
```

**Struttura Duck**:
1. **Action Types**: costanti per identificare le azioni
2. **Initial State**: stato iniziale del reducer
3. **Reducer**: funzione pura che aggiorna lo stato
4. **Selectors**: funzioni per estrarre dati dallo stato
5. **Action Creators**: funzioni che creano action objects
6. **Thunks**: funzioni async che dispatchano multiple actions

### Redux Thunk per Async Actions

Esempio da `src/ducks/user.duck.js`:

```javascript
// Thunk: funzione che ritorna una funzione
export const fetchCurrentUser = () => (dispatch, getState, sdk) => {
  dispatch(currentUserShowRequest());
  
  return sdk.currentUser
    .show()
    .then(response => {
      const user = denormalisedResponseEntities(response)[0];
      dispatch(currentUserShowSuccess(user));
      return user;
    })
    .catch(e => {
      const error = storableError(e);
      dispatch(currentUserShowError(error));
      throw error;
    });
};
```

**Spiegazione**:
- `thunk.withExtraArgument(sdk)`: passa SDK come terzo parametro
- La thunk dispatcha actions sincrone prima/dopo l'operazione async
- Ritorna una Promise per permettere `.then()` nel componente

### Uso nei Componenti: useSelector e useDispatch

```javascript
import { useSelector, useDispatch } from 'react-redux';
import { fetchCurrentUser } from '../ducks/user.duck';

const MyComponent = () => {
  // Legge dallo store
  const currentUser = useSelector(state => state.user.currentUser);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  
  // Dispatcha actions
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);
  
  return <div>Hello {currentUser?.attributes?.profile?.firstName}</div>;
};
```

### Root Reducer

Da `src/reducers.js`:

```1:28:src/reducers.js
import { combineReducers } from 'redux';
import { USER_LOGOUT } from './ducks/auth.duck';
import * as globalReducers from './ducks';
import * as pageReducers from './containers/reducers';

/**
 * Function _createReducer_ combines global reducers (reducers that are used in
 * multiple pages) and reducers that are handling actions happening inside one page container.
 * Since we combineReducers, pageReducers will get page specific key (e.g. SearchPage)
 * which is page specific.
 * Future: this structure could take in asyncReducers, which are changed when you navigate pages.
 */
const appReducer = combineReducers({ ...globalReducers, ...pageReducers });

const createReducer = () => {
  return (state, action) => {
    const appState = action.type === USER_LOGOUT ? undefined : state;

    // Clear sessionStorage when logging out.
    if (action.type === USER_LOGOUT && typeof window !== 'undefined' && !!window.sessionStorage) {
      window.sessionStorage.clear();
    }

    return appReducer(appState, action);
  };
};

export default createReducer;
```

**Spiegazione**:
- `combineReducers`: combina tutti i reducers in un unico reducer
- `globalReducers`: reducers globali (auth, user, etc.)
- `pageReducers`: reducers specifici per pagina
- Logout resetta lo stato a `undefined` (torna allo stato iniziale)

---

## Comunicazione con Sharetribe Marketplace API

### Architettura a Due Livelli

Il progetto usa un'architettura a **due livelli** per la sicurezza:

```
Browser (Frontend)
    ↓
Server API (/api/*)  ← Operazioni privilegiate
    ↓
Sharetribe SDK
    ↓
Marketplace API
```

**Perché?**
- Il **CLIENT_SECRET** non può essere esposto nel browser
- Operazioni privilegiate (es. creare transazioni) richiedono il secret
- Il server agisce come proxy sicuro

### SDK Client-Side

Da `src/util/sdkLoader.js`:

```1:46:src/util/sdkLoader.js
import * as importedSdk from 'sharetribe-flex-sdk';

let exportSdk;

const isServer = () => typeof window === 'undefined';

if (isServer()) {
  // Use eval to skip webpack from bundling SDK in Node
  // eslint-disable-next-line no-eval
  exportSdk = eval('require')('sharetribe-flex-sdk');
} else {
  exportSdk = importedSdk;
}

const { createInstance, types, transit, util } = exportSdk;

// create image variant from variant name, desired width and aspectRatio
const createImageVariantConfig = (name, width, aspectRatio) => {
  let variantWidth = width;
  let variantHeight = Math.round(aspectRatio * width);

  if (variantWidth > 3072 || variantHeight > 3072) {
    if (!isServer) {
      console.error(`Dimensions of custom image variant (${name}) are too high (w:${variantWidth}, h:${variantHeight}).
      Reduce them to max 3072px. https://www.sharetribe.com/api-reference/marketplace.html#custom-image-variants`);
    }

    if (variantHeight > 3072) {
      variantHeight = 3072;
      variantWidth = Math.round(variantHeight / aspectRatio);
    } else if (variantHeight > 3072) {
      variantWidth = 3072;
      variantHeight = Math.round(aspectRatio * variantWidth);
    }
  }

  return {
    [`imageVariant.${name}`]: util.objectQueryString({
      w: variantWidth,
      h: variantHeight,
      fit: 'crop',
    }),
  };
};

export { createInstance, types, transit, util, createImageVariantConfig };
```

**Creazione SDK Client-Side** (da `src/index.js`):

```javascript
const sdk = createInstance({
  transitVerbose: appSettings.sdk.transitVerbose,
  clientId: appSettings.sdk.clientId,
  secure: appSettings.usingSSL,
  typeHandlers: apiUtils.typeHandlers,
  ...baseUrl,
  ...assetCdnBaseUrl,
});
```

### SDK Server-Side

Da `server/api-util/sdk.js`:

```javascript
// SDK per operazioni normali (usa token utente)
exports.getSdk = (req, res) => {
  return sharetribeSdk.createInstance({
    transitVerbose: TRANSIT_VERBOSE,
    clientId: CLIENT_ID,
    httpAgent,
    httpsAgent,
    tokenStore: sharetribeSdk.tokenStore.expressCookieStore({
      clientId: CLIENT_ID,
      req,
      res,
      secure: USING_SSL,
    }),
    typeHandlers,
    ...baseUrlMaybe,
    ...assetCdnBaseUrlMaybe,
  });
};

// SDK per operazioni privilegiate (usa CLIENT_SECRET)
exports.getTrustedSdk = req => {
  const userToken = getUserToken(req);
  
  // Esegue token exchange per ottenere trusted token
  return sdk.exchangeToken().then(response => {
    const trustedToken = response.data;
    
    return sharetribeSdk.createInstance({
      clientId: CLIENT_ID,
      tokenStore: memoryStore(trustedToken), // Non usa cookie!
      // ... altri parametri
    });
  });
};
```

### Serializzazione Transit

Sharetribe SDK usa **Transit** (formato di serializzazione) invece di JSON:

```javascript
// Da src/util/api.js
const serialize = data => {
  return transit.write(data, { typeHandlers, verbose: appSettings.sdk.transitVerbose });
};

const deserialize = str => {
  return transit.read(str, { typeHandlers });
};

// Request con Transit
const request = (path, options = {}) => {
  const fetchOptions = {
    headers: { 'Content-Type': 'application/transit+json' },
    body: serialize(body), // Serializza con Transit
  };
  
  return window.fetch(url, fetchOptions).then(res => {
    const contentType = res.headers.get('Content-Type');
    if (contentType === 'application/transit+json') {
      return res.text().then(deserialize); // Deserializza Transit
    }
    return res.json(); // Fallback a JSON
  });
};
```

**Perché Transit?**
- Supporta tipi complessi (Date, UUID, BigDecimal, etc.)
- Più efficiente di JSON per dati strutturati
- Sharetribe API richiede Transit per alcuni endpoint

### Esempio: Fetch Current User

```javascript
// Thunk in user.duck.js
export const fetchCurrentUser = () => (dispatch, getState, sdk) => {
  dispatch(currentUserShowRequest());
  
  // Chiamata SDK diretta (client-side)
  return sdk.currentUser
    .show()
    .then(response => {
      // Denormalizza la risposta (estrae entità dalle relazioni)
      const user = denormalisedResponseEntities(response)[0];
      dispatch(currentUserShowSuccess(user));
      return user;
    })
    .catch(e => {
      const error = storableError(e);
      dispatch(currentUserShowError(error));
      throw error;
    });
};
```

### Esempio: Operazione Privilegiata (Server-Side)

Da `server/api/initiate-privileged.js`:

```javascript
// Endpoint server che usa trusted SDK
router.post('/initiate-privileged', (req, res) => {
  const sdk = sdkUtils.getTrustedSdk(req);
  const { transition, params } = req.body;
  
  // Usa trusted SDK per operazione privilegiata
  return sdk.transactions
    .initiate({ transition, params })
    .then(response => {
      res.status(200).json(response);
    })
    .catch(e => {
      sdkUtils.handleError(res, e);
    });
});
```

**Flusso Completo**:

1. **Frontend** chiama `/api/initiate-privileged` con dati Transit
2. **Server** deserializza Transit → ottiene trusted SDK → chiama Marketplace API
3. **Marketplace API** risponde → Server serializza Transit → Frontend riceve risposta

### Type Handlers

Il progetto usa **type handlers** per convertire tipi SDK in tipi JavaScript:

```javascript
// Da src/util/api.js e server/api-util/sdk.js
export const typeHandlers = [
  {
    type: sdkTypes.BigDecimal,
    customType: Decimal, // Usa Decimal.js invece di BigDecimal SDK
    writer: v => new sdkTypes.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];
```

**Perché?**
- `BigDecimal` SDK non è facile da usare in JavaScript
- `Decimal.js` è più comodo per calcoli monetari
- I type handlers convertono automaticamente

---

## Integrazione con Stripe

### Architettura Stripe

Stripe è integrato in **due modi**:

1. **Stripe Connect**: per i pagamenti ai provider (venditori)
2. **Stripe Payment Intents**: per i pagamenti dei clienti

### Stripe Connect: Setup Account Provider

Da `src/ducks/stripeConnectAccount.duck.js`:

```javascript
export const createStripeAccount = params => (dispatch, getState, sdk) => {
  const { country, accountType, stripePublishableKey } = params;
  const stripe = window.Stripe(stripePublishableKey);
  
  // Crea account token con Stripe.js
  return stripe
    .createToken('account', {
      business_type: accountType,
      tos_shown_and_accepted: true,
    })
    .then(response => {
      const accountToken = response.token.id;
      
      // Crea account su Sharetribe (che lo passa a Stripe)
      return sdk.stripeAccount.create(
        {
          country,
          accountToken,
          requestedCapabilities: ['card_payments', 'transfers'],
        },
        { expand: true }
      );
    })
    .then(response => {
      const stripeAccount = response.data.data;
      dispatch(stripeAccountCreateSuccess(stripeAccount));
      return stripeAccount;
    });
};
```

**Flusso**:
1. Frontend crea account token con Stripe.js
2. Frontend chiama `sdk.stripeAccount.create()` (passa token a Sharetribe)
3. Sharetribe crea account Stripe Connect
4. Provider completa onboarding su Stripe

### Stripe Payment Intents: Pagamento Cliente

Da `src/containers/CheckoutPage/CheckoutPageTransactionHelpers.js`:

```javascript
export const processCheckoutWithPayment = (orderParams, extraPaymentParams) => {
  // Step 1: Crea ordine (transition/request-payment)
  const fnRequestPayment = () => {
    return onInitiateOrder(orderParams).then(order => {
      // Salva transaction in sessionStorage
      saveTransactionToSessionStorage(order, sessionStorageKey);
      return order;
    });
  };
  
  // Step 2: Conferma pagamento con Stripe
  const fnConfirmCardPayment = order => {
    const { stripePaymentIntentClientSecret } = 
      order.attributes.protectedData.stripePaymentIntents.default;
    
    const { stripe, card, billingDetails } = extraPaymentParams;
    
    // Conferma PaymentIntent con Stripe.js
    return stripe.confirmCardPayment(stripePaymentIntentClientSecret, {
      payment_method: {
        billing_details: billingDetails,
        card: card,
      },
    }).then(result => {
      if (result.error) {
        throw new Error(result.error.message);
      }
      return { transactionId: order.id, paymentIntent: result.paymentIntent };
    });
  };
  
  // Step 3: Conferma transazione (transition/confirm-payment)
  const fnConfirmPayment = ({ transactionId, paymentIntent }) => {
    return onConfirmPayment({
      id: transactionId,
      transition: 'transition/confirm-payment',
      params: {
        paymentIntentId: paymentIntent.id,
      },
    });
  };
  
  // Esegue sequenza
  return fnRequestPayment()
    .then(fnConfirmCardPayment)
    .then(fnConfirmPayment);
};
```

**Flusso Completo**:

1. **Cliente** clicca "Acquista"
2. **Frontend** chiama `transition/request-payment` (privilegiata) → crea PaymentIntent
3. **Stripe.js** conferma pagamento con carta → PaymentIntent confermato
4. **Frontend** chiama `transition/confirm-payment` → transazione completa

### Transaction Process

I processi di transazione sono definiti in **EDN** (Clojure-like):

Da `ext/transaction-processes/default-purchase/process.edn`:

```clojure
{:name :transition/request-payment
 :actor :actor.role/customer
 :privileged? true
 :actions
 [{:name :action/update-protected-data}
  {:name :action/create-pending-stock-reservation}
  {:name :action/privileged-set-line-items}
  {:name :action/stripe-create-payment-intent}]  ; ← Crea PaymentIntent
 :to :state/pending-payment}

{:name :transition/confirm-payment
 :actor :actor.role/customer
 :actions
 [{:name :action/accept-stock-reservation}
  {:name :action/stripe-confirm-payment-intent}  ; ← Conferma PaymentIntent
  {:name :action/stripe-capture-payment-intent}] ; ← Cattura pagamento
 :from :state/pending-payment
 :to :state/purchased}
```

**Spiegazione**:
- `privileged? true`: richiede operazione privilegiata (server-side)
- `action/stripe-create-payment-intent`: Sharetribe crea PaymentIntent
- `action/stripe-confirm-payment-intent`: Sharetribe conferma PaymentIntent
- `action/stripe-capture-payment-intent`: Sharetribe cattura il pagamento

---

## Server-Side Rendering (SSR)

### Perché SSR?

1. **SEO**: i motori di ricerca vedono HTML completo
2. **Performance**: primo render più veloce
3. **Social Sharing**: Open Graph tags funzionano

### Flusso SSR

Da `server/index.js`:

```213:290:server/index.js
app.get('*', async (req, res) => {
  if (req.url.startsWith('/static/')) {
    // The express.static middleware only handles static resources
    // that it finds, otherwise passes them through. However, we don't
    // want to render the app for missing static resources and can
    // just return 404 right away.
    return res.status(404).send('Static asset not found.');
  }

  if (req.url === '/_status.json') {
    return res.status(200).send({ status: 'ok' });
  }

  const context = {};

  // Until we have a better plan for caching dynamic content and we
  // make sure that no sensitive data can appear in the prefetched
  // data, let's disable response caching altogether.
  res.set(noCacheHeaders);

  // Get chunk extractors from node and web builds
  // https://loadable-components.com/docs/api-loadable-server/#chunkextractor
  const { nodeExtractor, webExtractor } = getExtractors();

  // Server-side entrypoint provides us the functions for server-side data loading and rendering
  const nodeEntrypoint = nodeExtractor.requireEntrypoint();
  const { default: renderApp, ...appInfo } = nodeEntrypoint;

  const sdk = sdkUtils.getSdk(req, res);

  dataLoader
    .loadData(req.url, sdk, appInfo)
    .then(data => {
      const cspNonce = cspEnabled ? res.locals.cspNonce : null;
      return renderer.render(req.url, context, data, renderApp, webExtractor, cspNonce);
    })
    .then(html => {
      if (dev) {
        const debugData = {
          url: req.url,
          context,
        };
        console.log(`\nRender info:\n${JSON.stringify(debugData, null, '  ')}`);
      }

      if (context.unauthorized) {
        // Routes component injects the context.unauthorized when the
        // user isn't logged in to view the page that requires
        // authentication.
        sdk.authInfo().then(authInfo => {
          if (authInfo && authInfo.isAnonymous === false) {
            // It looks like the user is logged in.
            // Full verification would require actual call to API
            // to refresh the access token
            res.status(200).send(html);
          } else {
            // Current token is anonymous.
            res.status(401).send(html);
          }
        });
      } else if (context.forbidden) {
        res.status(403).send(html);
      } else if (context.url) {
        // React Router injects the context.url if a redirect was rendered
        res.redirect(context.url);
      } else if (context.notfound) {
        // NotFoundPage component injects the context.notfound when a
        // 404 should be returned
        res.status(404).send(html);
      } else {
        res.send(html);
      }
    })
    .catch(e => {
      log.error(e, 'server-side-render-failed');
      res.status(500).send(errorPage500);
    });
});
```

**Flusso**:

1. **Request** arriva al server
2. **dataLoader.loadData()**: pre-carica dati per la route (chiama `loadData` della route)
3. **renderer.render()**: renderizza React in HTML string
4. **Response**: invia HTML + script tags per hydration

### Data Loading

Ogni route può avere una funzione `loadData`:

```javascript
// Da src/routing/routeConfiguration.js
{
  path: '/l/:slug/:id',
  name: 'ListingPage',
  component: ListingPage,
  loadData: pageDataLoadingAPI.ListingPage.loadData, // ← Pre-carica dati
}
```

Esempio `loadData`:

```javascript
// Da src/containers/ListingPage/ListingPage.duck.js
export const loadData = (params, search, config) => (dispatch, getState, sdk) => {
  const { id, slug } = params;
  
  // Pre-carica listing per SSR
  return dispatch(requestShowListing({ id, slug }, config));
};
```

### Hydration

Da `src/index.js`:

```javascript
const render = (store, shouldHydrate) => {
  const state = store.getState();
  const preloadedState = window.__PRELOADED_STATE__; // Stato dal server
  
  // Se c'è stato pre-caricato, usa hydration
  if (shouldHydrate) {
    const container = document.getElementById('root');
    ReactDOMClient.hydrateRoot(
      container,
      <ClientApp store={store} />,
      { onRecoverableError: log.onRecoverableError }
    );
  } else {
    // Altrimenti render normale
    const root = ReactDOMClient.createRoot(container);
    root.render(<ClientApp store={store} />);
  }
};
```

**Hydration**: React "attacca" event listeners all'HTML pre-renderizzato invece di ricreare tutto.

---

## Routing e Navigazione

### Configurazione Route

Da `src/routing/routeConfiguration.js`:

```1:100:src/routing/routeConfiguration.js
import React from 'react';
import loadable from '@loadable/component';

import getPageDataLoadingAPI from '../containers/pageDataLoadingAPI';
import NotFoundPage from '../containers/NotFoundPage/NotFoundPage';
import PreviewResolverPage from '../containers/PreviewResolverPage/PreviewResolverPage';

// routeConfiguration needs to initialize containers first
// Otherwise, components will import form container eventually and
// at that point css bundling / imports will happen in wrong order.
import { NamedRedirect } from '../components';

const pageDataLoadingAPI = getPageDataLoadingAPI();

const AIListingCreationPage = loadable(() => import(/* webpackChunkName: "AIListingCreationPage" */ '../containers/AIListingCreationPage/AIListingCreationPage'));
const AuthenticationPage = loadable(() => import(/* webpackChunkName: "AuthenticationPage" */ '../containers/AuthenticationPage/AuthenticationPage'));
const CheckoutPage = loadable(() => import(/* webpackChunkName: "CheckoutPage" */ '../containers/CheckoutPage/CheckoutPage'));
const CMSPage = loadable(() => import(/* webpackChunkName: "CMSPage" */ '../containers/CMSPage/CMSPage'));
const ContactDetailsPage = loadable(() => import(/* webpackChunkName: "ContactDetailsPage" */ '../containers/ContactDetailsPage/ContactDetailsPage'));
const EditListingPage = loadable(() => import(/* webpackChunkName: "EditListingPage" */ '../containers/EditListingPage/EditListingPage'));
const EmailVerificationPage = loadable(() => import(/* webpackChunkName: "EmailVerificationPage" */ '../containers/EmailVerificationPage/EmailVerificationPage'));
const InboxPage = loadable(() => import(/* webpackChunkName: "InboxPage" */ '../containers/InboxPage/InboxPage'));
const MakeOfferPage = loadable(() => import(/* webpackChunkName: "MakeOfferPage" */ '../containers/MakeOfferPage/MakeOfferPage'));
const LandingPage = loadable(() => import(/* webpackChunkName: "LandingPage" */ '../containers/LandingPage/LandingPage'));
const NewLandingPage = loadable(() => import(/* webpackChunkName: "NewLandingPage" */ '../containers/NewLandingPage/NewLandingPage'));
const NewLoginPage = loadable(() => import(/* webpackChunkName: "NewLoginPage" */ '../containers/NewLoginPage/NewLoginPage'));
const NewSignupPage = loadable(() => import(/* webpackChunkName: "NewSignupPage" */ '../containers/NewSignupPage/NewSignupPage'));
const ListingPageCoverPhoto = loadable(() => import(/* webpackChunkName: "ListingPageCoverPhoto" */ /* webpackPrefetch: true */ '../containers/ListingPage/ListingPageCoverPhoto'));
const ListingPageCarousel = loadable(() => import(/* webpackChunkName: "ListingPageCarousel" */ /* webpackPrefetch: true */ '../containers/ListingPage/ListingPageCarousel'));
const ProductPage = loadable(() => import(/* webpackChunkName: "ProductPage" */ '../containers/ProductPage/ProductPage'));
const ManageListingsPage = loadable(() => import(/* webpackChunkName: "ManageListingsPage" */ '../containers/ManageListingsPage/ManageListingsPage'));
const PasswordChangePage = loadable(() => import(/* webpackChunkName: "PasswordChangePage" */ '../containers/PasswordChangePage/PasswordChangePage'));
const PasswordRecoveryPage = loadable(() => import(/* webpackChunkName: "PasswordRecoveryPage" */ '../containers/PasswordRecoveryPage/PasswordRecoveryPage'));
const PasswordResetPage = loadable(() => import(/* webpackChunkName: "PasswordResetPage" */ '../containers/PasswordResetPage/PasswordResetPage'));
const PaymentMethodsPage = loadable(() => import(/* webpackChunkName: "PaymentMethodsPage" */ '../containers/PaymentMethodsPage/PaymentMethodsPage'));
const PreviewListingPage = loadable(() => import(/* webpackChunkName: "PreviewListingPage" */ '../containers/PreviewListingPage/PreviewListingPage'));
const PrivacyPolicyPage = loadable(() => import(/* webpackChunkName: "PrivacyPolicyPage" */ '../containers/PrivacyPolicyPage/PrivacyPolicyPage'));
const ProfilePage = loadable(() => import(/* webpackChunkName: "ProfilePage" */ '../containers/ProfilePage/ProfilePage'));
const ProfileSettingsPage = loadable(() => import(/* webpackChunkName: "ProfileSettingsPage" */ '../containers/ProfileSettingsPage/ProfileSettingsPage'));
const SearchPageWithMap = loadable(() => import(/* webpackChunkName: "SearchPageWithMap" */ /* webpackPrefetch: true */  '../containers/SearchPage/SearchPageWithMap'));
const SearchPageWithGrid = loadable(() => import(/* webpackChunkName: "SearchPageWithGrid" */ /* webpackPrefetch: true */  '../containers/SearchPage/SearchPageWithGrid'));
const StripePayoutPage = loadable(() => import(/* webpackChunkName: "StripePayoutPage" */ '../containers/StripePayoutPage/StripePayoutPage'));
const TermsOfServicePage = loadable(() => import(/* webpackChunkName: "TermsOfServicePage" */ '../containers/TermsOfServicePage/TermsOfServicePage'));
const TransactionPage = loadable(() => import(/* webpackChunkName: "TransactionPage" */ '../containers/TransactionPage/TransactionPage'));
const NoAccessPage = loadable(() => import(/* webpackChunkName: "NoAccessPage" */ '../containers/NoAccessPage/NoAccessPage'));

// Styleguide helps you to review current components and develop new ones
const StyleguidePage = loadable(() => import(/* webpackChunkName: "StyleguidePage" */ '../containers/StyleguidePage/StyleguidePage'));

export const ACCOUNT_SETTINGS_PAGES = [
  'ContactDetailsPage',
  'PasswordChangePage',
  'StripePayoutPage',
  'PaymentMethodsPage',
];

// https://en.wikipedia.org/wiki/Universally_unique_identifier#Nil_UUID
const draftId = '00000000-0000-0000-0000-000000000000';
const draftSlug = 'draft';

const RedirectToLandingPage = () => <NamedRedirect name="LandingPage" />;

// NOTE: Most server-side endpoints are prefixed with /api. Requests to those
// endpoints are indended to be handled in the server instead of the browser and
// they will not render the application. So remember to avoid routes starting
// with /api and if you encounter clashing routes see server/index.js if there's
// a conflicting route defined there.

// Our routes are exact by default.
// See behaviour from Routes.js where Route is created.
const routeConfiguration = (layoutConfig, accessControlConfig) => {
  const SearchPage = layoutConfig.searchPage?.variantType === 'map' 
    ? SearchPageWithMap 
    : SearchPageWithGrid;
  const ListingPage = layoutConfig.listingPage?.variantType === 'carousel' 
    ? ListingPageCarousel 
    : ListingPageCoverPhoto;

  const isPrivateMarketplace = accessControlConfig?.marketplace?.private === true;
  const authForPrivateMarketplace = isPrivateMarketplace ? { auth: true } : {};
  
  return [
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage,
      loadData: pageDataLoadingAPI.LandingPage.loadData,
    },
```

**Caratteristiche**:
- **Code Splitting**: `loadable()` carica componenti lazy (solo quando servono)
- **webpackPrefetch**: pre-carica route importanti
- **loadData**: pre-carica dati per SSR
- **auth**: richiede autenticazione

### Component Routes

Da `src/routing/Routes.js`:

```1:100:src/routing/Routes.js
import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Switch, Route, withRouter } from 'react-router-dom';

import { useRouteConfiguration } from '../context/routeConfigurationContext';
import { propTypes } from '../util/types';
import * as log from '../util/log';
import { canonicalRoutePath } from '../util/routes';
import { useConfiguration } from '../context/configurationContext';

import { locationChanged } from '../ducks/routing.duck';

import { NamedRedirect } from '../components';
import NotFoundPage from '../containers/NotFoundPage/NotFoundPage';

import LoadableComponentErrorBoundary from './LoadableComponentErrorBoundary/LoadableComponentErrorBoundary';

const isBanned = currentUser => {
  const isBrowser = typeof window !== 'undefined';
  // Future todo: currentUser?.attributes?.state === 'banned'
  return isBrowser && currentUser?.attributes?.banned === true;
};

const canShowComponent = props => {
  const { isAuthenticated, currentUser, route } = props;
  const { auth } = route;
  return !auth || (isAuthenticated && !isBanned(currentUser));
};

const callLoadData = props => {
  const { match, location, route, dispatch, logoutInProgress, config } = props;
  const { loadData, name } = route;
  const shouldLoadData =
    typeof loadData === 'function' && canShowComponent(props) && !logoutInProgress;

  if (shouldLoadData) {
    dispatch(loadData(match.params, location.search, config))
      .then(() => {
        if (props.logLoadDataCalls) {
          // This gives good input for debugging issues on live environments, but with test it's not needed.
          console.log(`loadData success for ${name} route`);
        }
      })
      .catch(e => {
        log.error(e, 'load-data-failed', { routeName: name });
      });
  }
};

const setPageScrollPosition = (location, delayed) => {
  if (!location.hash) {
    // No hash, scroll to top
    window.scroll({
      top: 0,
      left: 0,
    });
  } else {
    const el = document.querySelector(location.hash);
    if (el) {
      // Found element from the current page with the given fragment identifier,
      // scrolling to that element.
      //
      // NOTE: This only works on in-app navigation within the same page.
      // If smooth scrolling is needed between different pages, one needs to wait
      //   1. loadData fetch and
      //   2. code-chunk fetch
      // before making el.scrollIntoView call.

      el.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    } else {
      // A naive attempt to make a delayed call to scrollIntoView
      // Note: 300 milliseconds might not be enough, but adding too much delay
      // might affect user initiated scrolling.
      delayed = window.setTimeout(() => {
        const reTry = document.querySelector(location.hash);
        reTry?.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
      }, 300);
    }
  }
};

const handleLocationChanged = (dispatch, location, routeConfiguration, delayed) => {
  setPageScrollPosition(location, delayed);
  const path = canonicalRoutePath(routeConfiguration, location);
  dispatch(locationChanged(location, path));
};

/**
 * RouteComponentRenderer handles loadData calls on client-side.
 * It also checks authentication and redirects unauthenticated users
 * away from routes that are for authenticated users only
 * (aka "auth: true" is set in routeConfiguration.js)
 *
 * This component is a container: it needs to be connected to Redux.
 *
 * @component
 * @param {Object} props - The props
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {boolean} props.logoutInProgress - Whether the logout is in progress
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {propTypes.route} props.route - The route
 * @param {Array<propTypes.route} props.routeConfiguration - The route configuration
 * @param {Object} props.match - The match
 * @param {Object} props.match.params - The match params
 * @param {string} props.match.url - The match url
 * @param {Object} props.location - The location
 * @param {Object} props.location.search - The location search
 * @param {Object} props.staticContext - The static context
 * @param {Function} props.dispatch - The dispatch function of
 * @returns {JSX.Element} The RouteComponentRenderer component
 */
class RouteComponentRenderer extends Component {
  componentDidMount() {
    const { dispatch, location, routeConfiguration } = this.props;
    this.delayed = null;
    // Calling loadData on initial rendering (on client side).
    callLoadData(this.props);
    handleLocationChanged(dispatch, location, routeConfiguration, this.delayed);
  }

  componentDidUpdate(prevProps) {
    const { dispatch, location, routeConfiguration } = this.props;
    // Call for handleLocationChanged affects store/state
    // and it generates an unnecessary update.
    if (prevProps.location !== this.props.location) {
      // Calling loadData after initial rendering (on client side).
      // This makes it possible to use loadData as default client side data loading technique.
      // However it is better to fetch data before location change to avoid "Loading data" state.
      callLoadData(this.props);
      handleLocationChanged(dispatch, location, routeConfiguration, this.delayed);
    }
  }

  componentWillUnmount() {
    if (this.delayed) {
      window.clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    const { route, match, location, staticContext = {}, currentUser } = this.props;
    const { component: RouteComponent, authPage = 'SignupPage', extraProps } = route;
    const canShow = canShowComponent(this.props);
    if (!canShow) {
      staticContext.unauthorized = true;
    }

    const hasCurrentUser = !!currentUser?.id;
    const restrictedPageWithCurrentUser = !canShow && hasCurrentUser;
    // Banned users are redirected to LandingPage
    const isBannedFromAuthPages = restrictedPageWithCurrentUser && isBanned(currentUser);
    return canShow ? (
      <LoadableComponentErrorBoundary>
        <RouteComponent
          params={match.params}
          location={location}
          staticContext={staticContext}
          {...extraProps}
        />
      </LoadableComponentErrorBoundary>
    ) : isBannedFromAuthPages ? (
      <NamedRedirect name="LandingPage" />
    ) : (
      <NamedRedirect
        name={authPage}
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
}
```

**Funzionalità**:
- **loadData**: chiamato al mount e quando cambia location
- **Auth Check**: verifica autenticazione e redirect se necessario
- **Scroll Management**: gestisce scroll position
- **Error Boundary**: cattura errori nei componenti lazy

---

## Sistema di Configurazione

### Due Livelli di Configurazione

1. **Configurazione Locale** (`src/config/configDefault.js`): valori di default
2. **Hosted Assets** (Sharetribe Console): override in produzione

### Merge Configurazioni

Da `src/app.js`:

```javascript
import { mergeConfig } from './util/configHelpers';

const ClientApp = ({ store, hostedTranslations = {}, hostedConfig = {} }) => {
  // Merge: hostedConfig override configDefault
  const appConfig = mergeConfig(hostedConfig, defaultConfig);
  
  // Usa appConfig in tutta l'app
  return (
    <ConfigurationProvider value={appConfig}>
      {/* ... */}
    </ConfigurationProvider>
  );
};
```

### Esempio Configurazione

```javascript
// configDefault.js
export default {
  marketplaceName: 'My Marketplace',
  currency: 'USD',
  locale: 'en-US',
  branding: {
    marketplaceColor: '#FF0000',
  },
  stripe: {
    publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
  },
};
```

---

## Flussi Principali

### 1. Flusso di Autenticazione

```
1. Utente clicca "Login"
   ↓
2. Componente chiama dispatch(login(params))
   ↓
3. Thunk chiama sdk.login(params)
   ↓
4. SDK chiama Sharetribe Auth API
   ↓
5. Token salvato in cookie (server) / localStorage (client)
   ↓
6. Redux aggiorna state.auth.isAuthenticated = true
   ↓
7. Componente re-renderizza (ora autenticato)
```

### 2. Flusso di Creazione Listing

```
1. Utente compila form creazione listing
   ↓
2. Submit → dispatch(createListingDraft(data))
   ↓
3. Thunk chiama sdk.ownListings.create({ ...data })
   ↓
4. Sharetribe API crea listing (stato: draft)
   ↓
5. Redux aggiorna state.EditListingPage.listing
   ↓
6. Redirect a /l/new/:id (preview)
   ↓
7. Utente clicca "Pubblica"
   ↓
8. dispatch(publishListing(id))
   ↓
9. sdk.ownListings.publish({ id })
   ↓
10. Listing pubblicato (stato: published)
```

### 3. Flusso di Checkout con Pagamento

```
1. Cliente clicca "Acquista" su listing
   ↓
2. Frontend chiama /api/initiate-privileged
   ↓
3. Server usa trusted SDK → transition/request-payment
   ↓
4. Sharetribe crea PaymentIntent → ritorna clientSecret
   ↓
5. Frontend usa Stripe.js → confirmCardPayment(clientSecret)
   ↓
6. Stripe elabora pagamento
   ↓
7. Frontend chiama /api/transition-privileged
   ↓
8. Server → transition/confirm-payment
   ↓
9. Sharetribe cattura pagamento → transazione completa
```

---

## Caratteristiche JavaScript/ES6+ Utilizzate

### 1. Destructuring

```javascript
// Destructuring di oggetti
const { id, type, attributes } = listing;
const { firstName, lastName } = attributes.profile;

// Destructuring di array
const [first, second] = items;

// Destructuring di parametri
const MyComponent = ({ title, onClick, ...rest }) => {
  // ...
};

// Destructuring con default
const { name = 'Unknown' } = user;
```

### 2. Spread Operator

```javascript
// Spread in oggetti
const newState = { ...oldState, newField: value };

// Spread in array
const newArray = [...oldArray, newItem];

// Spread in props
<Component {...props} extraProp="value" />
```

### 3. Arrow Functions

```javascript
// Arrow function semplice
const double = x => x * 2;

// Arrow function con corpo
const process = (data) => {
  return data.map(item => item.value);
};

// Arrow function in array methods
items.map(item => item.id);
items.filter(item => item.active);
items.reduce((acc, item) => acc + item.value, 0);
```

### 4. Template Literals

```javascript
const message = `Hello ${user.name}, you have ${count} items`;
const url = `/api/listings/${listingId}`;
```

### 5. Optional Chaining

```javascript
// Safe property access
const name = user?.profile?.firstName;
const count = items?.length ?? 0;

// Safe method call
const result = data?.map(item => item.value);
```

### 6. Async/Await

```javascript
// Async function
const fetchData = async () => {
  try {
    const response = await sdk.listings.query();
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Uso in useEffect
useEffect(() => {
  const loadData = async () => {
    const data = await fetchData();
    setData(data);
  };
  loadData();
}, []);
```

### 7. Promises e .then()

```javascript
// Promise chain
sdk.currentUser
  .show()
  .then(response => {
    const user = response.data.data;
    return processUser(user);
  })
  .then(processed => {
    dispatch(success(processed));
  })
  .catch(error => {
    dispatch(error(error));
  });
```

### 8. Array Methods

```javascript
// map: trasforma array
const ids = items.map(item => item.id);

// filter: filtra array
const active = items.filter(item => item.active);

// find: trova primo elemento
const item = items.find(item => item.id === targetId);

// reduce: accumula valori
const total = items.reduce((sum, item) => sum + item.price, 0);

// some: verifica condizione
const hasActive = items.some(item => item.active);
```

### 9. Object Methods

```javascript
// Object.keys
const keys = Object.keys(config);

// Object.entries
Object.entries(config).forEach(([key, value]) => {
  // ...
});

// Object.assign
const merged = Object.assign({}, obj1, obj2);

// Object spread (preferito)
const merged = { ...obj1, ...obj2 };
```

### 10. Higher-Order Functions

```javascript
// Function che ritorna function
const createThunk = (actionType) => {
  return (params) => (dispatch) => {
    dispatch({ type: actionType, payload: params });
  };
};

// Function che accetta function
const withErrorHandling = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
};
```

### 11. Closures

```javascript
// Closure: funzione che "ricorda" variabili esterne
const createCounter = () => {
  let count = 0;
  return () => {
    count++;
    return count;
  };
};

const counter = createCounter();
counter(); // 1
counter(); // 2
```

### 12. Modules (ES6)

```javascript
// Export named
export const myFunction = () => { };
export const myConstant = 42;

// Export default
export default MyComponent;

// Import
import { myFunction, myConstant } from './module';
import MyComponent from './MyComponent';
import * as utils from './utils';
```

---

## Conclusioni

Questa guida copre i principali aspetti dell'architettura del progetto:

1. **React**: componenti funzionali, hooks, context
2. **Redux**: store, reducers, thunks, pattern duck
3. **Sharetribe SDK**: client-side e server-side, Transit serialization
4. **Stripe**: Connect accounts e Payment Intents
5. **SSR**: server-side rendering e hydration
6. **Routing**: React Router con code splitting
7. **Configurazione**: merge di config locali e hosted

Per approfondimenti, consulta:
- [Sharetribe Flex Docs](https://www.sharetribe.com/docs/)
- [React Docs](https://react.dev/)
- [Redux Docs](https://redux.js.org/)
- [Stripe Docs](https://stripe.com/docs)

---

**Nota**: Questa guida è basata sul codice attuale del progetto. Alcuni dettagli potrebbero variare in versioni future.



