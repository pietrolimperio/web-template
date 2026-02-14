/**
 * Leaz Backend API Client
 *
 * Interfaces with the custom Leaz backend (dashboard, bulk listing,
 * coupons, platform discounts, etc.) that integrates Sharetribe Integration API.
 *
 * Two authentication modes:
 * 1. Guest: Session token from GET /api/services/session (requires X-API-Key)
 *    - Use for unauthenticated users (same pattern as Product/AI API)
 * 2. Authenticated: X-API-Key + Sharetribe access token
 *    - Use for logged-in users; backend verifies token via Sharetribe API
 */

import Cookies from 'js-cookie';
import appSettings from '../config/settings';

const BASE_URL = process.env.REACT_APP_LEAZ_BACKEND_API_URL || 'http://localhost:3002';
const API_KEY = process.env.REACT_APP_LEAZ_BACKEND_API_KEY || '';
const API_PREFIX = '/api/services';

/** Buffer in seconds before token expiry to consider it "expired" and refresh */
const TOKEN_EXPIRY_BUFFER_SEC = 60;

/** Sharetribe auth API base URL (from SDK config) */
const getSharetribeAuthBaseUrl = () => {
  const base = appSettings?.sdk?.baseUrl || 'https://flex-api.sharetribe.com';
  return `${base.replace(/\/$/, '')}/v1`;
};

/** localStorage key for Leaz backend guest session token */
const LEAZ_BACKEND_SESSION_TOKEN_KEY = 'leaz_backend_session_token';

/**
 * Cookie key for Sharetribe token (browserCookieStore format)
 * @see sharetribe-flex-sdk browser_cookie_store.js
 */
const getSharetribeCookieKey = () => {
  const clientId = appSettings?.sdk?.clientId;
  return clientId ? `st-${clientId}-token` : null;
};

/**
 * Get Sharetribe token object from cookie (when user is logged in)
 * @returns {{ access_token: string, refresh_token?: string } | null}
 */
const getSharetribeTokenObject = () => {
  const key = getSharetribeCookieKey();
  if (!key || typeof window === 'undefined') return null;
  return Cookies.getJSON(key);
};

/**
 * Get Sharetribe access token from cookie (when user is logged in)
 * @returns {string|null} access_token or null if not logged in
 */
export const getSharetribeAccessToken = () => {
  const tokenData = getSharetribeTokenObject();
  return tokenData?.access_token ?? null;
};

/**
 * Decode JWT payload (no verification, just read exp claim)
 * @param {string} token - JWT string
 * @returns {{ exp?: number } | null}
 */
const decodeJwtPayload = token => {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

/**
 * Check if Sharetribe access token is expired or about to expire
 * @param {string} accessToken
 * @returns {boolean}
 */
const isSharetribeTokenExpired = accessToken => {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec + TOKEN_EXPIRY_BUFFER_SEC;
};

/**
 * Refresh Sharetribe token via auth API and update cookie
 * @param {string} refreshToken
 * @returns {Promise<string>} new access_token
 */
const refreshSharetribeToken = async refreshToken => {
  const authUrl = `${getSharetribeAuthBaseUrl()}/auth/token`;
  const clientId = appSettings?.sdk?.clientId;
  if (!clientId) {
    throw new Error('Leaz backend: Sharetribe client ID not configured');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'user',
  });

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', Accept: 'application/json' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sharetribe token refresh failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data?.access_token) {
    throw new Error('Sharetribe refresh response missing access_token');
  }

  // Update cookie with new token (same format as SDK tokenStore)
  const cookieKey = getSharetribeCookieKey();
  if (cookieKey) {
    const existing = getSharetribeTokenObject() || {};
    const newTokenData = { ...existing, ...data };
    Cookies.set(cookieKey, JSON.stringify(newTokenData), {
      expires: 30,
      secure: !!appSettings?.usingSSL,
    });
  }

  return data.access_token;
};

/**
 * Ensures we have a valid (non-expired) Sharetribe access token.
 * If expired, refreshes it via Sharetribe auth API and updates the cookie.
 * @returns {Promise<string|null>} valid access_token or null if not logged in
 */
export async function ensureSharetribeTokenValid() {
  const tokenData = getSharetribeTokenObject();
  if (!tokenData?.access_token) return null;

  if (!isSharetribeTokenExpired(tokenData.access_token)) {
    return tokenData.access_token;
  }

  if (!tokenData.refresh_token) {
    return null; // Cannot refresh, user may need to re-login
  }

  return refreshSharetribeToken(tokenData.refresh_token);
}

// --- Guest session (same pattern as productApi) ---

/** In-memory guest session token (synced with localStorage) */
let guestSessionToken = null;

/**
 * Clears the guest session token from memory and localStorage.
 * Call when you get 401 or "invalid/expired session" to start fresh.
 */
export function clearLeazBackendGuestToken() {
  guestSessionToken = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEAZ_BACKEND_SESSION_TOKEN_KEY);
  }
}

/**
 * Fetches guest session token from GET /api/services/session
 * Caches result in memory and localStorage for subsequent guest requests.
 * @returns {Promise<string>} session token
 */
export async function ensureGuestToken() {
  // Check memory first
  if (guestSessionToken) return guestSessionToken;

  // Then localStorage (persists across page reloads)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LEAZ_BACKEND_SESSION_TOKEN_KEY);
    if (stored) {
      guestSessionToken = stored;
      return guestSessionToken;
    }
  }

  if (!API_KEY) {
    throw new Error('Leaz backend: REACT_APP_LEAZ_BACKEND_API_KEY is not configured (required for guest session)');
  }

  const url = `${BASE_URL}${API_PREFIX}/session`;
  const headers = { 'X-API-Key': API_KEY };
  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Leaz backend session failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data?.token) {
    throw new Error('Leaz backend session response missing token');
  }

  guestSessionToken = data.token;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(LEAZ_BACKEND_SESSION_TOKEN_KEY, guestSessionToken);
  }
  return guestSessionToken;
}

/**
 * Guest POST request (uses session token from /session)
 * @param {string} path - endpoint path
 * @param {Object} body - JSON body
 * @param {RequestInit} options - extra fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export async function requestGuestPost(path, body, options = {}) {
  const token = await ensureGuestToken();
  const url = `${BASE_URL}${API_PREFIX}/${path.replace(/^\//, '')}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...options,
  });

  if (response.status === 401) {
    clearLeazBackendGuestToken();
    throw new Error('Leaz backend: session expired or invalid');
  }

  if (!response.ok) {
    const errText = await response.text();
    let errMsg;
    try {
      const err = JSON.parse(errText);
      errMsg = err.message || err.error || errText;
    } catch {
      errMsg = errText;
    }
    throw new Error(`Leaz backend request failed: ${response.status} - ${errMsg}`);
  }

  return response.json();
}

/**
 * Guest GET request (uses session token from /session)
 * @param {string} path - endpoint path
 * @param {RequestInit} options - extra fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export async function requestGuest(path, options = {}) {
  const token = await ensureGuestToken();
  const url = `${BASE_URL}${API_PREFIX}/${path.replace(/^\//, '')}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: 'GET',
    headers,
    ...options,
  });

  if (response.status === 401) {
    clearLeazBackendGuestToken();
    throw new Error('Leaz backend: session expired or invalid');
  }

  if (!response.ok) {
    const errText = await response.text();
    let errMsg;
    try {
      const err = JSON.parse(errText);
      errMsg = err.message || err.error || errText;
    } catch {
      errMsg = errText;
    }
    throw new Error(`Leaz backend request failed: ${response.status} - ${errMsg}`);
  }

  return response.json();
}

/**
 * Authenticated POST request (X-API-Key + Sharetribe token)
 * User must be logged in.
 * @param {string} path - endpoint path
 * @param {Object} body - JSON body
 * @param {RequestInit} options - extra fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export async function requestAuthenticatedPost(path, body, options = {}) {
  const sharetribeToken = await ensureSharetribeTokenValid();
  if (!sharetribeToken) {
    throw new Error('Leaz backend: user must be logged in for authenticated requests');
  }

  if (!API_KEY) {
    throw new Error('Leaz backend: REACT_APP_LEAZ_BACKEND_API_KEY is not configured (required for authenticated calls)');
  }

  const url = `${BASE_URL}${API_PREFIX}/${path.replace(/^\//, '')}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    Authorization: `Bearer ${sharetribeToken}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg;
    try {
      const err = JSON.parse(errText);
      errMsg = err.message || err.error || errText;
    } catch {
      errMsg = errText;
    }
    throw new Error(`Leaz backend authenticated request failed: ${response.status} - ${errMsg}`);
  }

  return response.json();
}

/**
 * Authenticated GET request (Sharetribe token)
 * User must be logged in.
 * @param {string} path - endpoint path
 * @param {RequestInit} options - extra fetch options
 * @returns {Promise<any>} parsed JSON response
 */
export async function requestAuthenticated(path, options = {}) {
  const sharetribeToken = await ensureSharetribeTokenValid();
  if (!sharetribeToken) {
    throw new Error('Leaz backend: user must be logged in for authenticated requests');
  }

  if (!API_KEY) {
    throw new Error('Leaz backend: REACT_APP_LEAZ_BACKEND_API_KEY is not configured (required for authenticated calls)');
  }

  const url = `${BASE_URL}${API_PREFIX}/${path.replace(/^\//, '')}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    Authorization: `Bearer ${sharetribeToken}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    method: 'GET',
    headers,
    ...options,
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg;
    try {
      const err = JSON.parse(errText);
      errMsg = err.message || err.error || errText;
    } catch {
      errMsg = errText;
    }
    throw new Error(`Leaz backend authenticated request failed: ${response.status} - ${errMsg}`);
  }

  return response.json();
}

/**
 * Validate a coupon code. Works for both guest and authenticated users.
 * @param {Object} params
 * @param {string} params.code - Coupon code
 * @param {string} params.listingId - Listing UUID
 * @param {string} params.locale - Locale (e.g. 'it', 'en')
 * @returns {Promise<{ valid: boolean, type?: 'percentage'|'fixed', value?: number }>}
 */
export async function validateCoupon({ code, listingId, locale }) {
  if (!isLeazBackendApiAvailable()) {
    throw new Error('Leaz backend: coupon validation is not available');
  }

  const body = { code, listingId, locale };
  const path = 'coupons/validate';

  const sharetribeToken = await ensureSharetribeTokenValid();
  if (sharetribeToken && API_KEY) {
    return requestAuthenticatedPost(path, body);
  }
  return requestGuestPost(path, body);
}

/**
 * Check if Leaz Backend API is configured
 */
export const isLeazBackendApiAvailable = () => !!BASE_URL;
