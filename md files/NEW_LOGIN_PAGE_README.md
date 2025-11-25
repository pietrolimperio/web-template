# New Login Page

## Overview
A modern, Webflow-inspired login page has been created at the `/new-login` endpoint.

## Features

### Design
- **Split-screen layout** (desktop): Left side features a background image, right side contains the login form with logo
- **Mobile-responsive**: Single column layout on mobile devices
- **Modern UI elements**:
  - Background image on left side
  - Centered logo at the top of the form
  - Clean, minimalist form design
  - Smooth animations and transitions
  - Rounded input fields with marketplace color focus states
  - Marketplace color button with hover effects
  - Marketplace color links throughout

### Functionality
- Email and password authentication
- Form validation
- Password recovery link
- Sign-up link for new users
- Link back to the classic login page
- Automatic redirect after successful login
- Error handling with user-friendly messages

## Files Created

### Component Files
- `src/containers/NewLoginPage/NewLoginPage.js` - Main component with authentication logic
- `src/containers/NewLoginPage/NewLoginPage.module.css` - Modern styling with gradients and animations
- `src/containers/NewLoginPage/index.js` - Export file

### Route Configuration
- Added route in `src/routing/routeConfiguration.js`:
  - Path: `/new-login`
  - Name: `NewLoginPage`

### Translations
Added translation keys to ALL 6 language files:
- `src/translations/en.json` (English)
- `src/translations/de.json` (German)
- `src/translations/es.json` (Spanish)
- `src/translations/fr.json` (French)
- `src/translations/it.json` (Italian) [[memory:10959734]]
- `src/translations/pt.json` (Portuguese)

Translation keys include:
- `NewLoginPage.title`
- `NewLoginPage.schemaTitle`
- `NewLoginPage.welcomeMessage`
- `NewLoginPage.loginTitle`
- `NewLoginPage.loginSubtitle`
- `NewLoginPage.emailLabel`
- `NewLoginPage.emailPlaceholder`
- `NewLoginPage.emailRequired`
- `NewLoginPage.emailInvalid`
- `NewLoginPage.passwordLabel`
- `NewLoginPage.passwordPlaceholder`
- `NewLoginPage.passwordRequired`
- `NewLoginPage.forgotPassword`
- `NewLoginPage.logIn`
- `NewLoginPage.dontHaveAccount`
- `NewLoginPage.signUp`
- `NewLoginPage.backToOldLogin`
- `NewLoginPage.loginFailed`

## Usage

### Accessing the Page
Navigate to: `http://localhost:3000/new-login`

### Key Features
1. **Background Image**: Custom background image on the left side (desktop only)
2. **Logo Display**: Marketplace logo centered at the top of the form
3. **Form Validation**: Real-time validation for email and password fields
4. **Responsive Design**: Optimized for mobile, tablet, and desktop
5. **Marketplace Branding**: All interactive elements use marketplace color
6. **Accessibility**: Proper labels, ARIA attributes, and semantic HTML

### Design Inspiration
The design is inspired by Webflow's modern login interface with:
- Clean typography
- Generous white space
- Smooth transitions
- Marketplace branding colors
- Professional, trustworthy appearance
- Custom background imagery

## Integration

### Authentication
The new login page uses the existing Redux authentication system:
- Connects to the same `login` action
- Uses the same authentication state management
- Redirects work identically to the original login page
- Error handling is consistent with the existing system

### Navigation
Users can:
- Navigate to `/new-login` directly
- Click "Back to classic login" to return to `/login`
- Access password recovery via the "Forgot password?" link
- Go to sign-up page via the "Sign up" link

## Customization

### Background Image
To change the background image, replace the image file path in `NewLoginPage.module.css`:
```css
.leftSide {
  background-image: url('../../assets/your-image.jpg');
}
```

### Logo
To change the logo, replace `logo.png` in the `src/assets/` folder, or update the import in `NewLoginPage.js`:
```javascript
import logoImage from '../../assets/your-logo.png';
```

### Colors
All colors automatically use your marketplace color configuration. The following elements use marketplace color:
- Login button background
- Forgot password link
- Sign up link
- Input field focus border and shadow

### Branding
The marketplace name is automatically pulled from the configuration and used in the page title and logo alt text.

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive breakpoints at 768px and 1024px

## Next Steps
- Test the login flow in different browsers
- Customize colors to match your brand
- Add social login buttons if needed
- Consider adding a "Remember me" checkbox
- Monitor analytics to compare with classic login page
