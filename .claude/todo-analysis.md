# TODO Analysis

> Auto-updated by `sync-todos` hook after every git commit. Last updated: 2026-04-28.

**61** total — **11 yours**, 50 from template.

---

## Your TODOs (11)

| File | Line | Comment |
|------|------|---------|
| \`src/containers/EditListingPage/EditListingPage.duck.js\` | 372 | \`// TODO: currently we don't handle thrown errors from these paginated calls\` |
| \`src/containers/EditListingPage/EditListingPage.duck.js\` | 948 | \`//  - TODO: this doesn't take care of failures of those extra calls\` |
| \`src/containers/SearchPage/SearchPage.shared.js\` | 277 | \`// TODO: Currently this only supports category filter with nested param names (categoryId, subcategoryId, thirdCategoryId).\` |
| \`src/containers/ListingPage/ListingPageCoverPhoto.js\` | 233 | \`const authorNeedsPayoutDetails = ['booking', 'purchase'].includes(processType); // TODO: add negotiation\` |
| \`src/containers/TransactionPage/TransactionPage.duck.js\` | 741 | \`// TODO if there're more than 100 incoming messages,\` |
| \`src/containers/PreviewListingPage/PreviewListingPageProductLayout.js\` | 1145 | \`{/* TODO: disable deletion when the listing is involved in a transaction (active/past bookings or inquiries).\` |
| \`src/containers/LandingPage/sections/PopularListingsSection.js\` | 67 | \`// TODO(landing-followup): Keep landing-page price labels aligned with the shared ListingCard.\` |
| \`server/api-util/lineItemHelpers.js\` | 603 | \`* TODO: Replace with actual external shipping API call.\` |
| \`server/api-util/lineItemHelpers.js\` | 622 | \`* TODO: Replace with actual insurance fee calculation (fixed config, API, etc.).\` |
| \`server/api-util/lineItemHelpers.js\` | 690 | \`* TODO: Replace with actual coupon validation (DB, external service).\` |
| \`server/api-util/lineItemHelpers.js\` | 703 | \`// Stub: any non-empty code gives 10% discount on subtotal (TODO: real validation)\` |

---

## Template TODOs (50)

| File | Line | Comment |
|------|------|---------|
| \`src/ducks/user.duck.js\` | 55 | \`// TODO figure out if sparse fields handling needs a better handling.\` |
| \`src/ducks/hostedAssets.duck.js\` | 150 | \`// TODO: potentially show an error page or reload if version mismatch is detected.\` |
| \`src/util/testData.js\` | 87 | \`// TODO: add all possible variants here\` |
| \`src/util/seo.js\` | 127 | \`// TODO: If we want to connect providers twitter account on ListingPage\` |
| \`src/util/errors.js\` | 166 | \`// TODO: This is a temporary solution until a proper error code\` |
| \`src/util/sanitize.js\` | 110 | \`// TODO: If you add public data, you should probably sanitize it here.\` |
| \`src/util/sanitize.js\` | 115 | \`// TODO: If you add user-generated metadata through Integration API,\` |
| \`src/util/sanitize.js\` | 223 | \`// TODO: If you add public data, you should probably sanitize it here.\` |
| \`src/util/richText.js\` | 98 | \`// TODO This can't handle links that contain parenthesis:\` |
| \`src/util/testHelpers.js\` | 27 | \`// TODO: add more relevant data for tests\` |
| \`src/util/testHelpers.js\` | 28 | \`// TODO: make it possible to overwrite configuration for tests\` |
| \`src/util/configHelpers.js\` | 399 | \`// TODO: this (includeForListingTypes) is deprecated config key!\` |
| \`src/config/configListing.js\` | 308 | \`// // TODO: SearchPage does not work well if both booking and product selling are used at the same time\` |
| \`src/components/OrderPanel/OrderPanel.js\` | 130 | \`// TODO: currently, inquiry-process does not have any form to ask more order data.\` |
| \`src/components/OrderPanel/OrderPanel.js\` | 181 | \`// TODO: In CTA, we don't have space to show proper error message for a mismatch of marketplace currency\` |
| \`src/components/LayoutComposer/LayoutSideNavigation/LayoutSideNavigation.js\` | 47 | \`// TODO: since responsiveAreas are still experimental,\` |
| \`src/components/DatePicker/DatePickers/DatePicker.js\` | 87 | \`// TODO: currently, startDateOffset & endDateOffset are only used for\` |
| \`src/components/FieldCurrencyInput/FieldCurrencyInput.js\` | 68 | \`// TODO Figure out if this could be digged from React-Intl directly somehow\` |
| \`src/components/Map/DynamicMapboxMap.js\` | 5 | \`// TODO: we should add an overlay with text "use two fingers to pan".\` |
| \`src/transactions/transaction.js\` | 368 | \`// TODO: this setup is subject to problems if one process has important state named\` |
| \`src/transactions/transaction.js\` | 381 | \`// TODO: this setup is subject to problems if one process has important state named\` |
| \`src/transactions/transactionProcessNegotiation.js\` | 49 | \`// TODO: this loop is not yet in use\` |
| \`src/transactions/transactionProcessNegotiation.js\` | 123 | \`UPDATE_PENDING: 'update-pending', // TODO: this is not yet in use/handled\` |
| \`src/transactions/transactionProcessNegotiation.js\` | 189 | \`// TODO: this is not yet in use\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingLocationPanel/EditListingLocationPanel.js\` | 20 | \`// TODO bounds are missing - those need to be queried directly from Google Places\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js\` | 360 | \`* TODO: turn this into a functional component\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js\` | 391 | \`* @param {propTypes.error} [props.createStripeAccountError] - The error object for createStripeAccount (TODO: errors object contains this)\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js\` | 392 | \`* @param {propTypes.error} [props.updateStripeAccountError] - The error object for updateStripeAccount (TODO: errors object contains this)\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js\` | 394 | \`* @param {propTypes.error} [props.stripeAccountError] - The error object for stripeAccount (TODO: errors object contains this)\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingWizard.js\` | 521 | \`// TODO: displayPrice aka config.defaultListingFields?.price with false value is only available with inquiry process\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingPhotosPanel/EditListingPhotosForm.test.js\` | 38 | \`// TODO to test this fully, we would need to check that store's state changes correctly.\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingWizardTab.js\` | 196 | \`// TODO: add missing cases for supported tabs\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingDeliveryPanel/EditListingDeliveryForm.js\` | 87 | \`// TODO: it might not be worth the trouble to show these fields as disabled,\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingDeliveryPanel/EditListingDeliveryPanel.js\` | 35 | \`// TODO bounds are missing - those need to be queried directly from Google Places\` |
| \`src/containers/EditListingPage/EditListingWizard/EditListingPricingPanel/StartTimeInverval.js\` | 45 | \`// TODO check that required works\` |
| \`src/containers/EditListingPage/EditListingPage.test.js\` | 2181 | \`// TODO Testing date pickers needs more work\` |
| \`src/containers/EditListingPage/EditListingPage.js\` | 248 | \`// TODO: is this dead code? (shouldRedirectAfterPosting is checked before)\` |
| \`src/containers/SearchPage/SearchMap/ReusableMapContainer.js\` | 77 | \`// TODO: Perhaps this should use createPortal instead of createRoot.\` |
| \`src/containers/SearchPage/SelectMultipleFilter/SelectMultipleFilter.js\` | 16 | \`// TODO: Live edit didn't work with FieldCheckboxGroup\` |
| \`src/containers/CheckoutPage/StripePaymentForm/StripePaymentForm.js\` | 506 | \`// TODO: confirmCardPayment can create all kinds of errors.\` |
| \`src/containers/TransactionPage/TransactionPage.stateDataNegotiation.js\` | 182 | \`// TODO How to hide an action button after certain time has passed or N transitions have been made?\` |
| \`src/containers/TransactionPage/TransactionPage.js\` | 133 | \`offerInSubunits: counterOffer.amount, // TODO: get the actual offer in subunits\` |
| \`src/containers/TransactionPage/TransactionPage.duck.js\` | 701 | \`// TODO if there're more than 100 incoming messages,\` |
| \`src/containers/NotFoundPage/NotFoundPage.test.js\` | 43 | \`// TODO: when isKeywordSearch = false, the form uses LocationAutocompleteInput, which is code-splitted\` |
| \`src/containers/PreviewResolverPage/PreviewResolverPage.js\` | 38 | \`// TODO the old named route, ListingPageVariant for unpublished listings, is confusing nowadays\` |
| \`src/containers/ManageListingsPage/ManageListingCard/ManageListingCard.module.css\` | 302 | \`/* TODO: Odd font-size */\` |
| \`src/containers/PageBuilder/SectionBuilder/SectionBuilder.js\` | 15 | \`// TODO: alternatively, we could consider more in-place way of theming components\` |
| \`src/containers/ProfilePage/ProfilePage.js\` | 352 | \`// TODO: When there's more content on the profile page, we should consider by-passing this redirection.\` |
| \`server/csp.js\` | 51 | \`// TODO: Signals support needs more work\` |
| \`server/resources/robotsTxt.js\` | 157 | \`// TODO: This defaults to more permissive robots.txt due to backward compatibility.\` |

