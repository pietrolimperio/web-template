# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Leaz is a bilateral Italian rental marketplace built on the Sharetribe Web Template (a Sharetribe-bootstrapped Create React App with SSR and code-splitting). It serves **Acquirenti** (renters: search → contact) and **Venditori** (providers: list → chat → accept).

Brand & design guidance lives in `.cursorrules` (brand voice, primary `#ff5a02`, secondary `#0C9FA7`) and `DESIGN.md` (editorial "Kinetic Curator" design system, surface hierarchy, typography). Follow both when adding/updating UI; use CSS variables from `src/styles/marketplaceDefaults.css` as the source of truth for tokens.

## Commands

Package manager is **yarn**. Node `>=18.20.1 <27`.

```sh
yarn install            # installs deps + runs patch-package
yarn run config         # interactive generation of .env (required on first setup)
yarn run config-check   # validates env vars

yarn run dev            # config-check + concurrently runs dev-frontend (CRA on 3000) and dev-backend (nodemon apiServer on 3500)
yarn run dev-frontend   # client only (sharetribe-scripts start)
yarn run dev-backend    # API server only (nodemon server/apiServer.js)
yarn run dev-server     # full SSR prod-like server locally (build + nodemon server/index.js on port 4000)

yarn run build          # build-web + build-server (CRA + SSR bundle)
yarn start              # run production server (requires yarn build first)

yarn test               # Jest watch mode (via sharetribe-scripts)
yarn test -- --watchAll=false PathOrPattern   # run a subset / single file
yarn run test-server    # Jest over server/**/*.test.js only
yarn run test-ci        # full CI run (server tests first, then client, both --runInBand)

yarn run format         # prettier write over **/*.{js,css}
yarn run format-ci      # prettier list-different (CI check)
yarn run translate      # scripts/translations.js helper for src/translations
```

`scripts/config.js` drives interactive env setup. Mandatory env vars at server boot (`server/index.js`): `REACT_APP_SHARETRIBE_SDK_CLIENT_ID`, `SHARETRIBE_SDK_CLIENT_SECRET`, `REACT_APP_MARKETPLACE_NAME`, `REACT_APP_MARKETPLACE_ROOT_URL`.

## Architecture

### Two servers

- `server/apiServer.js` — lightweight Express API only, used during `yarn dev` (frontend runs via CRA dev server, proxied through `REACT_APP_DEV_API_SERVER_PORT=3500`).
- `server/index.js` — production server: serves the built CRA assets, handles SSR via `server/renderer.js` + `server/dataLoader.js`, mounts Helmet/CSP (`server/csp.js`), passport auth, sitemap/robots/webmanifest routes, and the `/api` router.
- Both mount `server/apiRouter.js`, which exposes the **privileged transaction endpoints** — `transaction-line-items`, `initiate-privileged`, `transition-privileged` — that must run server-side because they call Sharetribe with the trusted client secret to compute commissions and line-items. These are the server-side contract for custom pricing; do not move pricing logic to the browser.
- OAuth (`/api/auth/google`, `/api/auth/facebook`) uses passport + Sharetribe `loginWithIdp`. New-user confirmation flow goes through `/api/auth/create-user-with-idp`.

### Client app shape

- `src/index.js` (CSR) and `server/dataLoader.js` (SSR) both fetch **hosted configs** via Asset Delivery API (Sharetribe Console manages them) and merge them over `src/config/configDefault.js` through `src/util/configHelpers.js::mergeConfig`. The result lives in React Context; changing defaults here is rarely what you want — prefer Console for hosted configs.
- `src/routing/routeConfiguration.js` defines named routes; each page is code-split via `@loadable/component`. `LoadableComponentErrorBoundary` catches chunk-load 404s after deploys.
- `src/containers/pageDataLoadingAPI.js` wires each page's `loadData` / `setInitialValues`. When adding a page with SSR data needs, export `loadData` from its `*.duck.js` and register it here **and** in `routeConfiguration.js`.
- State: Redux (`src/store.js`) with thunk middleware. Global slices live in `src/ducks/*.duck.js` (auth, user, marketplaceData, stripe, stripeConnectAccount, hostedAssets, ui, paymentMethods, emailVerification, routing). Per-page slices live next to the page as `containers/*/*Page.duck.js` and are combined via `src/containers/reducers.js`.
- UI primitives in `src/components/**` are exported via `src/components/index.js`; containers import from there — preserve that barrel.

### Config layer (`src/config/`)

The listing data model hinges on three values stored in listing public data:

- `listingType` — configured in `configListing.js`; determines label, stock, transaction type.
- `transactionProcessAlias` — `process-name/alias` string; must match a process that actually exists in the connected Sharetribe environment.
- `unitType` — pricing unit (`item`, `day`, `night`, `hour`, `fixed`, `inquiry`, `offer`, `request`).

These three must stay in sync across `src/config/configListing.js`, the transaction process definitions in `src/transactions/`, and the processes deployed to the Sharetribe backend. Changing one typically requires updating all three sites.

### Transaction processes (`src/transactions/`)

Five process graphs ship: `transactionProcessBooking`, `transactionProcessInstantBooking`, `transactionProcessPurchase`, `transactionProcessInquiry`, `transactionProcessNegotiation`. `transaction.js` is the registry — components and ducks import it to branch on process name. The canonical definitions live in `ext/transaction-processes/` and must be pushed to Sharetribe Console via Sharetribe CLI; editing only the client-side files does not change backend behavior.

For `default-negotiation`, the initial transition is chosen by `unitType`: `offer` = provider-created listing (normal flow), `request` = customer-created listing (provider responds with an offer).

### Notable Leaz-specific containers

The repo includes both the Sharetribe defaults and Leaz-specific variants. When customizing auth/landing flows, check which variant is wired in `routeConfiguration.js`:

- `NewLandingPage`, `NewLoginPage`, `NewSignupPage`, `NewSignupStripePage` — Leaz redesigns.
- `AIListingCreationPage`, `FaqPage`, `MakeOfferPage`, `PreviewListingPage`, `RequestQuotePage`, `ProductPage` — custom pages beyond the stock template.

## Conventions

- CSS Modules (`*.module.css`) per component; global tokens in `src/styles/marketplaceDefaults.css` and `src/styles/customMediaQueries.css`. Follow the DESIGN.md "no-line rule" (surface-color shifts, not 1px borders) for new sections.
- i18n via `react-intl`; message catalogs in `src/translations/`. Use `scripts/translations.js` (`yarn run translate`) rather than hand-editing when comparing locales.
- Dates/money: `moment` + `moment-timezone` and `decimal.js` are already wired — use them; don't introduce alternatives.
- `patches/` contains `patch-package` overrides (currently `final-form+4.20.10`) applied via `postinstall`. If you see unexpected behavior in `final-form`, check the patch first.
