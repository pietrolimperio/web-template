# Translation Gap Analysis

> Last generated: 2026-04-28  
> Reference locale: `en.json` (2170 keys)

## Key counts

| File | Keys | Missing from en | Extra vs en |
|---|---|---|---|
| `en.json` | 2170 | — | — |
| `it.json` | 2148 | **25** | **3** |
| `de.json` | 2050 | **121** | 0 |
| `es.json` | 2050 | **120** | 0 |
| `fr.json` | 2050 | **120** | 0 |
| `pt.json` | 2050 | **120** | 0 |

---

## it.json — 25 keys missing from en.json

### CustomHero (3)
- `CustomHero.discoverMore`
- `CustomHero.postListing`
- `CustomHero.title`

### Screenreader keys (22)
- `EditListingStyleForm.screenreader.chooseCardStyle`
- `EditListingWizard.screenreader.tabNavigation`
- `FieldSelectTree.screenreader.option`
- `FieldSelectTree.screenreader.optionSelected`
- `FilterForm.screenreader.label`
- `IconSpinner.screenreader.loading`
- `InboxPage.noOrdersCta`
- `InboxPage.noOrdersEmptyDescription`
- `InboxPage.screenreader.sidenav`
- `LayoutSideNavigation.screenreader.accountNavigation`
- `LocationAutocompleteInput.screenreader.search`
- `ManageListingCard.screenreader.menu`
- `ManageListingsPage.emptyStateDescription`
- `NotFoundPage.screenreader.search`
- `ProfilePage.screenreader.reviewsNav`
- `SearchMapPriceLabel.screenreader.mapMarkerWithoutPrice`
- `SearchPage.screenreader.openFilterButton`
- `SearchResultsPanel.screenreader.pagination`
- `TabNav.screenreader.tabNavigation`
- `TopbarDesktop.screenreader.profileMenu`
- `TopbarDesktop.screenreader.search`
- `TopbarDesktop.screenreader.topbarNavigation`

### Extra keys in it.json NOT in en.json (3) — orphans to resolve
- `EmailVerificationPage.fetchError`
- `EmailVerificationPage.loadingUserData`
- `EmailVerificationPage.verifying`

---

## de / es / fr / pt — ~120 keys missing from en.json

All four files are missing the same block of Leaz-specific keys added to `en.json` (and `it.json`) but never backfilled.

### BookingDatesForm (6)
- `BookingDatesForm.couponCodeLabel`
- `BookingDatesForm.couponCodePlaceholder`
- `BookingDatesForm.deliveryMethodLabel`
- `BookingDatesForm.handByHandOption`
- `BookingDatesForm.pickupOption`
- `BookingDatesForm.shippingOption`

### EditListingWizard (1) — missing only in de/es/fr, present in pt
- `EditListingWizard.screenreader.tabNavigation` *(pt has it)*

### ImageUpload (10)
- `ImageUpload.backButton`
- `ImageUpload.dropzoneSubtitle`
- `ImageUpload.dropzoneTitle`
- `ImageUpload.editorialTipBody`
- `ImageUpload.editorialTipTitle`
- `ImageUpload.headingPart1`
- `ImageUpload.headingPart2`
- `ImageUpload.mainPhotoLabel`
- `ImageUpload.photosLabel`
- `ImageUpload.stepDetails`
- `ImageUpload.stepIndicator`

### InboxPage (2)
- `InboxPage.noOrdersCta`
- `InboxPage.noOrdersEmptyDescription`

### ListingCard (1)
- `ListingCard.details`

### ListingConfiguration (6)
- `ListingConfiguration.approximateLocation`
- `ListingConfiguration.exceptionInfoTooltip`
- `ListingConfiguration.exceptionsQuestion`
- `ListingConfiguration.locationOptions`
- `ListingConfiguration.shippingEnabled`

### ManageListingsPage (1)
- `ManageListingsPage.emptyStateDescription`

### NewLandingPage (47)
- `NewLandingPage.categoriesKicker`
- `NewLandingPage.categoriesViewAll`
- `NewLandingPage.ctaButtonPrimary`
- `NewLandingPage.ctaButtonSecondary`
- `NewLandingPage.ctaSubtitle`
- `NewLandingPage.ctaTitle`
- `NewLandingPage.finalCtaPrimary`
- `NewLandingPage.finalCtaSecondary`
- `NewLandingPage.finalCtaSub`
- `NewLandingPage.finalCtaTitle`
- `NewLandingPage.heroAvailableNow`
- `NewLandingPage.heroCosaLabel`
- `NewLandingPage.heroQuandoLabel`
- `NewLandingPage.heroSamplePrice`
- `NewLandingPage.heroSampleProduct`
- `NewLandingPage.heroSearchAriaLabel`
- `NewLandingPage.heroSub`
- `NewLandingPage.heroTitle1`
- `NewLandingPage.heroTitle2`
- `NewLandingPage.howItWorksKicker`
- `NewLandingPage.howItWorksTitle`
- `NewLandingPage.howStep1Body`
- `NewLandingPage.howStep1Title`
- `NewLandingPage.howStep2Body`
- `NewLandingPage.howStep2Title`
- `NewLandingPage.howStep3Body`
- `NewLandingPage.howStep3Title`
- `NewLandingPage.inEvidenzaKicker`
- `NewLandingPage.inEvidenzaTitle`
- `NewLandingPage.partnersKicker`
- `NewLandingPage.rotatingWord0`
- `NewLandingPage.rotatingWord1`
- `NewLandingPage.rotatingWord2`
- `NewLandingPage.rotatingWord3`
- `NewLandingPage.rotatingWord4`
- `NewLandingPage.rotatingWord5`
- `NewLandingPage.rotatingWord6`
- `NewLandingPage.testimonial1Quote`
- `NewLandingPage.testimonial1Tag`
- `NewLandingPage.testimonial1Who`
- `NewLandingPage.testimonial2Quote`
- `NewLandingPage.testimonial2Tag`
- `NewLandingPage.testimonial2Who`
- `NewLandingPage.testimonial3Quote`
- `NewLandingPage.testimonial3Tag`
- `NewLandingPage.testimonial3Who`
- `NewLandingPage.testimonialsKicker`
- `NewLandingPage.testimonialsTitle`
- `NewLandingPage.trust1Body`
- `NewLandingPage.trust1Title`
- `NewLandingPage.trust2Body`
- `NewLandingPage.trust2Title`
- `NewLandingPage.trust3Body`
- `NewLandingPage.trust3Title`
- `NewLandingPage.trustKicker`
- `NewLandingPage.trustTitle`
- `NewLandingPage.valuePropSectionSubtitle`

### OrderBreakdown (4)
- `OrderBreakdown.autoDiscount`
- `OrderBreakdown.baseUnitOriginalPrice`
- `OrderBreakdown.coupon`
- `OrderBreakdown.couponDiscount`

### PreviewListingPage (18)
- `PreviewListingPage.cancelButton`
- `PreviewListingPage.deleteButton`
- `PreviewListingPage.deleteError`
- `PreviewListingPage.deleteImage`
- `PreviewListingPage.deleteImageConfirm`
- `PreviewListingPage.deleteImageWarning`
- `PreviewListingPage.descriptionLabel`
- `PreviewListingPage.details`
- `PreviewListingPage.fieldRequired`
- `PreviewListingPage.imageModal`
- `PreviewListingPage.invalidImageType`
- `PreviewListingPage.loading`
- `PreviewListingPage.perDay`
- `PreviewListingPage.priceVariants`
- `PreviewListingPage.regenerateButton`
- `PreviewListingPage.regenerateError`
- `PreviewListingPage.saveButton`
- `PreviewListingPage.selectImage`
- `PreviewListingPage.updateError`
- `PreviewListingPage.uploadError`

### ProductPage (1)
- `ProductPage.noImagePlaceholder`

### SearchPage.LocationFilter (5)
- `SearchPage.LocationFilter.geolocationError`
- `SearchPage.LocationFilter.locationPlaceholder`
- `SearchPage.LocationFilter.radiusLabel`
- `SearchPage.LocationFilter.title`
- `SearchPage.LocationFilter.useMyLocation`

### TopbarMobileMenu (6)
- `TopbarMobileMenu.ctaButton`
- `TopbarMobileMenu.ctaDescription`
- `TopbarMobileMenu.ctaTitle`
- `TopbarMobileMenu.guestGreeting`
- `TopbarMobileMenu.guestUser`
- `TopbarMobileMenu.help`

### Per-file exceptions
- **de only:** `StripePaymentForm.stripe.validation_error.card_declined`
- **pt only:** `NewSignupPage.dateNotInFuture` (missing), `EditListingWizard.screenreader.tabNavigation` (present — not missing in pt)

---

## Action items

| Priority | Task |
|---|---|
| High | Translate 25 missing keys into `it.json` (mainly screenreader + CustomHero) |
| High | Decide on 3 orphan `EmailVerificationPage` keys in `it.json` — add to `en.json` or remove |
| Medium | Translate ~120 Leaz-specific keys for `de`, `es`, `fr`, `pt` (or stub with en values) |
| Low | Add `StripePaymentForm.stripe.validation_error.card_declined` to de if needed |
| Low | Add `NewSignupPage.dateNotInFuture` to pt |
