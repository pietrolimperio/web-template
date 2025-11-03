# Sharetribe Template - Quick Reference Cheat Sheet

## File Locations Quick Lookup

```
Configuration Files
├── Main Config          → src/config/configDefault.js
├── Listing Types        → src/config/configListing.js
├── Layout/Variants      → src/config/configLayout.js
├── Branding/Colors      → src/config/configBranding.js
├── Search Settings      → src/config/configSearch.js
└── Translations         → src/translations/en.json

Key Pages
├── Homepage             → src/containers/LandingPage/
├── Product Page (PDP)   → src/containers/ListingPage/
├── Create Listing       → src/containers/EditListingPage/
├── Search Results       → src/containers/SearchPage/
├── Checkout             → src/containers/CheckoutPage/
├── Transaction Details  → src/containers/TransactionPage/
└── User Profile         → src/containers/ProfilePage/

Layout Components
├── Header/Topbar        → src/containers/TopbarContainer/
├── Footer               → src/containers/FooterContainer/
└── Page Wrapper         → src/components/Page/

Routing
├── Route Config         → src/routing/routeConfiguration.js
└── Routes Component     → src/routing/Routes.js

Transaction Processes
├── Process Definitions  → ext/transaction-processes/
├── Process Logic        → src/transactions/transaction.js
└── Email Templates      → ext/transaction-processes/{process}/templates/

Styling
├── Global Styles        → src/styles/marketplaceDefaults.css
├── Media Queries        → src/styles/customMediaQueries.css
└── Component CSS        → [ComponentName].module.css
```

---

## Common React Patterns

### Component Structure
```javascript
import React from 'react';
import css from './MyComponent.module.css';

const MyComponent = ({ title, items, onAction }) => {
  return (
    <div className={css.root}>
      <h2 className={css.title}>{title}</h2>
      <button onClick={() => onAction('data')}>Click</button>
    </div>
  );
};

export default MyComponent;
```

### Redux Connected Component
```javascript
import { useSelector, useDispatch } from 'react-redux';
import { myAction } from './MyPage.duck';

const MyPage = () => {
  const data = useSelector(state => state.MyPage.data);
  const dispatch = useDispatch();
  
  const handleAction = () => {
    dispatch(myAction(params));
  };
  
  return <div>{data}</div>;
};
```

### Hooks
```javascript
import { useState, useEffect } from 'react';

const MyComponent = () => {
  // State
  const [count, setCount] = useState(0);
  
  // Side effects
  useEffect(() => {
    console.log('Mounted or count changed');
    return () => console.log('Cleanup');
  }, [count]);
  
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

---

## Configuration Quick Examples

### Add a Custom Listing Field
```javascript
// configListing.js → listingFields array
{
  key: 'size',
  scope: 'public',
  schemaType: 'enum',
  enumOptions: [
    { option: 'small', label: 'Small' },
    { option: 'medium', label: 'Medium' },
    { option: 'large', label: 'Large' }
  ],
  filterConfig: {
    indexForSearch: true,
    filterType: 'SelectMultipleFilter',
    label: 'Size',
    group: 'primary'
  },
  showConfig: {
    label: 'Size',
    isDetail: true
  },
  saveConfig: {
    label: 'Select Size',
    placeholderMessage: 'Choose a size...',
    isRequired: true,
    requiredMessage: 'Size is required'
  }
}
```

### Define a Listing Type
```javascript
// configListing.js → listingTypes array
{
  listingType: 'rental',
  label: 'Daily Rental',
  transactionType: {
    process: 'default-booking',
    alias: 'default-booking/release-1',
    unitType: 'day'
  },
  defaultListingFields: {
    location: true,
    payoutDetails: true
  }
}
```

### Change Colors & Branding
```javascript
// configBranding.js
export const marketplaceColor = '#7c3aed';  // Purple
export const logoImageDesktopURL = './path/to/logo.png';
```

### Switch Layout Variants
```javascript
// configLayout.js
export const searchPage = { variantType: 'grid' };  // or 'map'
export const listingPage = { variantType: 'carousel' };  // or 'coverPhoto'
```

---

## Routing

### Add a New Route
```javascript
// routeConfiguration.js
import MyNewPage from '../containers/MyNewPage/MyNewPage';

{
  path: '/my-page',
  name: 'MyNewPage',
  component: MyNewPage,
  auth: false  // or true for protected routes
}
```

### Navigate Between Pages
```javascript
import { NamedLink } from '../../components';

// Declarative
<NamedLink name="ListingPage" params={{ id: listingId, slug: 'bike' }}>
  View Listing
</NamedLink>

// Programmatic
import { useHistory } from 'react-router-dom';
const history = useHistory();
history.push('/search?address=Berlin');
```

---

## Data Fetching (Redux)

### Duck File Pattern
```javascript
// MyPage.duck.js

// Action Types
const FETCH_DATA_REQUEST = 'app/MyPage/FETCH_DATA_REQUEST';
const FETCH_DATA_SUCCESS = 'app/MyPage/FETCH_DATA_SUCCESS';
const FETCH_DATA_ERROR = 'app/MyPage/FETCH_DATA_ERROR';

// Action Creators
const fetchDataRequest = () => ({ type: FETCH_DATA_REQUEST });
const fetchDataSuccess = (data) => ({ 
  type: FETCH_DATA_SUCCESS, 
  payload: data 
});
const fetchDataError = (error) => ({ 
  type: FETCH_DATA_ERROR, 
  payload: error 
});

// Thunk (Async Action)
export const fetchData = (id) => (dispatch, getState, sdk) => {
  dispatch(fetchDataRequest());
  
  return sdk.listings.show({ id })
    .then(response => {
      dispatch(fetchDataSuccess(response.data.data));
      return response;
    })
    .catch(error => {
      dispatch(fetchDataError(error));
      throw error;
    });
};

// Reducer
const initialState = {
  data: null,
  fetchInProgress: false,
  fetchError: null
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case FETCH_DATA_REQUEST:
      return { ...state, fetchInProgress: true, fetchError: null };
    case FETCH_DATA_SUCCESS:
      return { ...state, data: action.payload, fetchInProgress: false };
    case FETCH_DATA_ERROR:
      return { ...state, fetchError: action.payload, fetchInProgress: false };
    default:
      return state;
  }
}
```

---

## Sharetribe SDK Quick Reference

### Listings
```javascript
// Search listings
sdk.listings.query({
  perPage: 12,
  pub_listingType: 'rental',
  pub_categoryLevel1: 'bikes'
});

// Get single listing
sdk.listings.show({ id: listingId });

// Create listing
sdk.listings.create({
  title: 'My Bike',
  description: 'A great bike',
  price: new Money(5000, 'USD'),
  publicData: { category: 'mountain' }
});

// Update listing
sdk.listings.update({
  id: listingId,
  title: 'Updated Title',
  publicData: { newField: 'value' }
});

// Upload images
sdk.images.upload({ image: file });
```

### Transactions
```javascript
// Initiate transaction
sdk.transactions.initiate({
  processAlias: 'default-booking/release-1',
  transition: 'transition/request-payment',
  params: {
    listingId: listing.id,
    bookingStart: new Date('2024-01-01'),
    bookingEnd: new Date('2024-01-05')
  }
});

// Transition transaction
sdk.transactions.transition({
  id: transactionId,
  transition: 'transition/accept'
});

// Query transactions
sdk.transactions.query({
  only: 'sale',  // or 'order'
  lastTransitions: ['transition/accept']
});
```

### Users
```javascript
// Get current user
sdk.currentUser.show();

// Update profile
sdk.currentUser.updateProfile({
  firstName: 'John',
  lastName: 'Doe',
  bio: 'Bike enthusiast'
});
```

### Messages & Reviews
```javascript
// Send message
sdk.messages.send({
  transactionId: transaction.id,
  content: 'Hello!'
});

// Create review
sdk.reviews.create({
  transactionId: transaction.id,
  rating: 5,
  content: 'Great experience!'
});
```

---

## Styling

### CSS Variables (Colors)
```css
/* Common colors */
--marketplaceColor           /* Primary brand color */
--marketplaceColorDark       /* Darker shade */
--marketplaceColorLight      /* Lighter shade */

--matterColorLight           /* Light gray bg */
--matterColor                /* Main text */
--matterColorDark            /* Dark text */
--matterColorAnti            /* White/light text */

--successColor               /* Green */
--failColor                  /* Red */
--attentionColor             /* Yellow/orange */
```

### Media Queries
```css
@import '../../styles/customMediaQueries.css';

.myElement {
  padding: 12px;
  
  @media (--viewportMedium) {
    padding: 24px;  /* ≥768px */
  }
  
  @media (--viewportLarge) {
    padding: 36px;  /* ≥1024px */
  }
}
```

### Component CSS Module
```css
/* MyComponent.module.css */
.root {
  composes: marketplaceModalBaseStyles from global;
  background-color: var(--matterColorLight);
}

.title {
  color: var(--marketplaceColor);
  font-size: 24px;
}
```

---

## Translation Keys

### Location
`/src/translations/en.json`

### Common Patterns
```json
{
  "PageName.title": "My Page Title",
  "PageName.description": "Description text",
  "ComponentName.buttonLabel": "Click Me",
  "ComponentName.errorMessage": "Something went wrong"
}
```

### Usage in Components
```javascript
import { FormattedMessage } from '../../util/reactIntl';

<FormattedMessage id="MyPage.title" />

// With variables
<FormattedMessage 
  id="MyPage.greeting" 
  values={{ name: userName }} 
/>
// Translation: "Hello {name}!"
```

---

## Forms (React Final Form)

### Basic Form
```javascript
import { Form } from 'react-final-form';
import { FieldTextInput, Button } from '../../components';

const MyForm = ({ onSubmit }) => {
  return (
    <Form onSubmit={onSubmit}>
      {({ handleSubmit, submitting }) => (
        <form onSubmit={handleSubmit}>
          <FieldTextInput
            id="title"
            name="title"
            type="text"
            label="Title"
            placeholder="Enter title..."
            validate={required('Title is required')}
          />
          <Button type="submit" inProgress={submitting}>
            Submit
          </Button>
        </form>
      )}
    </Form>
  );
};
```

### Validation
```javascript
import { required, composeValidators } from '../../util/validators';

const minLength = min => value =>
  value && value.length < min ? `Min ${min} characters` : undefined;

<FieldTextInput
  validate={composeValidators(
    required('Required'),
    minLength(3)
  )}
/>
```

---

## EditListingPage Tab Structure

### Tab Configuration
```javascript
// EditListingWizard.js

// For booking process
const TABS_BOOKING = [
  'details',      // Title, description, custom fields
  'location',     // Address, geolocation
  'pricing',      // Price, price variations
  'availability', // Calendar, schedule
  'photos'        // Images
];

// For purchase process
const TABS_PRODUCT = [
  'details',              // Title, description, custom fields
  'pricing-and-stock',    // Price, stock quantity
  'delivery',             // Shipping/pickup options
  'photos'                // Images
];
```

### Panel Structure
Each panel has:
- **Panel Component**: Data transformation, submission
- **Form Component**: User input, validation

---

## Transaction Processes

### Available Processes
| Process | Use Case | Unit Types |
|---------|----------|------------|
| `default-booking` | Rentals, reservations | day, night, hour, fixed |
| `default-purchase` | Product sales | item |
| `default-inquiry` | Quote requests | inquiry |
| `default-negotiation` | Offers & counteroffers | offer, request |

### Process State Check
```javascript
import { getProcess } from '../../transactions/transaction';

const MyComponent = ({ transaction }) => {
  const processName = transaction.attributes.processName;
  const process = getProcess(processName);
  const state = process.getState(transaction);
  
  if (state === process.states.ACCEPTED) {
    return <AcceptedView />;
  } else if (state === process.states.PENDING_PAYMENT) {
    return <PaymentView />;
  }
};
```

---

## Development Commands

```bash
# Setup
yarn install
yarn run config

# Development
yarn run dev                    # Start both frontend and backend
yarn run dev-frontend           # Start only frontend (localhost:3000)
yarn run dev-backend            # Start only backend (localhost:3500)

# Build
yarn run build                  # Production build
yarn run build-web              # Build frontend only
yarn run build-server           # Build server only

# Testing
yarn run test                   # Run tests
yarn run test-ci                # Run tests in CI mode

# Code Quality
yarn run format                 # Format with Prettier
yarn run format-ci              # Check formatting

# Translations
yarn run translate              # Manage translations

# Other
yarn run clean                  # Remove build files
yarn run config-check           # Verify configuration
```

---

## Common Troubleshooting

### "Module not found"
```bash
# Clear cache and reinstall
rm -rf node_modules
yarn cache clean
yarn install
```

### Styling not updating
- Check CSS module import: `import css from './Component.module.css'`
- Verify class name: `className={css.myClass}`
- Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Win)

### Redux state not updating
- Check if action is dispatched: `dispatch(myAction())`
- Verify reducer is registered in `/src/reducers.js`
- Use Redux DevTools to inspect state changes

### API calls failing
- Check `.env` file has correct credentials
- Verify SDK client ID and marketplace ID
- Check browser console for error details

---

## Deployment Checklist

- [ ] Update environment variables for production
- [ ] Set `REACT_APP_ENV=production`
- [ ] Configure Stripe with production keys
- [ ] Set up custom domain
- [ ] Enable CSP: `REACT_APP_CSP=block`
- [ ] Test on staging environment
- [ ] Run `yarn run build` successfully
- [ ] Configure server (Heroku/AWS/etc.)
- [ ] Set up error tracking (Sentry)
- [ ] Configure analytics (Google Analytics)

---

## Useful Links

- **Official Docs**: https://www.sharetribe.com/docs/
- **API Reference**: https://www.sharetribe.com/api-reference/
- **CLI Tool**: https://www.sharetribe.com/docs/references/sharetribe-cli/
- **Console**: https://console.sharetribe.com/
- **Dev Slack**: https://www.sharetribe.com/dev-slack
- **GitHub**: https://github.com/sharetribe/web-template

---

## Pro Tips

1. **Always read existing code** before creating something new
2. **Use existing components** from `/src/components/` when possible
3. **Test in multiple browsers** (Chrome, Firefox, Safari)
4. **Mobile-first approach** - design for mobile, then desktop
5. **Keep components small** - split large components into smaller ones
6. **Use Redux for shared state** - local state with useState for component-specific state
7. **Follow naming conventions** - PascalCase for components, camelCase for functions
8. **Comment complex logic** - help future you understand the code
9. **Use environment variables** for secrets and configuration
10. **Version control everything** - commit often with clear messages

---

**Last Updated**: October 2025

For detailed explanations, see **COMPREHENSIVE_DEVELOPER_GUIDE.md**
