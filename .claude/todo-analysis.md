# TODO Analysis

> Auto-updated by the `sync-todos` post-commit hook. Last confirmed accurate: 2026-04-27.

## Summary

79 TODO comments across `src/` and `server/`. **10 introduced by Pietro**, 69 from the original Sharetribe Web Template.

---

## Pietro's TODOs (10) — Action items you own

### `server/api-util/lineItemHelpers.js` — 4 TODOs (Feb 2026)

| Line | TODO |
|------|------|
| 603 | `Replace with actual external shipping API call.` |
| 622 | `Replace with actual insurance fee calculation (fixed config, API, etc.).` |
| 690 | `Replace with actual coupon validation (DB, external service).` |
| 703 | `Stub: any non-empty code gives 10% discount on subtotal (TODO: real validation)` |

**Pre-launch critical** — coupon stub will silently apply 10% to any non-empty code in production.

---

### `src/containers/LandingPage/` — 4 TODOs (Apr 2026)

| File | Line | TODO |
|------|------|------|
| `LandingPage.duck.js` | 59 | `(hero-spotlight): Popular query also feeds HeroSection spotlight via popularListings[0] today.` |
| `sections/HeroSection.js` | 60 | `(landing-followup): Once hero items come from backend configuration, decouple this` |
| `sections/HeroSection.js` | 63 | `(landing-followup): Once hero items come from backend configuration, decouple this` |
| `sections/PopularListingsSection.js` | 67 | `(landing-followup): Keep landing-page price labels aligned with the shared ListingCard.` |

**Post-launch** — defer until hero items migrate to Sharetribe Console config.

---

### `src/containers/MakeOfferPage/MakeOfferPage.duck.js` — 2 bare TODOs (Nov 2025)

| Line | TODO |
|------|------|
| 229 | `dispatch(addMarketplaceEntities(response, sanitizeConfig)); // TODO` |
| 230 | `dispatch(showTransactionSuccess(response)); // TODO` |

**Clarify intent** — bare TODO with no description after dispatch calls.

---

### `src/containers/PreviewListingPage/PreviewListingPageProductLayout.js` — 1 TODO (Apr 2026)

| Line | TODO |
|------|------|
| 1145 | `disable deletion when the listing is involved in a transaction (active/past bookings or inquiries).` |

**Pre-launch critical** — listing deletion is not guarded against active transactions.

---

## Template TODOs (69) — Original Sharetribe code

Safe to ignore unless working in those areas. Notable ones that intersect with Leaz customisations:

| File | Line | Note |
|------|------|------|
| `src/util/sanitize.js` | 110, 115, 223 | Sanitize any public data fields you add |
| `src/containers/ListingPage/ListingPageCoverPhoto.js` | 233 | `authorNeedsPayoutDetails` not covering `negotiation` process |
| `src/containers/TransactionPage/TransactionPage.js` | 133 | Counter-offer amount not yet read from actual offer |
| `src/containers/TransactionPage/TransactionPage.duck.js` | 701, 741 | >100 messages not paginated |
| `src/transactions/transactionProcessNegotiation.js` | 49, 123, 189 | `loop` and `update-pending` states not yet wired |
| `src/containers/EditListingPage/.../EditListingLocationPanel.js` | 20 | Google Places bounds missing |

---

## Prioritized action list (Pietro's TODOs only)

1. `lineItemHelpers.js:703` — replace coupon stub before launch
2. `lineItemHelpers.js:603,622,690` — implement real shipping/insurance/coupon logic
3. `PreviewListingPageProductLayout.js:1145` — guard listing deletion against active transactions
4. `MakeOfferPage.duck.js:229,230` — add description or resolve
5. `LandingPage` `(landing-followup)` — defer to post-launch
