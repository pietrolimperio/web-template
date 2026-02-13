const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const {
  constructValidLineItems,
  calculateMinimumBookingUnitsForCommission,
} = require('../api-util/lineItemHelpers');

const COMMISSION_EXCEEDS_TOTAL_MSG =
  'Minimum commission amount is greater than the amount of money paid in';

module.exports = (req, res) => {
  const { isOwnListing, listingId, orderData } = req.body;

  const sdk = getSdk(req, res);

  const listingPromise = () =>
    isOwnListing ? sdk.ownListings.show({ id: listingId }) : sdk.listings.show({ id: listingId });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      try {
        const lineItems = transactionLineItems(
          listing,
          orderData,
          providerCommission,
          customerCommission
        );

        // Because we are using returned lineItems directly in this template we need to use the helper function
        // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
        const validLineItems = constructValidLineItems(lineItems);

        res
          .status(200)
          .set('Content-Type', 'application/transit+json')
          .send(serialize({ data: validLineItems }))
          .end();
      } catch (e) {
        if (e.message === COMMISSION_EXCEEDS_TOTAL_MSG && providerCommission?.minimum_amount) {
          const minimumBookingUnits = calculateMinimumBookingUnitsForCommission(
            listing,
            orderData,
            providerCommission.minimum_amount
          );
          if (minimumBookingUnits != null) {
            res.status(400).json({
              name: 'LocalAPIError',
              message: 'Local API request failed',
              status: 400,
              statusText: e.message,
              minimumBookingUnits,
            });
            return;
          }
        }
        handleError(res, e);
      }
    })
    .catch(e => {
      handleError(res, e);
    });
};
