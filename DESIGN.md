# Design System Strategy: Editorial P2P Excellence

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"The Kinetic Curator."** In a peer-to-peer marketplace, trust is often mistakenly equated with "boring" or "standard." This system rejects the generic template look in favor of a sophisticated, editorial-inspired experience.

We move beyond the basic "Orange and White" brief by introducing **intentional asymmetry, depth layering, and a high-contrast typographic hierarchy.** The goal is to make the user feel like they are interacting with a premium concierge service, rather than just another listing site. By utilizing breathing room (negative space) and overlapping containers, we create a rhythmic flow that guides the user through the rental lifecycle with confidence and ease.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The color palette uses its Primary Orange (`#FF5722`) as a precision tool for action, while the neutral foundation provides the editorial "canvas."

* **The "No-Line" Rule:** We do not use 1px solid borders to section off content. Traditional borders create visual noise. Instead, boundaries must be defined solely through background color shifts. A `surface-container-low` section sitting against a `surface` background provides all the separation a modern user needs.
* **Surface Hierarchy & Nesting:** Treat the UI as a physical stack of premium materials.
* **Level 0 (Base):** `surface` (#f9f9f9) – The background.
* **Level 1 (Sections):** `surface-container-low` (#f3f3f3) – Large content blocks.
* **Level 2 (Interaction):** `surface-container-lowest` (#ffffff) – Individual cards and input fields.
* **The "Glass & Gradient" Rule:** Floating elements (like navigation bars or hovering price tags) should use Glassmorphism. Utilize semi-transparent versions of `surface` with a `backdrop-blur` of 12px-20px.
* **Signature Textures:** Main CTAs should not be flat. Use a subtle linear gradient from `primary` (#b02f00) to `primary-container` (#ff5722) at a 135° angle to give buttons a tactile, high-end "glow" that invites the click.

---

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with readability.

* **Display & Headlines (Manrope):** Chosen for its geometric modernism and slightly wider stance. `display-lg` through `headline-sm` should be used with tight letter-spacing (-0.02em) to create a bold, "magazine-style" header presence.
* **Body & Labels (Inter):** The workhorse. Inter provides exceptional legibility at small sizes. Use `body-md` for standard descriptions and `label-md` for metadata.
* **The Hierarchy Goal:** By pairing a large, bold Manrope headline with a significantly smaller, clean Inter body text, we create a high-contrast visual scale that signals premium quality and clear information architecture.

---

## 4. Elevation & Depth
In this system, elevation is a feeling, not a drop-shadow effect.

* **Tonal Layering:** Avoid shadows for static cards. Achieve "lift" by placing a `surface-container-lowest` (pure white) card on top of a `surface-container-low` background.
* **Ambient Shadows:** For active states (e.g., a card being dragged or a dropdown opening), use "Ambient Shadows." These are extra-diffused: `0px 12px 32px` with a 6% opacity of `on-surface` (#1a1c1c).
* **The "Ghost Border":** For elements like the image upload zones seen in the reference, use a "Ghost Border." Use the `outline-variant` (#e4beb4) at 20% opacity. It provides a container without creating a hard visual stop.
* **Glassmorphism Depth:** When using glass layers, the background "bleed" ensures the UI feels like a single, cohesive ecosystem rather than a collection of disconnected boxes.

---

## 5. Components

### Buttons
* **Primary:** Linear gradient (`primary` to `primary-container`), `roundness-full`, `headline-sm` for text.
* **Secondary:** `surface-container-highest` background with `primary` text. No border.
* **Tertiary:** Transparent background, `on-surface` text, with an underline that appears only on hover.

### Cards & Lists
* **The Rule:** **Strictly forbid divider lines.**
* Separate list items using `spacing-4` (1rem) of vertical white space or by alternating background tints (`surface` to `surface-container-low`).
* Cards use `roundness-xl` (1.5rem) to echo the friendly, modern personality of the marketplace.

### Input Fields
* **Style:** `surface-container-lowest` background with a `ghost border` (20% `outline-variant`).
* **Focus State:** The border transitions to 100% `primary` opacity, and the card receives an `ambient shadow`.

### Specialized Marketplace Components
* **Status Progress Bars:** As seen in the reference images, use `primary` for active loading and a high-contrast green for "Complete." Keep these slim (4px height) to remain minimalist.
* **The "AI Agent" Container:** Use a dedicated `primary-fixed` (#ffdbd1) background for AI-assisted sections to distinguish them from standard user inputs.

---

## 6. Do's and Don'ts

### Do
* **DO** use whitespace as a functional tool. If an element feels cramped, increase the spacing by one tier in the scale (e.g., from `spacing-6` to `spacing-8`).
* **DO** use overlapping elements. A product image that slightly breaks the container of its card creates a bespoke, non-template feel.
* **DO** ensure accessibility. Ensure that `on-primary` text on `primary` backgrounds maintains a high contrast ratio.

### Don't
* **DON'T** use 100% black (#000000). Use `on-surface` (#1a1c1c) for all text to maintain a softer, premium look.
* **DON'T** use standard 1px borders. If you feel you need a line, try using a background color shift instead.
* **DON'T** use sharp corners. Every interaction point should utilize the `roundness` scale, specifically `md` or higher, to maintain the "Soft Minimalist" aesthetic.

---

## 7. Implementation in this repo
Design tokens live primarily in `src/styles/marketplaceDefaults.css` as CSS custom properties (e.g. `--colorSurface`, `--colorOnSurface`, `--ghostBorderInput`, `--boxShadowAmbient`, `--gradientPrimaryCTA`). Brand orange defaults are aligned with `#FF5722` in `src/config/configBranding.js`. Display typography uses **Manrope** (linked from Google Fonts in `public/index.html`); UI body text uses **Inter** (existing self-hosted faces).

**Legacy “matter” aliases:** `--matterColor` is main text on light UI (`--colorOnSurface`). **`--matterColorMuted`** is for secondary/helper copy on light backgrounds (breadcrumbs, fine print, metadata). **`--matterColorAnti`** is white / the lightest surface—use it for backgrounds, for mixing into borders, or for text **only** on genuinely dark backdrops—not for grey body text on white cards.

**Topbar (glass, single layer):** CSS variables `--topbarGlassBackground` (78% `surface-container-lowest` in srgb `color-mix`), `--topbarGlassBackdropBlur`, `--topbarGlassHairline`. Global class **`.marketplaceLayoutTopbar`** applies that glass once on the layout `<header>` (or equivalent root). Inner topbar shells (`Topbar` mobile `.container`, `TopbarDesktop` `.root`) stay **transparent** so blur/tint is not doubled. Desktop search: the `<form>` with `.searchLink` uses **transparent** background so the search strip matches the header—no second `color-mix` well. Pages without that header (e.g. Search grid/map) compose `.marketplaceLayoutTopbar` on the topbar root; Edit Listing uses `topbarGlassHost` on `TopbarContainer`. See §8 for the full file-level list.

---

## 8. Implementation changelog (this fork)

Editorial design pass beyond the topbar alone: tokens, typography, contrast, and key screens. Grouped by area.

### Global tokens & branding
- **`src/styles/marketplaceDefaults.css`:** Surface hierarchy, editorial neutrals, ghost inputs, ambient shadows, `--gradientPrimaryCTA`, modal/button/input patterns, **`--matterColorMuted`**, matter alias semantics; **topbar glass** variables and **`.marketplaceLayoutTopbar`**.
- **`src/config/configBranding.js`:** Primary aligned with **`#FF5722`**.
- **`public/index.html`:** **Manrope** (Google Fonts) for display/headlines.

### Topbar & navigation
- **`LayoutSingleColumn.module.css`**, **`NewLandingPage.module.css`**, **`LayoutSideNavigation.module.css`**, **`PageBuilder.module.css`:** `.topbar` composes **`marketplaceLayoutTopbar`**.
- **`SearchPage.module.css`:** `.topbar` composes the same (Search has no single-column layout wrapper).
- **`Topbar.module.css`**, **`TopbarDesktop.module.css`:** Inner bar transparent (glass only on parent).
- **`TopbarSimplified.module.css`:** Uses `--topbarGlass*` variables.
- **`EditListingPage`:** `topbarGlassHost` + transparent `.mobileTopbar`; **`InboxPage`:** transparent `.mobileTopbar`.
- **`TopbarSearchForm.module.css`:** Desktop icon/input (and `.icon`) transparent; **`.keywordSearchWrapper`** flex stretch for one row.
- **`TopbarDesktop.module.css`:** **`.searchLink`** transparent; scroll-in animation kept in one rule block.

### Contrast & copy color (light UI)
- Broad replacement of **`--matterColorAnti`** with **`--matterColorMuted`** where text sits on light surfaces (Product, Preview, AI flows, signup, locale selector, listing pages, etc.) so secondary copy stays readable and semantically correct.

### Product & listing presentation
- **`ProductPage.module.css`:** Main image / thumbs use **`--colorSurface`** (not peach accent); mobile breadcrumb without peach pill background.
- **`OwnerCard.module.css`:** Insurance line uses readable **`--matterColor`** (or muted where appropriate).

### Image upload
- **`ImageUpload.js` / `ImageUpload.module.css`:** Minimal empty state; drag target on root; removed heavy empty-zone styling / `emptyDropZoneActive` where simplified.

### AI listing creation
- **`AIListingCreationPage.module.css`:** **`.content`** (and related layout wash) on **`--colorSurface`**; muted text classes aligned with **`--matterColorMuted`**.

### Preview listing
- **`PreviewListingPage.module.css`:** Gallery/thumbnails/upload tile surfaces on **`--colorSurface`**; drawer **Annulla** secondary styling in **`.drawerActions`**; exception calendar **Annulla** (`.cancelButton`) aligned with **`.exceptionCalendar`** / bright surface.

### Modals & CMS
- **`Modal.module.css`** (and related modal globals): Editorial modal treatment where adjusted.
- **`CustomHero.module.css`:** **`.searchForm`** background/radius/shadow on the class applied to the real `<form>` (not a nested `form` selector).

### Documentation
- **`DESIGN.md`:** This strategy doc and implementation notes (§7–§8).
