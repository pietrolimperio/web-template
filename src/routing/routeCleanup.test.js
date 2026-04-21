/**
 * Tests that verify the dead-code cleanup described in docs/dead-code-audit.md.
 *
 * Sections covered:
 *  - pageDataLoadingAPI no longer exposes LandingPage
 *  - Legacy auth routes (/original-signup, /old-signup/:userType) no longer carry loadData
 *  - Core active routes still resolve correctly
 */
import getPageDataLoadingAPI from '../containers/pageDataLoadingAPI';
import routeConfiguration from './routeConfiguration';

const layoutConfig = {
  searchPage: { variantType: 'map' },
  listingPage: { variantType: 'carousel' },
};

// ---------------------------------------------------------------------------
// pageDataLoadingAPI
// ---------------------------------------------------------------------------

describe('pageDataLoadingAPI', () => {
  const api = getPageDataLoadingAPI();

  it('exposes LandingPage loadData', () => {
    expect(typeof api.LandingPage?.loadData).toBe('function');
  });

  it('exposes AuthenticationPage loadData — still needed for /confirm (OAuth IdP)', () => {
    expect(typeof api.AuthenticationPage?.loadData).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// routeConfiguration — legacy auth routes converted to redirects
// ---------------------------------------------------------------------------

describe('routeConfiguration — legacy auth route cleanup', () => {
  const routes = routeConfiguration(layoutConfig);

  it('/original-signup is a redirect — no loadData after cleanup', () => {
    const route = routes.find(r => r.name === 'OriginalSignupPage');
    expect(route).toBeDefined();
    expect(route.loadData).toBeUndefined();
  });

  it('/old-signup/:userType is a redirect — no loadData after cleanup', () => {
    const route = routes.find(r => r.name === 'SignupForUserTypePage');
    expect(route).toBeDefined();
    expect(route.loadData).toBeUndefined();
  });

  it('/old-login route exists (redirect to /login)', () => {
    const route = routes.find(r => r.name === 'OldLoginPage');
    expect(route).toBeDefined();
    expect(route.path).toBe('/old-login');
    expect(route.loadData).toBeUndefined();
  });

  it('/old-signup route exists (redirect to /signup)', () => {
    const route = routes.find(r => r.name === 'OldSignupPage');
    expect(route).toBeDefined();
    expect(route.path).toBe('/old-signup');
    expect(route.loadData).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// routeConfiguration — core active routes are unaffected
// ---------------------------------------------------------------------------

describe('routeConfiguration — core routes still intact', () => {
  const routes = routeConfiguration(layoutConfig);

  it('root / is served by LandingPage with loadData', () => {
    const route = routes.find(r => r.path === '/');
    expect(route).toBeDefined();
    expect(route.name).toBe('LandingPage');
    expect(typeof route.loadData).toBe('function');
  });

  it('/login is served by LoginPage', () => {
    const route = routes.find(r => r.path === '/login');
    expect(route).toBeDefined();
    expect(route.name).toBe('LoginPage');
  });

  it('/signup is served by SignupPage', () => {
    const route = routes.find(r => r.path === '/signup');
    expect(route).toBeDefined();
    expect(route.name).toBe('SignupPage');
  });

  it('/l/:slug/:id is served by ProductPage', () => {
    const route = routes.find(r => r.name === 'ProductPage');
    expect(route).toBeDefined();
    expect(route.path).toBe('/l/:slug/:id');
    expect(typeof route.loadData).toBe('function');
  });

  it('/confirm still exists — required for OAuth IdP flow', () => {
    const route = routes.find(r => r.name === 'ConfirmPage');
    expect(route).toBeDefined();
    expect(route.path).toBe('/confirm');
  });
});
