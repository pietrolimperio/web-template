import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { DEFAULT_LOCALE, getLocalizedPageId, getBasePageId } from '../../config/localeConfig';

export const loadData = (params, search) => dispatch => {
  const pageIdFromUrl = params.pageId;
  
  // Get current locale from localStorage (default: it-IT)
  const currentLocale = typeof window !== 'undefined' 
    ? (localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE)
    : DEFAULT_LOCALE;
  
  // Strip any existing locale suffix to get the base page ID
  const basePageId = getBasePageId(pageIdFromUrl);
  
  // Build the localized page ID
  const localizedPageId = getLocalizedPageId(basePageId, currentLocale);
  
  // First, always fetch the base page
  const basePageAsset = {
    [basePageId]: `content/pages/${basePageId}.json`,
  };
  
  // Fetch base page first
  return dispatch(fetchPageAssets(basePageAsset, false))
    .then(() => {
      // If localized page is different from base, try to fetch it
      // This is optional - if it's a 404, hasFallback=true will handle it gracefully
      if (localizedPageId !== basePageId) {
        const localizedPageAsset = {
          [localizedPageId]: `content/pages/${localizedPageId}.json`,
        };
        // Try to fetch localized page
        // If it's a 404, hostedAssets.duck.js will silently resolve (not reject)
        return dispatch(fetchPageAssets(localizedPageAsset, true));
      }
      return null;
    });
};
