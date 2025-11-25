import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
export const ASSET_NAME = 'new-landing-page';

export const loadData = (params, search) => dispatch => {
  const pageAsset = { newLandingPage: `content/pages/${ASSET_NAME}.json` };
  return dispatch(fetchPageAssets(pageAsset, true));
};
