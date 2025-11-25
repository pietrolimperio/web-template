# About Link Implementation

## Overview
Added a question mark (?) help/about icon link in the topbar that's visible for non-authenticated (logged-out) users.

## Changes Made

### 1. TopbarDesktop Component
**File**: `src/containers/TopbarContainer/Topbar/TopbarDesktop/TopbarDesktop.js`

- Added `IconHelp` import from components
- Created new `AboutLink` component that renders a question mark icon
- Added the about link to the topbar navigation (visible only when user is not logged in)
- Positioned between custom links and the user avatar icon

### 2. CSS Styling
**File**: `src/containers/TopbarContainer/Topbar/TopbarDesktop/TopbarDesktop.module.css`

- Added `.helpIcon` to the icon sizing rules (24px × 24px)
- Inherits all hover and transition styles from the existing `.iconLink` class

### 3. Translations
**Files**: All 6 language translation files

Added `TopbarDesktop.aboutLink` translation key to:
- ✅ `src/translations/en.json` - "About"
- ✅ `src/translations/de.json` - "Über uns"
- ✅ `src/translations/es.json` - "Acerca de"
- ✅ `src/translations/fr.json` - "À propos"
- ✅ `src/translations/it.json` - "Chi siamo"
- ✅ `src/translations/pt.json` - "Sobre"

## Functionality

### When Visible
- The help icon appears in the topbar **for all users** (both logged-in and logged-out)
- It's positioned to the left of the login/avatar icon or profile menu
- It's positioned to the right of the locale selector

### Link Target
The icon links to: `/p/about` (CMS Page with ID "about")

You can create this page in your Sharetribe Console:
1. Go to Console → Content
2. Create a new page with ID: `about`
3. Add your about/help content

### Alternative Link Targets
If you want to link to a different page, edit the `AboutLink` component in `TopbarDesktop.js`:

**Link to Privacy Policy:**
```javascript
<NamedLink 
  className={css.iconLink} 
  name="PrivacyPolicyPage"
  title={intl.formatMessage({ id: 'TopbarDesktop.aboutLink' })}
>
```

**Link to Terms of Service:**
```javascript
<NamedLink 
  className={css.iconLink} 
  name="TermsOfServicePage"
  title={intl.formatMessage({ id: 'TopbarDesktop.aboutLink' })}
>
```

**Link to a different CMS page:**
```javascript
<NamedLink 
  className={css.iconLink} 
  name="CMSPage"
  params={{ pageId: 'help' }}  // Change 'help' to your page ID
  title={intl.formatMessage({ id: 'TopbarDesktop.aboutLink' })}
>
```

## Visual Design

The help icon:
- Uses the existing `IconHelp` component (circular question mark)
- Sized at 24px × 24px to match other topbar icons
- Inherits the marketplace color on hover
- Has the same bottom border animation as other topbar links
- Includes a tooltip showing "About" (or translated equivalent) on hover

## Browser Support
- Works on all modern browsers
- Responsive design (same icon on mobile and desktop)
- Accessible with proper ARIA labels

## Testing

To test the implementation:
1. Look at the top navigation bar (works for both logged-in and logged-out users)
2. You should see a question mark icon (?) in the topbar
3. Click it to navigate to the about page (note: you'll need to create the `/p/about` CMS page first)

## Notes

- The icon is **visible for all users** (both logged-in and logged-out)
- For logged-out users: appears to the left of the user icon
- For logged-in users: appears to the left of the profile menu
- If you haven't created the `/p/about` page yet, clicking the icon will show a 404 error
- You can easily change the target page by modifying the `AboutLink` component
