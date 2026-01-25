import { parse } from '../../util/urlHelpers';
import { verify } from '../../ducks/emailVerification.duck';

// Key for storing pending verification token
const PENDING_VERIFICATION_TOKEN_KEY = 'pendingVerificationToken';

// ================ Thunks ================ //

/**
 * loadData for EmailVerificationPage
 * 
 * IMPORTANT: We do NOT auto-verify here anymore.
 * The verification is handled in the component based on pendingStripeOnboarding status.
 * This ensures we can properly check user state before verifying.
 */
export const loadData = (params, search) => (dispatch, getState) => {
  // Just parse and store the token - verification happens in component
  const urlParams = parse(search);
  const verificationToken = urlParams.t;
  const token = verificationToken ? `${verificationToken}` : null;

  if (token && typeof window !== 'undefined') {
    // Store token for the component to use
    sessionStorage.setItem(PENDING_VERIFICATION_TOKEN_KEY, token);
  }

  // Don't verify here - let the component handle it
  return Promise.resolve();
};

// Export the key for use in other components
export { PENDING_VERIFICATION_TOKEN_KEY };
