# Sharetribe Template - Visual Architecture Guide

## Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER VISITS WEBSITE                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Express Server (server/index.js)                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  1. Receives HTTP Request                                       │    │
│  │  2. Matches Route (routeConfiguration.js)                       │    │
│  │  3. Runs loadData() if defined (SSR data fetching)              │    │
│  │  4. Renders React App to HTML string                            │    │
│  │  5. Injects preloaded state into HTML                           │    │
│  │  6. Sends HTML to browser                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER RECEIVES HTML                            │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  1. Parses HTML                                                 │    │
│  │  2. Loads JavaScript bundles (code splitting)                   │    │
│  │  3. Hydrates React app (makes HTML interactive)                 │    │
│  │  4. React takes over                                            │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      REACT APPLICATION RUNNING                           │
│                                                                          │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐      │
│  │  React Router  │────▶│   Page/Route   │────▶│   Components   │      │
│  │   (Routes.js)  │     │  (Container)   │     │ (Presentational)│      │
│  └────────────────┘     └────────────────┘     └────────────────┘      │
│                                │                                         │
│                                ▼                                         │
│                    ┌───────────────────────┐                            │
│                    │    Redux Store        │                            │
│                    │  (Global State)       │                            │
│                    └───────────────────────┘                            │
│                                │                                         │
│                                ▼                                         │
│                    ┌───────────────────────┐                            │
│                    │  Sharetribe Flex SDK  │                            │
│                    │    (API Calls)        │                            │
│                    └───────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Sharetribe Marketplace API (Backend Service)                │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  - Manages listings, users, transactions                        │    │
│  │  - Handles authentication                                       │    │
│  │  - Processes payments via Stripe                                │    │
│  │  - Sends emails                                                 │    │
│  │  - Stores data in database                                      │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Page Component Hierarchy

### Example: ListingPage Structure

```
ListingPage (Container - Redux Connected)
├── Page (Layout wrapper with SEO)
│   ├── Helmet (Meta tags)
│   └── LayoutSingleColumn
│       ├── TopbarContainer (Header)
│       │   ├── Logo
│       │   ├── MenuLabel (Desktop Nav)
│       │   ├── NamedLink × N (Links)
│       │   └── UserNav (Login/Profile)
│       │
│       ├── Main Content
│       │   ├── ActionBarMaybe (Booking CTA - mobile)
│       │   ├── SectionGallery
│       │   │   └── ImageCarousel
│       │   │       └── ResponsiveImage × N
│       │   ├── SectionHero
│       │   │   ├── Heading (Title)
│       │   │   ├── OrderPanel (Booking form - desktop)
│       │   │   └── ActionBarMaybe (mobile)
│       │   ├── SectionDetailsMaybe
│       │   │   └── PropertyGroup × N
│       │   ├── SectionTextMaybe (Description)
│       │   ├── SectionMapMaybe
│       │   │   └── Map
│       │   ├── SectionReviews
│       │   │   ├── ReviewRating
│       │   │   └── Reviews
│       │   │       └── Review × N
│       │   └── SectionAuthorMaybe
│       │       └── UserCard
│       └── FooterContainer
│           └── Footer (Links, Copyright)
```

---

## Redux Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                           │
│              (Click button, submit form, etc.)                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    ACTION DISPATCH                            │
│           dispatch(fetchListing(listingId))                   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                       THUNK                                   │
│  (Async function with access to dispatch, getState, sdk)     │
│                                                               │
│  1. Dispatch FETCH_LISTING_REQUEST                           │
│     → Reducer updates: { fetchInProgress: true }             │
│     → UI shows loading spinner                               │
│                                                               │
│  2. Call SDK: sdk.listings.show({ id })                      │
│     → HTTP request to Sharetribe API                         │
│                                                               │
│  3a. Success:                                                │
│      Dispatch FETCH_LISTING_SUCCESS with data                │
│      → Reducer updates: {                                    │
│           listing: data,                                     │
│           fetchInProgress: false                             │
│         }                                                    │
│      → UI renders listing                                    │
│                                                               │
│  3b. Error:                                                  │
│      Dispatch FETCH_LISTING_ERROR with error                 │
│      → Reducer updates: {                                    │
│           fetchError: error,                                 │
│           fetchInProgress: false                             │
│         }                                                    │
│      → UI shows error message                                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                       REDUCER                                 │
│  Pure function: (state, action) => newState                  │
│                                                               │
│  switch (action.type) {                                      │
│    case FETCH_LISTING_REQUEST:                               │
│      return { ...state, fetchInProgress: true }              │
│    case FETCH_LISTING_SUCCESS:                               │
│      return { ...state, listing: action.payload, ... }       │
│    case FETCH_LISTING_ERROR:                                 │
│      return { ...state, fetchError: action.payload, ... }    │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                     REDUX STORE                               │
│              (Single source of truth)                         │
│                                                               │
│  {                                                            │
│    user: { currentUser: {...} },                             │
│    ListingPage: {                                            │
│      listing: { id, attributes: {...} },                     │
│      reviews: [...],                                         │
│      fetchInProgress: false,                                 │
│      fetchError: null                                        │
│    },                                                         │
│    SearchPage: { ... },                                      │
│    ...                                                        │
│  }                                                            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                  COMPONENT RE-RENDERS                         │
│                                                               │
│  const listing = useSelector(state =>                         │
│    state.ListingPage.listing                                 │
│  );                                                           │
│                                                               │
│  // Component automatically re-renders when                  │
│  // selected state changes                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## EditListingPage Wizard Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CREATE NEW LISTING                        │
│               (User clicks "List your item")                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  REDIRECT TO WIZARD                          │
│      /l/new → /l/draft/00000.../new/details                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: DETAILS TAB                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  EditListingDetailsPanel                              │  │
│  │    └─ EditListingDetailsForm                          │  │
│  │         ├─ Title (required)                            │  │
│  │         ├─ Description (required)                      │  │
│  │         ├─ Listing Type selector                       │  │
│  │         └─ Custom fields (from configListing.js)       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  User fills form → Submit → Calls onManageListingUpdates    │
│  → SDK creates/updates draft listing                        │
│  → Redirects to next tab                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 2: PRICING (or LOCATION)                     │
│  [Process-specific: booking has location, purchase skips]   │
│                                                              │
│  User sets price → Submit → Updates listing                 │
│  → Next tab                                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                STEP 3: DELIVERY / AVAILABILITY               │
│  [Process-specific tabs]                                    │
│                                                              │
│  - Purchase: Shipping/pickup options                        │
│  - Booking: Calendar availability                           │
│  - Inquiry: May be skipped                                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  STEP 4: PHOTOS                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Upload images → SDK image upload                     │  │
│  │  → Attach images to listing                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  All tabs complete? Show "Publish" button                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│             CHECK PAYOUT DETAILS                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  If listing type requires payout:                     │  │
│  │    - Check if Stripe account connected                │  │
│  │    - If not: Show "Set up payments" modal             │  │
│  │    - Redirect to Stripe onboarding                    │  │
│  │    - Return and enable publish                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   PUBLISH LISTING                            │
│  Draft → Published (listing.state = 'published')            │
│  → Redirect to ListingPage                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Transaction Process Flow (Booking Example)

```
┌──────────────────────────────────────────────────────────────┐
│                  CUSTOMER VIEWS LISTING                       │
│                  (ListingPage)                                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│            SELECTS DATES & CLICKS "BOOK"                     │
│  → Redirect to CheckoutPage                                  │
│  → URL: /l/:slug/:id/checkout?bookingStart=...&bookingEnd=...│
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    CHECKOUT PAGE                              │
│  1. Shows order summary (dates, price breakdown)             │
│  2. Customer enters payment details (Stripe)                 │
│  3. Clicks "Confirm & Pay"                                   │
│  4. Initiates transaction:                                   │
│     sdk.transactions.initiate({                              │
│       processAlias: 'default-booking/release-1',             │
│       transition: 'transition/request-payment',              │
│       params: { listingId, bookingStart, bookingEnd }        │
│     })                                                        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│            SHARETRIBE API PROCESSES                           │
│  1. Creates transaction entity                               │
│  2. Sets state: 'pending-payment'                            │
│  3. Charges card via Stripe (preauthorization)               │
│  4. Transitions to: 'preauthorized'                          │
│  5. Sends emails:                                            │
│     - Customer: "Booking request sent"                       │
│     - Provider: "New booking request"                        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│           PROVIDER REVIEWS & ACCEPTS                          │
│  (Via TransactionPage - /sale/:id)                           │
│                                                               │
│  Clicks "Accept booking" →                                   │
│  sdk.transactions.transition({                               │
│    id: transactionId,                                        │
│    transition: 'transition/accept'                           │
│  })                                                           │
│                                                               │
│  → State: 'accepted'                                         │
│  → Email sent to customer: "Booking confirmed"               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              BOOKING PERIOD STARTS                            │
│  (Automatic based on bookingStart date)                      │
│                                                               │
│  → No action needed                                          │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│               BOOKING PERIOD ENDS                             │
│  (Automatic transition after bookingEnd)                     │
│                                                               │
│  System automatically transitions:                           │
│  → State: 'delivered'                                        │
│  → Captures payment (funds move to provider)                 │
│  → Emails: "Leave a review"                                  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│             REVIEW PERIOD (Optional)                          │
│  - Customer can leave review for provider                    │
│  - Provider can leave review for customer                    │
│  - 7-day window (configurable)                               │
│                                                               │
│  After review or timeout:                                    │
│  → State: 'completed'                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Configuration Inheritance & Override

```
┌─────────────────────────────────────────────────────────────┐
│             CONFIGURATION PRIORITY ORDER                     │
│                (Higher = Takes Precedence)                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌───────────────────────────────────────────────┐
    │  3. HOSTED ASSETS (Highest Priority)          │
    │     Via Sharetribe Console                    │
    │     /content/translations.json                │
    │     /design/branding.json                     │
    │     /design/layout.json                       │
    │     /listings/listing-types.json              │
    │     /listings/listing-fields.json             │
    │     etc.                                      │
    │                                               │
    │     ✓ Can be updated without code deploy     │
    │     ✓ Managed by non-developers              │
    └───────────────────────────────────────────────┘
                          │
                          ▼
    ┌───────────────────────────────────────────────┐
    │  2. ENVIRONMENT VARIABLES                     │
    │     .env file (local) or hosting provider     │
    │     REACT_APP_MARKETPLACE_NAME                │
    │     REACT_APP_SHARETRIBE_SDK_CLIENT_ID        │
    │     REACT_APP_STRIPE_PUBLISHABLE_KEY          │
    │     etc.                                      │
    │                                               │
    │     ✓ Secure for API keys                    │
    │     ✓ Different per environment              │
    └───────────────────────────────────────────────┘
                          │
                          ▼
    ┌───────────────────────────────────────────────┐
    │  1. BUILT-IN CONFIG (Lowest Priority)         │
    │     src/config/*.js files                     │
    │     configDefault.js                          │
    │     configListing.js                          │
    │     configBranding.js                         │
    │     etc.                                      │
    │                                               │
    │     ✓ Code-level defaults                    │
    │     ✓ Requires deployment to change          │
    └───────────────────────────────────────────────┘
```

### Merge Process

```javascript
// In src/util/configHelpers.js

const mergeConfig = (hostedConfig, defaultConfig) => {
  // 1. Start with built-in config
  const baseConfig = defaultConfig;
  
  // 2. Override with hosted config
  const mergedConfig = {
    ...baseConfig,
    branding: merge(baseConfig.branding, hostedConfig.branding),
    layout: merge(baseConfig.layout, hostedConfig.layout),
    listing: {
      listingFields: hostedConfig.listingFields || baseConfig.listing.listingFields,
      listingTypes: hostedConfig.listingTypes || baseConfig.listing.listingTypes
    }
  };
  
  // 3. Final configuration used by app
  return mergedConfig;
};
```

---

## SearchPage Filter Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SEARCH PAGE                               │
└──────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Topbar     │  │  Main Panel  │  │  SearchMap   │
│   Search     │  │   Filters    │  │  (optional)  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  QUERY PARAMS BUILD   │
              │  /s?pub_category=...  │
              │  &pub_bikeType=...    │
              │  &price=10-100        │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   SDK LISTINGS QUERY  │
              │                       │
              │  sdk.listings.query({ │
              │    pub_category: [...],│
              │    price: [10, 100],  │
              │    bounds: {...}      │
              │  })                   │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  SEARCH RESULTS       │
              │  (Listing entities)   │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  RENDER LISTING CARDS │
              └───────────────────────┘
```

### Filter Types

```
┌────────────────────────────────────────────────────────────┐
│                   FILTER COMPONENTS                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SelectSingleFilter                                     │
│     - Radio buttons or dropdown                            │
│     - One option at a time                                 │
│     - For: enum fields                                     │
│     - Example: "Condition: New / Used"                     │
│                                                             │
│  2. SelectMultipleFilter                                   │
│     - Checkboxes                                           │
│     - Multiple options                                     │
│     - For: enum or multi-enum fields                       │
│     - Example: "Amenities: WiFi, Pool, Parking"           │
│                                                             │
│  3. PriceFilter                                            │
│     - Min/max price range                                  │
│     - Built-in, always available                           │
│     - Example: "$10 - $100"                                │
│                                                             │
│  4. KeywordFilter                                          │
│     - Text search                                          │
│     - Searches title & description                         │
│     - Example: "mountain bike"                             │
│                                                             │
│  5. BookingDateRangeFilter                                 │
│     - Calendar date picker                                 │
│     - For: booking processes                               │
│     - Example: "Jun 1 - Jun 5"                             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## File Naming Conventions

```
src/
├── containers/           # Pages (PascalCase)
│   └── ListingPage/
│       ├── ListingPage.js           # Main component
│       ├── ListingPage.module.css   # Scoped styles
│       ├── ListingPage.duck.js      # Redux logic
│       ├── ListingPage.test.js      # Tests
│       ├── SectionHero.js           # Sub-component (PascalCase)
│       └── README.md                # Documentation
│
├── components/          # Reusable UI (PascalCase)
│   └── Button/
│       ├── Button.js
│       ├── Button.module.css
│       └── Button.test.js
│
├── util/               # Utilities (camelCase)
│   ├── dates.js
│   ├── validators.js
│   └── api.js
│
├── config/            # Config (camelCase with prefix)
│   ├── configDefault.js
│   ├── configListing.js
│   └── settings.js
│
└── translations/      # i18n (kebab-case)
    ├── en.json
    └── fr.json
```

---

## Data Entities Structure

### Listing Entity
```javascript
{
  id: UUID,
  type: 'listing',
  attributes: {
    title: 'Mountain Bike',
    description: 'Great for trails...',
    price: { amount: 5000, currency: 'USD' },
    state: 'published',  // draft, pendingApproval, published, closed
    publicData: {
      listingType: 'daily-booking',
      transactionProcessAlias: 'default-booking/release-1',
      unitType: 'day',
      categoryLevel1: 'bikes',
      categoryLevel2: 'mountain',
      // Your custom fields
      bikeType: 'mountain',
      gears: 21,
      accessories: ['helmet', 'lock']
    },
    privateData: {
      // Only visible to listing owner
      notes: 'Needs maintenance soon'
    },
    geolocation: { lat: 40.7128, lng: -74.0060 },
    availabilityPlan: { ... }
  },
  relationships: {
    author: { data: { id: UUID, type: 'user' } },
    images: { data: [ { id: UUID, type: 'image' }, ... ] },
    currentStock: { data: { id: UUID, type: 'stock' } }
  }
}
```

### Transaction Entity
```javascript
{
  id: UUID,
  type: 'transaction',
  attributes: {
    processName: 'default-booking',
    processVersion: 1,
    lastTransition: 'transition/accept',
    lastTransitionedAt: '2024-01-15T10:30:00.000Z',
    createdAt: '2024-01-15T09:00:00.000Z',
    
    // Transaction-specific data
    payinTotal: { amount: 15000, currency: 'USD' },
    payoutTotal: { amount: 13500, currency: 'USD' },
    
    lineItems: [
      {
        code: 'line-item/booking',
        quantity: { amount: 3 },
        unitPrice: { amount: 5000, currency: 'USD' }
      },
      {
        code: 'line-item/provider-commission',
        percentage: -10.0
      }
    ],
    
    protectedData: {
      // Visible to both parties
      bookingStart: '2024-02-01',
      bookingEnd: '2024-02-04'
    }
  },
  relationships: {
    customer: { data: { id: UUID, type: 'user' } },
    provider: { data: { id: UUID, type: 'user' } },
    listing: { data: { id: UUID, type: 'listing' } }
  }
}
```

### User Entity
```javascript
{
  id: UUID,
  type: 'user',
  attributes: {
    email: 'user@example.com',
    emailVerified: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John D.',
      abbreviatedName: 'JD',
      bio: 'Bike enthusiast...',
      publicData: {
        // Custom user fields
        phoneNumber: '+1234567890'
      }
    }
  },
  relationships: {
    profileImage: { data: { id: UUID, type: 'image' } }
  }
}
```

---

## Component Props Pattern

```javascript
// Common prop types across components

// Page Components
<ListingPage
  params={{ id, slug }}           // from React Router
  location={{ search, pathname }} // from React Router
  history={{}}                    // from React Router
/>

// Presentational Components
<ListingCard
  listing={listingEntity}         // Full listing entity
  renderSizes="(max-width: 767px) 100vw, 360px"
  onClick={(listing) => {}}       // Event handlers
/>

<Button
  type="button"                   // button, submit, reset
  onClick={(e) => {}}
  disabled={false}
  inProgress={false}              // Show spinner
  className={css.myButton}
  children="Click Me"             // Or: <Button>Click Me</Button>
/>

<Modal
  id="MyModal"
  isOpen={isModalOpen}
  onClose={() => {}}
  onManageDisableScrolling={(isOpen) => {}}
  containerClassName={css.modalContainer}
>
  <ModalContent />
</Modal>

// Form Components
<FieldTextInput
  id="title"
  name="title"
  type="text"                     // text, email, password, tel
  label="Title"
  placeholder="Enter title..."
  validate={validators}           // Validation function(s)
  className={css.field}
/>
```

---

This visual guide complements the comprehensive developer guide. Use it as a quick reference for understanding the architecture, data flow, and component relationships in the Sharetribe marketplace template.

**For detailed explanations**: See `COMPREHENSIVE_DEVELOPER_GUIDE.md`  
**For quick code snippets**: See `QUICK_REFERENCE_CHEATSHEET.md`
