# Leaz Web Template — Technical Reference

## Executive Summary

Leaz is a bilateral Italian rental marketplace. Users are either **Acquirenti** (renters: search → contact) or **Venditori** (providers: list → chat → accept). This repository is **Pillar 1** of a three-pillar infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Three-Pillar Architecture                │
│                                                                 │
│  ┌──────────────┐     ┌──────────────────┐   ┌──────────────┐  │
│  │  Pillar 1    │────▶│    Pillar 2      │   │  Pillar 3    │  │
│  │ Web Template │     │ Leaz Backend     │   │ AI Eval API  │  │
│  │ (this repo)  │────▶│ (Sharetribe      │   │ (product     │  │
│  │              │     │  Integration API,│   │  image       │  │
│  │ React SSR    │     │  FAQ, Analytics, │   │  analysis)   │  │
│  │ + Node/Expr  │     │  coupons, bulk)  │   │              │  │
│  └──────────────┘     └──────────────────┘   └──────────────┘  │
│          │                      │                    │          │
│          └──────────────────────┴────────────────────┘          │
│                      Sharetribe Flex API                        │
└─────────────────────────────────────────────────────────────────┘
```

**This pillar** serves the public-facing web application: SSR React pages, OAuth, transaction flows, AI-assisted listing creation, and a thin Express server that proxies privileged Sharetribe calls.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | ≥18.20.1, <27 |
| UI framework | React | 18.3.1 |
| State | Redux + Redux Thunk | 4.2.1 / 2.4.2 |
| Routing | React Router DOM | 5.3.4 |
| Server | Express | 4.21.2 |
| Build system | Sharetribe scripts (CRA fork) | — |
| Code splitting | @loadable/component + server | 5.16.4 |
| Internationalization | React Intl | 6.8.4 |
| Forms | Final Form + React Final Form | 4.20.10 / 6.5.9 |
| OAuth | Passport.js | 0.7.0 |
| HTTP client | Axios | 1.13.1 |
| Error tracking | Sentry (browser + node) | 8.55.0 |
| Security | Helmet | 8.1.0 |
| CSS | CSS Modules + PostCSS | — |
| Payments | Stripe (via Sharetribe) | — |
| Maps | Mapbox GL | — |
| Marketplace SDK | sharetribe-flex-sdk | 1.21.1 |

---

## Server Architecture

### Production (single process)

```
yarn build && yarn start
        │
        ▼
  server/index.js  :PORT
  ├── /static/*          → serves build/static (CRA output)
  ├── /api/*             → server/apiRouter.js
  │   ├── POST /api/transaction-line-items   ← privileged (uses SDK client secret)
  │   ├── POST /api/initiate-privileged      ← privileged
  │   ├── POST /api/transition-privileged    ← privileged
  │   ├── GET  /api/auth/google              ← Passport OAuth
  │   └── GET  /api/auth/facebook            ← Passport OAuth
  ├── /robots.txt, /sitemap-*.xml, /site.webmanifest
  └── *                  → SSR via server/renderer.js + dataLoader.js
```

The three `/api/transaction-*` and `/api/*-privileged` routes **must stay server-side** — they call Sharetribe with the trusted `SHARETRIBE_SDK_CLIENT_SECRET` to compute commissions and line-items. Never expose the secret on the client.

### Development (two processes)

```
yarn dev
  ├── dev-frontend  :3000  (CRA hot-reload, via sharetribe-scripts start)
  └── dev-backend   :3500  (server/apiServer.js, nodemon)
```

The CRA dev server proxies `/api/*` to `:3500` so the two processes behave as one.

---

## Integration with Pillar 2 — Leaz Backend

**Config variable**: `REACT_APP_LEAZ_BACKEND_API_URL` (default: `http://localhost:3002`)  
**API key variable**: `REACT_APP_LEAZ_BACKEND_API_KEY`  
**Client**: `src/util/leazBackendApi.js`

### Authentication modes

| Mode | When used | Headers sent |
|---|---|---|
| Guest | Unauthenticated users | `X-API-Key` + session token from `GET /api/services/session` |
| Authenticated | Logged-in users | `X-API-Key` + `Authorization: Bearer <sharetribe-access-token>` |

The Sharetribe access token is read from the `st-{clientId}-token` browser cookie set by the SDK. The Leaz backend validates it against Sharetribe's API.

### Endpoints consumed by Pillar 1

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/services/session` | Obtain guest session token |
| `GET` | `/api/services/categories` | Category tree (no auth, cached) |
| Various | `/api/services/*` | Dashboard, bulk listing, coupons, platform discounts |

---

## Integration with Pillar 3 — AI Evaluation API

**Config variable**: `REACT_APP_PRODUCT_API_URL` (default: `http://localhost:3001/api/products`)  
**Client**: `src/util/productApi.js`  
**Entry point page**: `src/containers/AIListingCreationPage/`

### Authentication

Anonymous session token obtained from `GET /session` (Bearer token). The frontend stores the token in memory and retries automatically on 401.

### Endpoints consumed by Pillar 1

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/session` | Get anonymous session token |
| `POST` | `/analyze` | Analyze product images → structured listing data |
| `POST` | `/refine` | Refine analysis with user follow-up answers |
| `POST` | `/regenerate-field` | Re-generate a single listing field |
| `POST` | `/translate-fields` | Translate listing fields to a different locale |
| `POST` | `/recommended-product` | Get category/attribute recommendations |
| `POST` | `/verify-changes` | Check user edits maintain category consistency |
| `POST` | `/optimize-image` | Generate optimized thumbnail |

### Image contract

- **Formats accepted**: JPEG, PNG, WebP, HEIF
- **Max size per image**: 5 MB (4 MB for `/verify-changes`)
- **Images per request**: 1–10
- **EXIF validation**: enforced client-side via `exifreader` (camera-origin check); disable with `REACT_APP_SKIP_EXIF_VALIDATION=true` for testing only

### AI model routing (handled by Pillar 3, documented here for reference)

The frontend sends a `model` field in requests. The expected model identifiers are:

| Model | Role |
|---|---|
| `gemini-2.5-flash` | Primary — fast, cost-efficient |
| `claude-4.5-sonnet` | Fallback — used on transient failures |

The frontend switches to the fallback automatically if a retryable error is received, and persists the successful model for the rest of the session.

### Non-retryable error codes (Pillar 3 must return these)

| Code | Meaning |
|---|---|
| `PROHIBITED_CATEGORY` | Listing rejected by policy |
| `RATE_LIMIT_EXCEEDED` | Hard rate limit hit |
| `LOW_CONFIDENCE` | AI confidence below threshold |
| `INVALID_IMAGE_FORMAT` | Image type not supported |
| `IMAGE_TOO_LARGE` | Image exceeds size limit |

---

## Environment Variables

### Mandatory (app will not start without these)

| Variable | Description |
|---|---|
| `REACT_APP_SHARETRIBE_SDK_CLIENT_ID` | Sharetribe marketplace client ID |
| `SHARETRIBE_SDK_CLIENT_SECRET` | Server-side secret for privileged Sharetribe calls |
| `REACT_APP_MARKETPLACE_NAME` | Display name of the marketplace |
| `REACT_APP_MARKETPLACE_ROOT_URL` | Base URL, e.g. `https://leaz.it` |

### Inter-pillar connections

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_PRODUCT_API_URL` | `http://localhost:3001/api/products` | Pillar 3 base URL |
| `REACT_APP_LEAZ_BACKEND_API_URL` | `http://localhost:3002` | Pillar 2 base URL |
| `REACT_APP_LEAZ_BACKEND_API_KEY` | — | Shared secret; must match `MARKETPLACE_API_KEY` in Pillar 2 |

### External services

| Variable | Description |
|---|---|
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe public key (secret key set in Sharetribe Console) |
| `REACT_APP_MAPBOX_ACCESS_TOKEN` | Mapbox API token for maps and geocoding |
| `REACT_APP_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `REACT_APP_FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook OAuth |
| `REACT_APP_GOOGLE_ANALYTICS_ID` | GA4 measurement ID (must start with `G-`) |
| `REACT_APP_PLAUSIBLE_DOMAINS` | Comma-separated domains for Plausible analytics |
| `REACT_APP_SENTRY_DSN` | Sentry DSN for error tracking |

### Infrastructure & security

| Variable | Description |
|---|---|
| `PORT` | Server listen port (set by PaaS automatically) |
| `REACT_APP_ENV` | `production` or `development` |
| `REACT_APP_CSP` | CSP mode: `report` (log only) or `block` (enforce) |
| `SERVER_SHARETRIBE_TRUST_PROXY` | Set `true` on Heroku/Render (reverse proxy trust) |
| `SERVER_SHARETRIBE_REDIRECT_SSL` | Set `true` to redirect HTTP → HTTPS |
| `REACT_APP_SHARETRIBE_USING_SSL` | Set `true` when serving over HTTPS |
| `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` | Optional HTTP basic auth for staging |
| `PREVENT_DATA_LOADING_IN_SSR` | Set `true` to skip SSR data fetching (reduces cold-start load) |

### Testing / debug only

| Variable | Description |
|---|---|
| `REACT_APP_SKIP_EXIF_VALIDATION` | `true` to accept non-camera images in AI flow |
| `REACT_APP_SHOW_PROHIBITED_ERROR_DETAILS` | `true` to show AI category debug info in UI |

---

## External Services Summary

| Service | Purpose | Credentials location |
|---|---|---|
| **Sharetribe Flex** | Marketplace core (listings, transactions, users) | Console + env vars |
| **Stripe** | Payment processing | Secret in Console; publishable key in env |
| **Mapbox** | Vector maps, geocoding, location search | `REACT_APP_MAPBOX_ACCESS_TOKEN` |
| **Google OAuth** | Social sign-in | `REACT_APP_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Facebook OAuth** | Social sign-in | `REACT_APP_FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| **Google Analytics** | Event tracking (GA4) | `REACT_APP_GOOGLE_ANALYTICS_ID` |
| **Plausible** | Privacy-first analytics (optional) | `REACT_APP_PLAUSIBLE_DOMAINS` |
| **Sentry** | Browser + server error tracking | `REACT_APP_SENTRY_DSN` |

---

## Build & CI

### Build commands

```sh
yarn install       # installs deps + runs patch-package (patches final-form)
yarn build         # build-web (CRA) + build-server (SSR bundle) → build/
yarn start         # runs production server (requires build/)
```

### Build output (`build/`)

```
build/
├── index.html
├── 404.html / 500.html
├── static/         # JS bundles, CSS, images (cache-busted)
├── asset-manifest.json
└── loadable-stats.json  # code-splitting metadata for SSR
```

### CI (CircleCI)

Defined in `.circleci/config.yml`. Pipeline: **format-check → test → build → audit**, running on Node 20.12. All four jobs run in parallel after checkout.

---

## Deployment Recommendations

This is a Node.js SSR app that requires:
- A persistent Node process (no serverless — SSR bundle + in-memory session state)
- Environment variable injection at runtime
- HTTP → HTTPS redirect + reverse proxy trust

### PaaS comparison

| | Render | Railway | Heroku |
|---|---|---|---|
| Free tier | Yes (spins down after inactivity) | $5 credit/mo | No |
| Node SSR fit | Excellent | Excellent | Excellent |
| Auto-deploy from Git | Yes | Yes | Yes |
| Zero-downtime deploys | Yes (paid plans) | Yes | Yes (paid) |
| Custom domains + TLS | Yes | Yes | Yes |
| Log drain / streaming | Built-in | Built-in | Add-on |
| Estimated cost (starter) | ~$7/mo | ~$5–10/mo | ~$7/mo |

**Recommendation: Render**

Render is the best fit for this stack. The environment variable dashboard maps 1:1 to the table above, zero-downtime deploys are included on the starter plan, and the built-in log streaming removes the need for a separate log drain at early stage. Set the following Render-specific env vars:

```
SERVER_SHARETRIBE_TRUST_PROXY=true
SERVER_SHARETRIBE_REDIRECT_SSL=true
REACT_APP_SHARETRIBE_USING_SSL=true
```

---

## Logging Recommendations

### Current state

- **Sentry** (`server/log.js`): captures browser errors, server errors, and CSP violations. Configured via `REACT_APP_SENTRY_DSN`. Falls back to `console.error` when Sentry is not configured.
- **No structured request logging** out of the box.

### Recommendation

| Layer | Tool | Cost |
|---|---|---|
| Error tracking | **Sentry** (keep) | Free up to 5k errors/mo |
| Request-level logs | **pino** (add to server) | Free (stdout) |
| Log aggregation | **Logtail** (via Render log drain) or **Papertrail** | Free up to 1 GB/day on Logtail |

Add `pino` as an Express middleware on `server/index.js` to emit structured JSON to stdout. Render collects stdout automatically; connect a Logtail drain for persistence and search. This keeps the app 12-factor compliant with no code changes to the PaaS config.

---

## AI Service Recommendations

The frontend does not call AI services directly — all AI calls are proxied through Pillar 3. The models used are configured in Pillar 3 and communicated back to the frontend via the `model` field in responses.

### Cost reference (for Pillar 3 budget planning)

| Model | Input tokens | Output tokens | Use case |
|---|---|---|---|
| Gemini 2.5 Flash | ~$0.075/1M | ~$0.30/1M | Primary: fast, cheap image analysis |
| Claude Sonnet 4.5 | ~$3/1M | ~$15/1M | Fallback: complex or retry cases |

**Recommendation**: Keep Gemini 2.5 Flash as primary. The ~40× cost difference makes it the right default; Claude adds resilience for the minority of requests that fail. No changes are needed in Pillar 1.

---

## Local Development

```sh
cp .env-template .env
yarn run config          # interactive env setup (or edit .env manually)
yarn run config-check    # validates mandatory vars
yarn install
yarn dev                 # starts both frontend (:3000) and API server (:3500)
```

Point `REACT_APP_PRODUCT_API_URL` and `REACT_APP_LEAZ_BACKEND_API_URL` to local instances of Pillar 3 and Pillar 2 respectively.
