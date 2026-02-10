import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { DEFAULT_LOCALE, getLocalizedPageId } from '../../config/localeConfig';

export const ASSET_NAME = 'landing-page';

/**
 * Load landing page assets with the same localization logic as CMSPage.
 * Fetches base page (landing-page.json) then optional localized page (e.g. landing-page_it_it.json).
 */
export const loadData = (params, search) => dispatch => {
  const basePageId = ASSET_NAME;

  const currentLocale =
    typeof window !== 'undefined'
      ? localStorage.getItem('marketplace_locale') || DEFAULT_LOCALE
      : DEFAULT_LOCALE;

  const localizedPageId = getLocalizedPageId(basePageId, currentLocale);

  const basePageAsset = {
    [basePageId]: `content/pages/${basePageId}.json`,
  };

  return dispatch(fetchPageAssets(basePageAsset, false)).then(() => {
    if (localizedPageId !== basePageId) {
      const localizedPageAsset = {
        [localizedPageId]: `content/pages/${localizedPageId}.json`,
      };
      return dispatch(fetchPageAssets(localizedPageAsset, true));
    }
    return null;
  });
};
