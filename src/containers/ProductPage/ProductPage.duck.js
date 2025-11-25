/**
 * ProductPage duck
 * 
 * Initially uses the same loadData as ListingPage.
 * This can be customized later if needed.
 */
import { loadData as ListingPageLoadData } from '../ListingPage/ListingPage.duck';

// Export the same loadData function for now
// Later this can be customized if ProductPage needs different data loading
export const loadData = ListingPageLoadData;

