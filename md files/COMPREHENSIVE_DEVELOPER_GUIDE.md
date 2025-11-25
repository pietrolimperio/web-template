# Sharetribe Marketplace Template - Comprehensive Developer Guide

## Table of Contents
1. [Introduction & Architecture Overview](#1-introduction--architecture-overview)
2. [Project Structure](#2-project-structure)
3. [React Fundamentals in This Template](#3-react-fundamentals-in-this-template)
4. [Configuration System](#4-configuration-system)
5. [Routing & Pages](#5-routing--pages)
6. [Key Pages & Customization Points](#6-key-pages--customization-points)
7. [Transaction Processes](#7-transaction-processes)
8. [Data Flow & State Management](#8-data-flow--state-management)
9. [Styling & Theming](#9-styling--theming)
10. [Common Customization Scenarios](#10-common-customization-scenarios)
11. [Development Workflow](#11-development-workflow)

---

## 1. Introduction & Architecture Overview

### What is This Template?
This is a **full-stack React marketplace application** built by Sharetribe. It's a ready-to-use template for creating online marketplaces where users can:
- List items or services
- Search and browse listings
- Make bookings, purchases, or inquiries
- Manage transactions
- Handle payments through Stripe

### Technology Stack
- **Frontend**: React 18.3.1 (with Hooks)
- **State Management**: Redux + Redux Thunk
- **Routing**: React Router v5
- **Forms**: React Final Form
- **Styling**: CSS Modules (component-scoped CSS)
- **Server**: Node.js with Express
- **API**: Sharetribe Flex SDK
- **Build Tool**: Sharetribe Scripts (based on Create React App)
- **Code Splitting**: Loadable Components

### Architecture Pattern
```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React Components (Views)                         │  │
│  │  └─> Containers (Connected to Redux)              │  │
│  │      └─> Components (Presentational)              │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↕                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Redux Store (State Management)                   │  │
│  │  └─> Ducks Pattern (Actions + Reducers)           │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↕                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Sharetribe Flex SDK (API Client)                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Express Server (SSR + API)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Server-Side Rendering                            │  │
│  │  API Endpoints (Authentication, Webhooks)         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
        Sharetribe Marketplace API (Backend)
```

---

## 2. Project Structure

### Root Directory Structure
```
web-template-main/
├── public/              # Static files (index.html, robots.txt, icons)
├── server/              # Server-side code (SSR, API endpoints)
├── src/                 # Client-side React application
├── ext/                 # Transaction process definitions
├── scripts/             # Build and configuration scripts
├── package.json         # Dependencies and npm scripts
└── .env                 # Environment variables (created by yarn run config)
```

### `/src` Directory - The Heart of Your App
```
src/
├── app.js                    # Main app wrapper (ClientApp/ServerApp)
├── index.js                  # Entry point (client-side)
├── store.js                  # Redux store configuration
├── reducers.js              # Root reducer
│
├── components/              # Reusable UI components (presentational)
│   ├── Button/
│   ├── Modal/
│   ├── Logo/
│   └── [60+ components]
│
├── containers/              # Page-level components (connected to Redux)
│   ├── LandingPage/
│   ├── ListingPage/         # Product Detail Page (PDP)
│   ├── EditListingPage/     # Listing creation/editing
│   ├── SearchPage/
│   ├── CheckoutPage/
│   ├── TransactionPage/
│   └── [20+ page containers]
│
├── config/                  # Configuration files
│   ├── configDefault.js     # Main config
│   ├── configListing.js     # Listing types & fields
│   ├── configLayout.js      # Layout variants
│   ├── configBranding.js    # Colors, logos
│   └── [other configs]
│
├── routing/                 # Route definitions
│   ├── routeConfiguration.js  # All app routes
│   └── Routes.js            # Route rendering logic
│
├── transactions/            # Transaction process logic
│   ├── transaction.js       # Process management
│   ├── transactionProcessBooking.js
│   ├── transactionProcessPurchase.js
│   ├── transactionProcessInquiry.js
│   └── transactionProcessNegotiation.js
│
├── ducks/                   # Redux modules (actions + reducers)
│   ├── auth.duck.js
│   ├── user.duck.js
│   └── [other ducks]
│
├── util/                    # Helper functions
├── translations/            # i18n JSON files
└── styles/                  # Global styles
```

### Key Directories Explained

#### **`/src/containers/`** - Where Pages Live
- Each subdirectory is a **page** in your app
- Contains the main component, Redux logic (`.duck.js`), styles (`.module.css`), and tests
- **This is where you'll spend most of your customization time**

#### **`/src/components/`** - Reusable UI Building Blocks
- Generic components used across multiple pages
- Not connected to Redux directly
- Examples: buttons, forms, modals, icons

#### **`/src/config/`** - Application Settings
- Control marketplace behavior without code changes
- Define listing types, fields, layouts, branding
- **Start here for most customizations**

#### **`/ext/transaction-processes/`** - Business Logic
- Define the flow of transactions (booking, purchase, etc.)
- Templates for email notifications
- Written in EDN format (Clojure-like)

---

## 3. React Fundamentals in This Template

### React Components Basics
React components are JavaScript functions that return UI elements. This template uses modern React with **Hooks**.

#### Example: Simple Component
```javascript
// Presentational Component (in /src/components/)
import React from 'react';
import css from './MyComponent.module.css';

const MyComponent = ({ title, onClick }) => {
  return (
    <div className={css.root}>
      <h2>{title}</h2>
      <button onClick={onClick}>Click Me</button>
    </div>
  );
};

export default MyComponent;
```

#### Example: Container Component (Page)
```javascript
// Container Component (in /src/containers/)
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadData } from './MyPage.duck.js';

const MyPage = () => {
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const data = useSelector(state => state.myPage.data);
  
  // Load data when component mounts
  useEffect(() => {
    dispatch(loadData());
  }, [dispatch]);
  
  return (
    <div>
      <h1>My Page</h1>
      {data && <p>{data}</p>}
    </div>
  );
};

export default MyPage;
```

### Common React Patterns in This Template

#### 1. **Functional Components** (Not Class Components)
All components use functions, not classes:
```javascript
// ✅ Used in this template
const MyComponent = (props) => { ... }

// ❌ NOT used (old React style)
class MyComponent extends React.Component { ... }
```

#### 2. **Hooks for State & Effects**
```javascript
import { useState, useEffect } from 'react';

const MyComponent = () => {
  // State hook
  const [count, setCount] = useState(0);
  
  // Effect hook (runs after render)
  useEffect(() => {
    console.log('Component mounted or updated');
  }, [count]); // Runs when 'count' changes
  
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
};
```

#### 3. **Props** - Passing Data Between Components
```javascript
// Parent passes data to child
<ListingCard 
  title="Mountain Bike"
  price={50}
  onSelect={(id) => console.log(id)}
/>

// Child receives props
const ListingCard = ({ title, price, onSelect }) => {
  return (
    <div onClick={() => onSelect(123)}>
      <h3>{title}</h3>
      <p>${price}</p>
    </div>
  );
};
```

#### 4. **Redux Connection** - Using `useSelector` and `useDispatch`
```javascript
import { useSelector, useDispatch } from 'react-redux';

const MyPage = () => {
  // Read from Redux store
  const currentUser = useSelector(state => state.user.currentUser);
  
  // Dispatch actions to Redux
  const dispatch = useDispatch();
  
  const handleClick = () => {
    dispatch({ type: 'MY_ACTION', payload: data });
  };
  
  return <div>Hello {currentUser?.attributes?.profile?.firstName}</div>;
};
```

### CSS Modules
Each component has scoped CSS:
```css
/* MyComponent.module.css */
.root {
  padding: 20px;
}

.title {
  color: blue;
}
```

```javascript
// MyComponent.js
import css from './MyComponent.module.css';

const MyComponent = () => (
  <div className={css.root}>
    <h1 className={css.title}>Title</h1>
  </div>
);
```

---

## 4. Configuration System

### Two-Tier Configuration
1. **Built-in configs** (`/src/config/*.js`) - Local defaults
2. **Hosted assets** (managed via Sharetribe Console) - Override built-in configs

### Key Configuration Files

#### `configDefault.js` - Main Configuration
```javascript
{
  marketplaceName: 'My Marketplace',
  currency: 'USD',
  listingMinimumPriceSubUnits: 500,  // $5.00 minimum
  localization: { locale: 'en-US' },
  // References to other configs
  stripe: { ... },
  listing: { ... },
  branding: { ... },
  layout: { ... }
}
```

#### `configListing.js` - Define Your Marketplace Type
**Two main arrays:**

1. **`listingFields`** - Custom fields for listings
```javascript
{
  key: 'bikeType',                    // Unique identifier
  scope: 'public',                    // 'public' or 'private'
  schemaType: 'enum',                 // enum, multi-enum, text, long, boolean
  enumOptions: [
    { option: 'mountain', label: 'Mountain Bike' },
    { option: 'road', label: 'Road Bike' }
  ],
  filterConfig: {
    indexForSearch: true,              // Enable search filtering
    filterType: 'SelectMultipleFilter',
    label: 'Bike Type',
    group: 'primary'                   // primary or secondary
  },
  showConfig: {
    label: 'Bike Type',
    isDetail: true                     // Show on listing page
  },
  saveConfig: {
    label: 'Bike Type',
    placeholderMessage: 'Select bike type...',
    isRequired: true,
    requiredMessage: 'Please select a bike type'
  }
}
```

2. **`listingTypes`** - Transaction processes
```javascript
{
  listingType: 'daily-booking',
  label: 'Daily Booking',
  transactionType: {
    process: 'default-booking',
    alias: 'default-booking/release-1',
    unitType: 'day'                   // day, night, hour, item, inquiry
  },
  defaultListingFields: {
    location: true,
    payoutDetails: true
  }
}
```

#### `configLayout.js` - Choose UI Variants
```javascript
{
  // SearchPage: 'map' or 'grid'
  searchPage: { variantType: 'map' },
  
  // ListingPage: 'coverPhoto' or 'carousel'
  listingPage: { variantType: 'carousel' },
  
  // Image aspect ratio
  listingImage: { aspectRatio: '4/3' }
}
```

#### `configBranding.js` - Visual Identity
```javascript
{
  marketplaceColor: '#7c3aed',        // Primary color
  logoImageDesktopURL: './logo.png',
  logoImageMobileURL: './logo-mobile.png',
  brandImageURL: './hero-bg.jpg',     // Background images
  facebookImageURL: './fb-share.jpg', // Social sharing
  twitterImageURL: './twitter-share.jpg'
}
```

### Hosted Assets (Advanced)
These JSON files are hosted by Sharetribe and override built-in configs:
- `/content/translations.json` - Custom translations
- `/design/branding.json` - Branding overrides
- `/design/layout.json` - Layout overrides
- `/listings/listing-types.json` - Listing types
- `/listings/listing-fields.json` - Custom fields
- `/listings/listing-search.json` - Search configuration

**Access them via Console** → Content & Design

---

## 5. Routing & Pages

### Route Configuration
All routes are defined in `/src/routing/routeConfiguration.js`:

```javascript
{
  path: '/l/:slug/:id',          // URL pattern
  name: 'ListingPage',           // Unique route name
  component: ListingPage,        // Component to render
  auth: false,                   // Requires authentication?
  loadData: pageDataLoadingAPI.ListingPage.loadData  // Server-side data loading
}
```

### Main Routes in the Template

| Route | Name | Component | Purpose |
|-------|------|-----------|---------|
| `/` | LandingPage | LandingPage | Homepage |
| `/s` | SearchPage | SearchPageWithMap/Grid | Search results |
| `/l/:slug/:id` | ListingPage | ListingPageCoverPhoto/Carousel | **Product Detail Page (PDP)** |
| `/l/new` | NewListingPage | Redirect to EditListingPage | **Create new listing** |
| `/l/:slug/:id/:type/:tab` | EditListingPage | EditListingPage | **Edit listing** |
| `/l/:slug/:id/checkout` | CheckoutPage | CheckoutPage | Purchase flow |
| `/order/:id` | OrderDetailsPage | TransactionPage | Customer's order view |
| `/sale/:id` | SaleDetailsPage | TransactionPage | Provider's sale view |
| `/inbox` | InboxPage | InboxPage | Messages |
| `/u/:id` | ProfilePage | ProfilePage | User profile |
| `/listings` | ManageListingsPage | ManageListingsPage | Manage your listings |

### Navigation Between Pages
Use the `NamedLink` component:

```javascript
import { NamedLink } from '../../components';

// Navigate to a listing
<NamedLink name="ListingPage" params={{ id: listing.id.uuid, slug: 'bike-rental' }}>
  View Listing
</NamedLink>

// Navigate to search
<NamedLink name="SearchPage" to={{ search: '?address=New%20York' }}>
  Search in New York
</NamedLink>
```

Programmatic navigation:
```javascript
import { useHistory } from 'react-router-dom';

const MyComponent = () => {
  const history = useHistory();
  
  const goToSearch = () => {
    history.push('/s?address=Berlin');
  };
  
  return <button onClick={goToSearch}>Search</button>;
};
```

---

## 6. Key Pages & Customization Points

### 6.1 ListingPage (Product Detail Page - PDP)

**Location**: `/src/containers/ListingPage/`

**Two Variants**:
1. **ListingPageCoverPhoto** - Hero image at top (cropped)
2. **ListingPageCarousel** - Image carousel with full aspect ratio

**Configure in**: `configLayout.js` → `listingPage.variantType`

#### Structure of ListingPage
```
ListingPage (Main Container)
├── ActionBarMaybe (Buy/Book buttons)
├── SectionGallery (Carousel variant only)
├── SectionHero (Cover photo + title)
├── SectionDetailsMaybe (Enum fields: size, color, etc.)
├── SectionMultiEnumMaybe (Multi-select fields: amenities)
├── SectionTextMaybe (Description, custom text fields)
├── SectionMapMaybe (Location map)
├── SectionReviews (User reviews)
└── SectionAuthorMaybe (Provider info)
```

#### Key Files
- `ListingPageCarousel.js` or `ListingPageCoverPhoto.js` - Main page logic
- `ListingPage.duck.js` - Redux actions (fetch listing, send inquiry)
- `ListingPage.module.css` - Page styles
- `Section*.js` - Individual sections

#### Common Customizations

**1. Add a new section**
```javascript
// In ListingPageCarousel.js or ListingPageCoverPhoto.js

import SectionCustomInfo from './SectionCustomInfo';

// Add in the return statement
<div className={css.contentContainer}>
  <SectionHero ... />
  <SectionDetailsMaybe ... />
  
  {/* Your new section */}
  <SectionCustomInfo listing={currentListing} />
  
  <SectionTextMaybe ... />
</div>
```

**2. Customize what fields are displayed**
Edit `SectionDetailsMaybe.js`:
```javascript
// Filter which fields to show
const filteredFields = publicData.filter(field => 
  field.key !== 'hiddenField'  // Exclude certain fields
);
```

**3. Change the layout**
Modify CSS in `ListingPage.module.css`:
```css
.contentContainer {
  max-width: 1200px;  /* Change max width */
  padding: 0 24px;
}
```

**4. Add custom data display**
```javascript
// In ListingPageCarousel.js
const customField = currentListing?.attributes?.publicData?.yourCustomField;

<div className={css.customSection}>
  <h3>Special Feature</h3>
  <p>{customField}</p>
</div>
```

---

### 6.2 EditListingPage (Listing Creation)

**Location**: `/src/containers/EditListingPage/`

**Purpose**: Create new listings or edit existing ones

#### Wizard Structure
Listing creation is organized in **tabs/panels** via the `EditListingWizard`:

```
EditListingPage
└── EditListingWizard
    ├── EditListingWizardTab (handles routing)
    └── Panels (one per tab)
        ├── EditListingDetailsPanel
        ├── EditListingPricingPanel
        ├── EditListingLocationPanel
        ├── EditListingAvailabilityPanel
        ├── EditListingPhotosPanel
        └── ...
```

#### Tab Configurations by Process

**Purchase Process** (selling products):
```
DETAILS → PRICING_AND_STOCK → DELIVERY → PHOTOS/STYLE
```

**Booking Process** (rentals):
```
DETAILS → LOCATION → PRICING → AVAILABILITY → PHOTOS/STYLE
```

**Inquiry Process** (no payment):
```
DETAILS → LOCATION → PRICING → PHOTOS/STYLE
```

#### Key Files
- `EditListingWizard/EditListingWizard.js` - Wizard logic, tab management
- `EditListingWizard/EditListingWizardTab.js` - Tab routing
- `EditListingWizard/EditListingDetails/` - Details panel & form
- `EditListingWizard/EditListingPricing/` - Pricing panel & form
- (similar structure for other panels)

#### Panel → Form → Data Flow
```
Panel Component
├── Handles data transformation
├── Manages form submission
└── Contains:
    └── Form Component
        ├── Collects user input
        ├── Validates data
        └── Calls panel's onSubmit
```

#### Common Customizations

**1. Add a new field to existing panel**

Edit the form (e.g., `EditListingDetailsForm.js`):
```javascript
import { FieldTextInput } from '../../../../components';

// Add field to form
<FieldTextInput
  id="customField"
  name="customField"
  type="text"
  label="My Custom Field"
  placeholder="Enter value..."
  validate={required('This field is required')}
/>
```

Edit the panel (e.g., `EditListingDetailsPanel.js`):
```javascript
// Update initialValues
const initialValues = {
  title: currentListing?.attributes?.title,
  // Add your field
  customField: currentListing?.attributes?.publicData?.customField || ''
};

// Update onSubmit
const onSubmit = values => {
  const updateValues = {
    title: values.title,
    publicData: {
      customField: values.customField  // Save to listing
    }
  };
  
  onManageListingUpdates(updateValues);
};
```

**2. Add a new tab/panel**

Step 1: Create panel and form files:
```
EditListingWizard/
└── EditListingMyNewPanel/
    ├── EditListingMyNewPanel.js
    ├── EditListingMyNewPanel.module.css
    ├── EditListingMyNewForm.js
    └── EditListingMyNewForm.module.css
```

Step 2: Register in `EditListingWizardTab.js`:
```javascript
import EditListingMyNewPanel from './EditListingMyNewPanel/EditListingMyNewPanel';

// Add to switch statement
case 'my-new-tab':
  return <EditListingMyNewPanel ... />;
```

Step 3: Add to wizard (`EditListingWizard.js`):
```javascript
const TABS_PURCHASE = [
  'details',
  'pricing-and-stock',
  'my-new-tab',  // Your new tab
  'delivery',
  'photos'
];
```

Step 4: Update `tabCompleted` function:
```javascript
case 'my-new-tab':
  return !!publicData?.myRequiredField;
```

**3. Remove a panel**
In `EditListingWizard.js`, remove from the TABS array:
```javascript
const TABS_PURCHASE = [
  'details',
  'pricing-and-stock',
  // 'delivery',  ← Comment out or remove
  'photos'
];
```

**4. Reorder panels**
Just rearrange the order in the TABS array:
```javascript
const TABS_BOOKING = [
  'details',
  'pricing',      // Swapped
  'location',     // Swapped
  'availability',
  'photos'
];
```

---

### 6.3 SearchPage

**Location**: `/src/containers/SearchPage/`

**Two Variants**:
1. **SearchPageWithMap** - Map view with filters
2. **SearchPageWithGrid** - Grid view with sidebar filters

**Configure in**: `configLayout.js` → `searchPage.variantType`

#### Structure
```
SearchPage
├── Topbar (with LocationAutocompleteInput or Keywords)
├── MainPanel
│   ├── SearchFilters (primary & secondary)
│   └── SearchResults (ListingCards)
└── SearchMap (map variant only)
```

#### Filters Configuration
Filters are configured via:
1. **Hosted asset**: `listing-search.json`
2. **Built-in config**: `configSearch.js`
3. **Listing fields**: `configListing.js` → `filterConfig`

#### Common Customizations

**1. Change main search type**
In `configSearch.js`:
```javascript
export const mainSearch = {
  searchType: 'location',  // 'location' or 'keywords'
};
```

**2. Add a new filter**
Define in `configListing.js`:
```javascript
{
  key: 'petFriendly',
  schemaType: 'boolean',
  filterConfig: {
    indexForSearch: true,
    label: 'Pet Friendly',
    group: 'secondary'
  }
}
```

**3. Customize search results display**
Edit `SearchPage/MainPanel.js` and `SearchPage/ListingCard.js`

**4. Change map behavior**
Edit `SearchPage/SearchMap/SearchMap.js`

---

### 6.4 CheckoutPage

**Location**: `/src/containers/CheckoutPage/`

**Purpose**: Complete a transaction (booking/purchase)

#### Two Variants
1. **CheckoutPageWithPayment** - For processes with Stripe payments
2. **CheckoutPageWithInquiryProcess** - For inquiry-only processes

#### Flow
```
1. Customer selects dates/quantity → 
2. Fills shipping/pickup info → 
3. Reviews order breakdown → 
4. Enters payment details → 
5. Confirms and initiates transaction
```

#### Key Components
- `StripePaymentForm/` - Credit card input
- `ShippingDetails/` - Delivery address
- `OrderBreakdown/` - Price calculation
- `DetailsSideCard.js` - Listing summary

---

### 6.5 TransactionPage (Order/Sale Details)

**Location**: `/src/containers/TransactionPage/`

**Purpose**: View transaction details, leave reviews, dispute

**Two Roles**:
- Customer view: `/order/:id` (OrderDetailsPage)
- Provider view: `/sale/:id` (SaleDetailsPage)

#### Structure
```
TransactionPage
├── TransactionPanel (main timeline & actions)
├── DetailCard (listing summary)
├── FeedSection (messages)
├── ActivityFeed (transaction history)
└── ReviewModal (leave review)
```

#### State-Based Rendering
The page changes based on transaction state:
- `inquiry` → Show inquiry form
- `pending-payment` → Show payment prompt
- `accepted` → Show accepted message
- `delivered` → Show review option

---

### 6.6 LandingPage

**Location**: `/src/containers/LandingPage/`

**Purpose**: Homepage with customizable sections

Uses **PageBuilder** for flexible content creation. Sections include:
- Hero
- Search form
- Categories
- Featured listings
- How it works
- Testimonials

Edit in **Sharetribe Console** → Design & Content → Pages → Landing Page

---

## 7. Transaction Processes

### What Are Transaction Processes?
A **transaction process** defines the business logic of how a transaction flows from start to finish.

### Four Built-In Processes

#### 1. **default-booking** (Rentals)
- **Use case**: Rent bikes, book accommodations, reserve services
- **Unit types**: `day`, `night`, `hour`, `fixed`
- **Key features**: Calendar availability, automatic payouts
- **States**: `inquiry` → `pending-payment` → `preauthorized` → `accepted` → `delivered` → `completed`

#### 2. **default-purchase** (Product Sales)
- **Use case**: Sell physical products
- **Unit types**: `item`
- **Key features**: Stock management, shipping/pickup
- **States**: `pending-payment` → `preauthorized` → `accepted` → `delivered` → `completed`

#### 3. **default-inquiry** (Inquiry Only)
- **Use case**: Request quotes, ask questions
- **Unit types**: `inquiry`
- **Key features**: No payment, no calendar
- **States**: `inquiry` → `accepted` or `declined`

#### 4. **default-negotiation** (Offers & Requests)
- **Use case**: Buyers and sellers negotiate price
- **Unit types**: `offer`, `request`
- **Key features**: Bidirectional listing creation
- **States**: `inquiry` → `offer-sent` → `offer-accepted` → `payment` → `completed`

### Process Files Location
`/ext/transaction-processes/{process-name}/`

### Choosing a Process
Set in `configListing.js` → `listingTypes` → `transactionType`:
```javascript
{
  listingType: 'daily-booking',
  transactionType: {
    process: 'default-booking',
    alias: 'default-booking/release-1',
    unitType: 'day'
  }
}
```

### Understanding Process States
Each process has **states** and **transitions**:

```javascript
// Example from transactionProcessBooking.js
export const states = {
  INQUIRY: 'inquiry',
  PENDING_PAYMENT: 'pending-payment',
  PREAUTHORIZED: 'preauthorized',
  ACCEPTED: 'accepted',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  DECLINED: 'declined',
  CANCELED: 'canceled'
};

export const transitions = {
  INQUIRE: 'transition/inquire',
  REQUEST_PAYMENT: 'transition/request-payment',
  CONFIRM_PAYMENT: 'transition/confirm-payment',
  ACCEPT: 'transition/accept',
  // ...
};
```

### How the UI Uses Process States
```javascript
import { getProcess } from '../../transactions/transaction';

const MyComponent = ({ transaction }) => {
  const processName = transaction.attributes.processName;
  const process = getProcess(processName);
  
  const currentState = process.getState(transaction);
  
  if (currentState === process.states.PENDING_PAYMENT) {
    return <PaymentButton />;
  } else if (currentState === process.states.ACCEPTED) {
    return <AcceptedMessage />;
  }
  // ...
};
```

---

## 8. Data Flow & State Management

### Redux Store Structure
```
state (Redux Store)
├── user
│   ├── currentUser
│   └── userShowError
├── auth
│   └── authInfoLoaded
├── ListingPage
│   ├── listing
│   ├── reviews
│   └── fetchListingError
├── SearchPage
│   ├── searchParams
│   ├── searchResults
│   └── pagination
└── [other pages]
```

### Ducks Pattern
Each page has a `.duck.js` file combining actions, reducers, and thunks:

```javascript
// ListingPage.duck.js

// Action types
const FETCH_LISTING_REQUEST = 'app/ListingPage/FETCH_LISTING_REQUEST';
const FETCH_LISTING_SUCCESS = 'app/ListingPage/FETCH_LISTING_SUCCESS';
const FETCH_LISTING_ERROR = 'app/ListingPage/FETCH_LISTING_ERROR';

// Action creators
const fetchListingRequest = () => ({ type: FETCH_LISTING_REQUEST });
const fetchListingSuccess = (listing) => ({ 
  type: FETCH_LISTING_SUCCESS, 
  payload: listing 
});

// Thunk (async action)
export const fetchListing = (listingId) => (dispatch, getState, sdk) => {
  dispatch(fetchListingRequest());
  
  return sdk.listings.show({ id: listingId })
    .then(response => {
      dispatch(fetchListingSuccess(response.data.data));
      return response;
    })
    .catch(e => {
      dispatch(fetchListingError(e));
    });
};

// Reducer
const initialState = {
  listing: null,
  fetchListingInProgress: false,
  fetchListingError: null
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_LISTING_REQUEST:
      return { ...state, fetchListingInProgress: true };
    case FETCH_LISTING_SUCCESS:
      return { ...state, listing: action.payload, fetchListingInProgress: false };
    case FETCH_LISTING_ERROR:
      return { ...state, fetchListingError: action.payload, fetchListingInProgress: false };
    default:
      return state;
  }
}
```

### Using Redux in Components
```javascript
import { useSelector, useDispatch } from 'react-redux';
import { fetchListing } from './ListingPage.duck';

const ListingPage = ({ params }) => {
  const dispatch = useDispatch();
  
  // Read from store
  const listing = useSelector(state => state.ListingPage.listing);
  const isLoading = useSelector(state => state.ListingPage.fetchListingInProgress);
  
  // Load data on mount
  useEffect(() => {
    dispatch(fetchListing(params.id));
  }, [dispatch, params.id]);
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>{listing.attributes.title}</div>;
};
```

### Sharetribe Flex SDK
The SDK is used to make API calls:

```javascript
import { createInstance } from './util/sdkLoader';

const sdk = createInstance({
  clientId: 'your-client-id'
});

// Fetch listings
sdk.listings.query({ per_page: 10 })
  .then(response => {
    console.log(response.data.data); // Array of listings
  });

// Create transaction
sdk.transactions.initiate({
  processAlias: 'default-booking/release-1',
  transition: 'transition/request-payment',
  params: {
    listingId: listing.id,
    bookingDates: { start, end }
  }
});
```

Common SDK methods:
- `sdk.listings.query()` - Search listings
- `sdk.listings.show()` - Get single listing
- `sdk.listings.create()` - Create listing
- `sdk.listings.update()` - Update listing
- `sdk.transactions.initiate()` - Start transaction
- `sdk.transactions.transition()` - Move transaction to next state
- `sdk.messages.send()` - Send message
- `sdk.reviews.create()` - Leave review

---

## 9. Styling & Theming

### CSS Architecture
- **CSS Modules**: Each component has scoped CSS
- **Global Styles**: `/src/styles/marketplaceDefaults.css`
- **CSS Custom Properties**: For theming

### Global Theme Configuration

**Primary Color**
In `configBranding.js`:
```javascript
export const marketplaceColor = '#7c3aed';  // Your brand color
```

This creates CSS variables:
```css
:root {
  --marketplaceColor: #7c3aed;
  --marketplaceColorDark: hsl(262, 83%, 48%);   /* 10% darker */
  --marketplaceColorLight: hsl(262, 83%, 68%);  /* 10% lighter */
}
```

### Customizing Styles

**1. Component-Level Styling**
```css
/* MyComponent.module.css */
.root {
  background-color: var(--matterColorLight);
  padding: 24px;
}

.title {
  color: var(--marketplaceColor);
  font-size: 24px;
}
```

**2. Global Style Variables**
Edit `/src/styles/marketplaceDefaults.css`:
```css
:root {
  /* Your custom variables */
  --customSpacing: 32px;
  --customFont: 'Roboto', sans-serif;
  
  /* Override existing variables */
  --matterColorLight: #f7f7f7;
  --successColor: #2ecc71;
}
```

**3. Common Style Variables**
- `--marketplaceColor` - Primary brand color
- `--matterColorLight` - Light gray backgrounds
- `--matterColor` - Main text color
- `--matterColorDark` - Dark text
- `--matterColorAnti` - White/light text on dark bg
- `--successColor` - Green success states
- `--failColor` - Red error states
- `--attentionColor` - Yellow/orange warnings

### Responsive Design
Use custom media queries from `customMediaQueries.css`:
```css
@import '../../styles/customMediaQueries.css';

.myElement {
  padding: 12px;
  
  @media (--viewportMedium) {
    padding: 24px;  /* Tablet and up */
  }
  
  @media (--viewportLarge) {
    padding: 36px;  /* Desktop */
  }
}
```

Available breakpoints:
- `--viewportSmall`: < 768px (mobile)
- `--viewportMedium`: 768px - 1024px (tablet)
- `--viewportLarge`: > 1024px (desktop)

---

## 10. Common Customization Scenarios

### Scenario 1: Add a "Condition" Field to Listings

**Step 1**: Define in `configListing.js`:
```javascript
export const listingFields = [
  {
    key: 'condition',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'new', label: 'New' },
      { option: 'like-new', label: 'Like New' },
      { option: 'good', label: 'Good' },
      { option: 'fair', label: 'Fair' }
    ],
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectMultipleFilter',
      label: 'Condition',
      group: 'secondary'
    },
    showConfig: {
      label: 'Condition',
      isDetail: true
    },
    saveConfig: {
      label: 'Item Condition',
      placeholderMessage: 'Select condition...',
      isRequired: true,
      requiredMessage: 'Please select the condition'
    }
  }
];
```

**Step 2**: Add to EditListingDetailsForm (already automatic if using `saveConfig`)

**Step 3**: Display on ListingPage (already automatic via `SectionDetailsMaybe`)

**Step 4**: Add search schema via Sharetribe CLI:
```bash
flex-cli search set --key condition --type enum --scope public
```

---

### Scenario 2: Change Homepage Hero Section

**Option A**: Edit via Console
1. Go to Console → Design & Content → Pages
2. Select Landing Page
3. Edit Hero section
4. Change title, description, background image, CTA button

**Option B**: Edit code
1. Open `/src/containers/LandingPage/LandingPage.js`
2. Or use PageBuilder sections in `/src/containers/PageBuilder/`

---

### Scenario 3: Add a "Featured Listings" Section

**Step 1**: Create component:
```javascript
// src/components/FeaturedListings/FeaturedListings.js
import React from 'react';
import { ListingCard } from '..';
import css from './FeaturedListings.module.css';

const FeaturedListings = ({ listings }) => {
  return (
    <div className={css.root}>
      <h2>Featured Listings</h2>
      <div className={css.grid}>
        {listings.map(listing => (
          <ListingCard key={listing.id.uuid} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedListings;
```

**Step 2**: Fetch data in LandingPage:
```javascript
// In LandingPage.duck.js
export const fetchFeaturedListings = () => (dispatch, getState, sdk) => {
  return sdk.listings.query({
    pub_featured: true,  // Custom field
    per_page: 6
  }).then(response => {
    dispatch(setFeaturedListings(response.data.data));
  });
};
```

**Step 3**: Add to LandingPage:
```javascript
import FeaturedListings from '../../components/FeaturedListings/FeaturedListings';

const LandingPage = () => {
  const featuredListings = useSelector(state => state.LandingPage.featuredListings);
  
  return (
    <Page>
      <SectionHero />
      <FeaturedListings listings={featuredListings} />
      <SectionHowItWorks />
    </Page>
  );
};
```

---

### Scenario 4: Add Minimum Order Quantity

**Step 1**: Add field to EditListingPricingAndStockForm:
```javascript
<FieldNumber
  id="minimumQuantity"
  name="minimumQuantity"
  label="Minimum Order Quantity"
  placeholder="1"
  validate={required('Required')}
/>
```

**Step 2**: Save to listing:
```javascript
// In EditListingPricingAndStockPanel
const onSubmit = values => {
  const updateValues = {
    price: values.price,
    publicData: {
      minimumQuantity: values.minimumQuantity
    }
  };
  onManageListingUpdates(updateValues);
};
```

**Step 3**: Validate in CheckoutPage:
```javascript
const minQty = listing.attributes.publicData.minimumQuantity || 1;

if (selectedQuantity < minQty) {
  return <ErrorMessage message={`Minimum order is ${minQty} items`} />;
}
```

---

### Scenario 5: Change Logo

**Step 1**: Add your logo files to `/src/assets/`:
```
/src/assets/
├── my-logo-desktop.png  (360px x 48px recommended)
└── my-logo-mobile.png   (140px x 48px recommended)
```

**Step 2**: Update `configBranding.js`:
```javascript
import logoDesktop from '../assets/my-logo-desktop.png';
import logoMobile from '../assets/my-logo-mobile.png';

export const logoImageDesktopURL = logoDesktop;
export const logoImageMobileURL = logoMobile;

export const logoSettings = {
  height: 36,  // Adjust height: 24, 36, or 48
  format: 'image'
};
```

---

### Scenario 6: Add Custom Footer Links

Edit `/src/containers/FooterContainer/FooterContainer.js`:

```javascript
import { ExternalLink, NamedLink } from '../../components';

const FooterContainer = () => {
  return (
    <footer>
      <div>
        <NamedLink name="AboutPage">About Us</NamedLink>
        <ExternalLink href="https://yourblog.com">Blog</ExternalLink>
        <NamedLink name="TermsOfServicePage">Terms</NamedLink>
        <NamedLink name="PrivacyPolicyPage">Privacy</NamedLink>
        
        {/* Add your links */}
        <ExternalLink href="https://support.yoursite.com">Support</ExternalLink>
        <NamedLink name="FAQPage">FAQ</NamedLink>
      </div>
    </footer>
  );
};
```

---

### Scenario 7: Customize Transaction Email Templates

**Location**: `/ext/transaction-processes/{process-name}/templates/`

Example: Edit booking confirmation email
1. Open `/ext/transaction-processes/default-booking/templates/booking-request-accepted-to-customer.html`
2. Modify HTML:
```html
<h1>Your booking is confirmed! 🎉</h1>
<p>Hi {{recipient.display-name}},</p>

<p>Great news! Your booking for <strong>{{listing.title}}</strong> has been confirmed.</p>

<!-- Add custom content -->
<p>Please remember to bring a valid ID and payment confirmation.</p>

<p>Booking details:</p>
<ul>
  <li>From: {{transaction.booking.displayStart}}</li>
  <li>To: {{transaction.booking.displayEnd}}</li>
  <li>Total: {{transaction.payin-total}}</li>
</ul>
```

3. Deploy via Sharetribe CLI:
```bash
flex-cli process push --process default-booking
```

---

## 11. Development Workflow

### Environment Setup

**1. Install dependencies**
```bash
yarn install
```

**2. Configure environment**
```bash
yarn run config
```
This prompts for:
- Marketplace ID
- Client ID
- Stripe Publishable Key
- Root URL

Creates `.env` file:
```
REACT_APP_SHARETRIBE_SDK_CLIENT_ID=your-client-id
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3000
REACT_APP_MARKETPLACE_NAME=My Marketplace
```

**3. Start development server**
```bash
yarn run dev
```

This runs two servers:
- Frontend: `localhost:3000` (React app)
- Backend: `localhost:3500` (API server)

### Development Commands

| Command | Purpose |
|---------|---------|
| `yarn run dev` | Start dev servers (frontend + backend) |
| `yarn run dev-frontend` | Start only frontend |
| `yarn run dev-backend` | Start only backend |
| `yarn run build` | Production build |
| `yarn run test` | Run tests |
| `yarn run format` | Format code with Prettier |
| `yarn run translate` | Manage translations |

### File Structure for a New Page

```
src/containers/MyNewPage/
├── MyNewPage.js                    # Main component
├── MyNewPage.module.css            # Styles
├── MyNewPage.duck.js               # Redux logic (actions, reducer)
├── MyNewPage.test.js               # Tests
├── MyNewForm/                      # Subcomponents
│   ├── MyNewForm.js
│   └── MyNewForm.module.css
└── README.md                       # Documentation
```

### Creating a New Page - Complete Example

**Step 1**: Create directory and files
```
src/containers/AboutPage/
├── AboutPage.js
├── AboutPage.module.css
└── AboutPage.duck.js
```

**Step 2**: Create component (`AboutPage.js`)
```javascript
import React from 'react';
import { Page } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import css from './AboutPage.module.css';

const AboutPage = () => {
  return (
    <Page title="About Us" scrollingDisabled={false}>
      <TopbarContainer />
      <div className={css.root}>
        <h1 className={css.title}>About Our Marketplace</h1>
        <p className={css.content}>
          We connect people who have bikes with those who need them.
        </p>
      </div>
      <FooterContainer />
    </Page>
  );
};

export default AboutPage;
```

**Step 3**: Create styles (`AboutPage.module.css`)
```css
.root {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px;
}

.title {
  font-size: 36px;
  color: var(--matterColorDark);
  margin-bottom: 24px;
}

.content {
  font-size: 18px;
  line-height: 1.6;
  color: var(--matterColor);
}
```

**Step 4**: Add route (`routeConfiguration.js`)
```javascript
import loadable from '@loadable/component';

const AboutPage = loadable(() => import('../containers/AboutPage/AboutPage'));

const routeConfiguration = () => {
  return [
    // ... existing routes
    {
      path: '/about',
      name: 'AboutPage',
      component: AboutPage
    }
  ];
};
```

**Step 5**: Add navigation link (in Topbar or Footer)
```javascript
<NamedLink name="AboutPage">About</NamedLink>
```

### Testing Your Changes

**Run tests**
```bash
yarn run test
```

**Manual testing checklist**:
- [ ] Page loads without errors
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Forms validate correctly
- [ ] API calls succeed
- [ ] Loading states display
- [ ] Error handling works
- [ ] Navigation works

### Debugging Tips

**1. Redux DevTools**
Install browser extension: https://github.com/reduxjs/redux-devtools-extension

View Redux state changes in real-time.

**2. Console Logging**
```javascript
console.log('Listing data:', listing);
console.log('Current state:', useSelector(state => state));
```

**3. React DevTools**
Install browser extension: https://react-devtools-tutorial.vercel.app/

Inspect component tree and props.

**4. Check Network Tab**
Open browser DevTools → Network to see API calls.

### Deployment

**Heroku (easiest)**
```bash
# Connect GitHub repo to Heroku
# Set environment variables in Heroku dashboard
git push heroku main
```

**Other platforms**
```bash
yarn run build
# Deploy build/ folder to your hosting
```

---

## Quick Reference: Where to Find Things

### "I want to change..."

| What | Where |
|------|-------|
| **Homepage** | `/src/containers/LandingPage/` or Console → Pages |
| **Product detail page** | `/src/containers/ListingPage/` |
| **Listing creation form** | `/src/containers/EditListingPage/EditListingWizard/` |
| **Search page** | `/src/containers/SearchPage/` |
| **Colors/logo** | `/src/config/configBranding.js` |
| **Custom listing fields** | `/src/config/configListing.js` → `listingFields` |
| **Transaction process** | `/src/config/configListing.js` → `listingTypes` |
| **Search filters** | `/src/config/configListing.js` → `filterConfig` |
| **Page layouts** | `/src/config/configLayout.js` |
| **Routes** | `/src/routing/routeConfiguration.js` |
| **Translations** | `/src/translations/en.json` or Console → Content |
| **Email templates** | `/ext/transaction-processes/*/templates/` |
| **Topbar/Header** | `/src/containers/TopbarContainer/` |
| **Footer** | `/src/containers/FooterContainer/` |
| **Global styles** | `/src/styles/marketplaceDefaults.css` |

---

## Learning Path for React Beginners

### Phase 1: Understanding (1-2 days)
1. Read this guide completely
2. Run the app locally: `yarn install` → `yarn run config` → `yarn run dev`
3. Browse the app and identify pages
4. Explore file structure: containers, components, config

### Phase 2: Small Changes (3-5 days)
1. Change marketplace color in `configBranding.js`
2. Modify text in `translations/en.json`
3. Add a new section to LandingPage
4. Customize Footer links

### Phase 3: Medium Changes (1-2 weeks)
1. Add custom listing field
2. Modify ListingPage sections
3. Create a new static page (About, FAQ)
4. Customize EditListingPage form

### Phase 4: Advanced Changes (2-4 weeks)
1. Add new transaction process states
2. Create custom filters
3. Build custom components
4. Integrate third-party services

---

## Additional Resources

### Official Documentation
- **Sharetribe Docs**: https://www.sharetribe.com/docs/
- **Marketplace API**: https://www.sharetribe.com/api-reference/
- **Sharetribe CLI**: https://www.sharetribe.com/docs/references/sharetribe-cli/

### React Learning
- **React Docs**: https://react.dev/
- **Hooks Guide**: https://react.dev/reference/react
- **Redux Docs**: https://redux.js.org/

### Community
- **Developer Slack**: https://www.sharetribe.com/dev-slack
- **GitHub Issues**: https://github.com/sharetribe/web-template/issues

---

## Glossary

**Container**: A React component connected to Redux, typically represents a full page

**Component**: A reusable UI element (button, card, form field)

**Duck**: A file containing Redux actions, action creators, and reducer

**Hook**: A React function that lets you use state and lifecycle features (useState, useEffect, etc.)

**Props**: Data passed from parent component to child component

**Redux**: State management library (centralized data store)

**Thunk**: An async Redux action (function that returns a function)

**Transaction Process**: The workflow defining how a booking/purchase/inquiry happens

**Listing Type**: Category of listing with specific transaction process and fields

**Extended Data**: Custom fields added to listings, users, or transactions

**Public Data**: Extended data visible to everyone

**Private Data**: Extended data only visible to listing owner

**Protected Data**: Extended data visible to transaction participants

**Unit Type**: Pricing unit (day, night, hour, item, inquiry)

**SSR**: Server-Side Rendering (initial page render happens on server)

**Flex SDK**: Sharetribe's JavaScript SDK for API calls

---

**End of Guide**

This guide covers the essential aspects of the Sharetribe marketplace template. As you work with the template, refer back to specific sections for detailed information on customization points.

Good luck with your marketplace! 🚀
