# 🎨 Custom Sections Guide for CMS Pages

This guide shows you how to add custom React components to CMS pages managed through Sharetribe Console.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Position System](#position-system)
5. [Examples](#examples)
6. [Best Practices](#best-practices)

---

## Overview

**Inject custom React components at any position in your CMS pages!**

You can insert custom sections:
- **Before** all Console sections (position: `-1`)
- **Between** Console sections (position: `0`, `1`, `2`, etc.)
- **After** all Console sections (position: last index)

### Architecture:

```
┌──────────────────────────────────────┐
│  Topbar (sticky)                     │
├──────────────────────────────────────┤
│  ↓ Your Custom Hero (position: -1)  │  ← Injected
├──────────────────────────────────────┤
│  Console Section 1                   │
├──────────────────────────────────────┤
│  ↓ Your Custom Stats (position: 0)  │  ← Injected
├──────────────────────────────────────┤
│  Console Section 2                   │
├──────────────────────────────────────┤
│  Console Section 3                   │
├──────────────────────────────────────┤
│  Footer                              │
└──────────────────────────────────────┘
```

---

## Quick Start

**Want to add a custom hero to the top of a CMS page?**

### 1. Create Your Component

```bash
src/containers/CMSPage/customSections/MyCustomHero.js
```

```javascript
import React from 'react';
import css from './MyCustomHero.module.css';

const MyCustomHero = () => {
  return (
    <div className={css.hero}>
      <h1>Welcome to Our Marketplace!</h1>
      <p>Find amazing items to rent</p>
    </div>
  );
};

export default MyCustomHero;
```

### 2. Register It

Edit `CMSPage.js`:

```javascript
import MyCustomHero from './customSections/MyCustomHero';

const customSectionComponents = {
  myHero: { component: MyCustomHero },  // ← Add this
  customHero: { component: CustomHero },
  // ...
};
```

### 3. Inject It

In `CMSPage.js`, find `injectionConfig` and add:

```javascript
const injectionConfig = {
  'my-page': [
    { position: -1, section: { sectionType: 'myHero', sectionId: 'my-hero-1' } },
  ],
};
```

**Done!** Your custom hero now appears at the top of `/p/my-page` 🎉

---

## Step-by-Step Guide

### Step 1: Create Your Custom Component

Create a new React component in `src/containers/CMSPage/customSections/`:

```javascript
// src/containers/CMSPage/customSections/MySection.js
import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';
import css from './MySection.module.css';

const MySection = () => {
  return (
    <div className={css.root}>
      <h2><FormattedMessage id="MySection.title" /></h2>
      <p>Your custom content here</p>
      <NamedLink name="SearchPage" className={css.button}>
        Browse Items
      </NamedLink>
    </div>
  );
};

export default MySection;
```

**Styling:**

```css
/* src/containers/CMSPage/customSections/MySection.module.css */
@import '../../../styles/customMediaQueries.css';

.root {
  padding: 80px 24px;
  background-color: var(--matterColorBright);
  text-align: center;
}

.button {
  composes: button buttonFont buttonText buttonBorders buttonColors from global;
  padding: 12px 24px;
}
```

---

### Step 2: Register Your Component

Edit `src/containers/CMSPage/CMSPage.js`:

```javascript
// Import your component
import MySection from './customSections/MySection';

// Add to the registry
const customSectionComponents = {
  customHero: { component: CustomHero },
  mySection: { component: MySection },  // ← Add this line
  // Add more here...
};
```

---

### Step 3: Configure Injection

In the same file (`CMSPage.js`), find the `injectionConfig` object and add your injection:

```javascript
const injectionConfig = {
  'new-landing': [
    { position: -1, section: { sectionType: 'customHero', sectionId: 'custom-hero' } },
    { position: 1, section: { sectionType: 'mySection', sectionId: 'my-section-1' } },  // ← Add this
  ],
  
  'about': [
    { position: 0, section: { sectionType: 'mySection', sectionId: 'about-section' } },
  ],
};
```

**Key Points:**
- `sectionType`: Must match the key in `customSectionComponents`
- `sectionId`: Unique identifier for this injection (for React keys)
- `position`: Where to inject (see Position System below)

---

## Position System

Understanding positions is key to placing your sections correctly.

### Position Values:

| Position | Placement | Example Use Case |
|----------|-----------|------------------|
| `-1` | **Before** all Console sections (right after topbar) | Hero sections, site-wide banners |
| `0` | **After** 1st Console section | Stats section after hero |
| `1` | **After** 2nd Console section | CTA between content blocks |
| `2` | **After** 3rd Console section | Testimonials before footer |
| `N` | **After** (N+1)th Console section | Dynamic placement |

### Visual Guide:

```
Topbar
├─ position: -1  ← Before all Console sections
├─ Console Section 1
├─ position: 0   ← After Console Section 1
├─ Console Section 2
├─ position: 1   ← After Console Section 2
├─ Console Section 3
├─ position: 2   ← After Console Section 3
└─ Footer
```

### Example Configuration:

```javascript
'new-landing': [
  // Hero at the very top
  { position: -1, section: { sectionType: 'customHero', sectionId: 'hero' } },
  
  // Stats after 2nd Console section
  { position: 1, section: { sectionType: 'statsSection', sectionId: 'stats' } },
  
  // CTA after 4th Console section
  { position: 3, section: { sectionType: 'ctaSection', sectionId: 'cta' } },
],
```

---

## Examples

### Example 1: Custom Hero with Search

Already implemented! Check out:
- `src/containers/CMSPage/customSections/CustomHero.js`
- `src/containers/CMSPage/customSections/CustomHero.module.css`

**Features:**
- Background image
- Search form integration
- Call-to-action buttons
- Fully responsive

---

### Example 2: Stats Section Between Content

Create `StatsSection.js`:

```javascript
import React from 'react';
import css from './StatsSection.module.css';

const StatsSection = () => {
  return (
    <div className={css.root}>
      <div className={css.stat}>
        <h3>10,000+</h3>
        <p>Active Listings</p>
      </div>
      <div className={css.stat}>
        <h3>50,000+</h3>
        <p>Happy Users</p>
      </div>
      <div className={css.stat}>
        <h3>100+</h3>
        <p>Cities</p>
      </div>
    </div>
  );
};

export default StatsSection;
```

Register and inject:

```javascript
// In CMSPage.js
import StatsSection from './customSections/StatsSection';

const customSectionComponents = {
  customHero: { component: CustomHero },
  statsSection: { component: StatsSection },  // Register
};

const injectionConfig = {
  'new-landing': [
    { position: -1, section: { sectionType: 'customHero', sectionId: 'hero' } },
    { position: 0, section: { sectionType: 'statsSection', sectionId: 'stats' } },  // Inject
  ],
};
```

---

### Example 3: Newsletter Signup at Bottom

```javascript
// NewsletterSection.js
import React, { useState } from 'react';
import { PrimaryButton } from '../../../components';
import css from './NewsletterSection.module.css';

const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log('Newsletter signup:', email);
  };
  
  return (
    <div className={css.root}>
      <h2>Stay Updated</h2>
      <p>Get the latest deals delivered to your inbox</p>
      <form onSubmit={handleSubmit} className={css.form}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={css.input}
        />
        <PrimaryButton type="submit">Subscribe</PrimaryButton>
      </form>
    </div>
  );
};

export default NewsletterSection;
```

Inject at the bottom (after all Console sections):

```javascript
const injectionConfig = {
  'new-landing': [
    { position: -1, section: { sectionType: 'customHero', sectionId: 'hero' } },
    { position: 999, section: { sectionType: 'newsletter', sectionId: 'newsletter' } },  // Large number = bottom
  ],
};
```

---

## Best Practices

### ✅ Do:

1. **Use semantic component names:**
   ```javascript
   customHero: { component: CustomHero }  // Good
   section1: { component: Section1 }      // Bad
   ```

2. **Keep unique section IDs:**
   ```javascript
   { sectionId: 'custom-hero-new-landing' }  // Good
   { sectionId: 'hero' }                     // Risky if reused
   ```

3. **Use CSS Modules for styling:**
   ```javascript
   import css from './MySection.module.css';
   <div className={css.root}>...</div>
   ```

4. **Use FormattedMessage for i18n:**
   ```javascript
   <FormattedMessage id="MySection.title" />
   ```

5. **Use NamedLink for internal navigation:**
   ```javascript
   <NamedLink name="SearchPage">Browse</NamedLink>
   ```

6. **Add helpful comments in config:**
   ```javascript
   'new-landing': [
     // Hero at top with search
     { position: -1, section: { sectionType: 'customHero', sectionId: 'hero' } },
   ],
   ```

---

### ❌ Don't:

1. **Don't modify Console sections** - They're managed in Console
2. **Don't use hardcoded URLs** - Use `NamedLink` or `createResourceLocatorString`
3. **Don't hardcode text** - Use translations (`FormattedMessage`)
4. **Don't use inline styles** - Use CSS Modules
5. **Don't forget responsive design** - Test on mobile!

---

## Common Patterns

### Pattern 1: Conditional Rendering

```javascript
const MySection = ({ currentUser }) => {
  if (!currentUser) {
    return (
      <div className={css.root}>
        <h2>Join Our Community</h2>
        <NamedLink name="SignupPage">Sign Up Now</NamedLink>
      </div>
    );
  }
  
  return (
    <div className={css.root}>
      <h2>Welcome back, {currentUser.attributes.profile.displayName}!</h2>
      <NamedLink name="ManageListingsPage">Manage Your Listings</NamedLink>
    </div>
  );
};
```

### Pattern 2: Using Context

```javascript
import { useConfiguration } from '../../../context/configurationContext';

const MySection = () => {
  const config = useConfiguration();
  const marketplaceName = config.marketplaceName;
  
  return (
    <div className={css.root}>
      <h2>Welcome to {marketplaceName}</h2>
    </div>
  );
};
```

### Pattern 3: API Integration

```javascript
import React, { useState, useEffect } from 'react';

const FeaturedListings = () => {
  const [listings, setListings] = useState([]);
  
  useEffect(() => {
    // Fetch featured listings
    fetchFeaturedListings().then(setListings);
  }, []);
  
  return (
    <div className={css.root}>
      {listings.map(listing => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
};
```

---

## Troubleshooting

### Issue: Section not appearing

**Check:**
1. Component registered in `customSectionComponents`?
2. Injection configured in `injectionConfig` for the correct `pageId`?
3. `sectionType` matches the key in `customSectionComponents`?
4. Visiting the correct URL? (e.g., `/p/new-landing`)

---

### Issue: Section appears in wrong place

**Check:**
1. `position` value correct?
2. Remember: `position: -1` = before all sections
3. Console sections count starts at 0

---

### Issue: Styling not working

**Check:**
1. CSS Module imported correctly?
2. Using `className={css.yourClass}`?
3. CSS custom properties (variables) defined in theme?

---

## File Structure

```
src/containers/CMSPage/
├── CMSPage.js                    ← Main config (edit here!)
├── customSections/
│   ├── CustomHero.js             ← Your components
│   ├── CustomHero.module.css
│   ├── InjectedStatsSection.js
│   ├── InjectedStatsSection.module.css
│   └── [YourSection].js          ← Add new ones here
├── CustomSectionsWrapper.js      ← (Legacy - not used)
└── CUSTOM_SECTIONS_GUIDE.md      ← This file
```

---

## Summary

**To add a custom section to a CMS page:**

1. **Create** your React component in `customSections/`
2. **Register** it in `CMSPage.js` → `customSectionComponents`
3. **Inject** it in `CMSPage.js` → `injectionConfig`
4. **Test** by visiting `/p/your-page-id`

**That's it!** 🎉

---

## Need Help?

- Check existing examples: `CustomHero.js`, `InjectedStatsSection.js`
- Review PageBuilder docs: `src/containers/PageBuilder/README.md`
- Test on different screen sizes
- Use browser DevTools to inspect layout

Happy coding! 🚀
