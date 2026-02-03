import { useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useConfiguration } from '../context/configurationContext';
import { useRouteConfiguration } from '../context/routeConfigurationContext';
import {
  loadGuestListingData,
  isGuestListingPendingPublish,
  clearGuestListingData,
  clearGuestListingPendingPublish,
} from './guestListingStorage';
import { createListingDraft, updateListing, uploadImage } from '../containers/AIListingCreationPage/AIListingCreationPage.duck';
import { createResourceLocatorString } from './routes';

/**
 * Hook to handle guest listing creation after authentication and email verification
 * Checks if there's a pending guest listing and creates it as a draft
 * IMPORTANT: Only creates the draft after email is verified to prevent premature redirects
 */
export const useGuestListingAfterAuth = (isAuthenticated, currentUser, dispatch) => {
  const history = useHistory();
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Only process once when user becomes authenticated AND email is verified
    // This prevents premature redirects during signup flow (before Stripe onboarding)
    // Check that user is authenticated, has ID, email is verified, and there's a pending guest listing
    const emailVerified = currentUser?.attributes?.emailVerified === true;
    
    if (
      isAuthenticated &&
      currentUser?.id &&
      emailVerified &&
      isGuestListingPendingPublish() &&
      !hasProcessedRef.current
    ) {
      hasProcessedRef.current = true;

      const savedData = loadGuestListingData();
      if (savedData && savedData.listingData) {
        // Create draft from saved data
        dispatch(createListingDraft(savedData.listingData))
          .then(response => {
            if (response && response.data && response.data.data) {
              const listing = response.data.data;
              const listingId = listing.id;

              // Extract UUID early to ensure we have it
              const listingIdUuid = listingId?.uuid || (typeof listingId === 'string' ? listingId : listingId?.toString());

              if (!listingIdUuid) {
                console.error('Failed to extract listing ID UUID from listing:', listing);
                throw new Error('Failed to extract listing ID UUID');
              }

              // Upload images if any
              if (savedData.images && savedData.images.length > 0) {
                // Upload images one by one using uploadImage
                const uploadPromises = savedData.images.map(imageFile =>
                  dispatch(uploadImage(listingId, imageFile, config))
                );
                return Promise.all(uploadPromises).then(() => listingIdUuid);
              }
              return listingIdUuid;
            }
            throw new Error('Failed to create listing draft - invalid response structure');
          })
          .then(listingIdUuid => {
            if (listingIdUuid) {
              // Clear guest data ONLY after draft is successfully created
              // and before redirecting to preview page
              clearGuestListingData();
              clearGuestListingPendingPublish();

              // Redirect to preview page
              const previewPath = createResourceLocatorString(
                'PreviewListingPageDraft',
                routeConfiguration,
                { id: listingIdUuid },
                {}
              );
              history.push(previewPath);
            } else {
              console.error('Listing ID UUID is missing after draft creation');
              clearGuestListingPendingPublish();
            }
          })
          .catch(error => {
            console.error('Failed to create draft from guest listing:', error);
            // Clear flags even on error to prevent loops
            // But DO NOT clear guest data - user might want to retry
            clearGuestListingPendingPublish();
          });
      } else {
        // No saved data, just clear the flag
        clearGuestListingPendingPublish();
      }
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.attributes?.emailVerified, dispatch, history, config, routeConfiguration]);
};

