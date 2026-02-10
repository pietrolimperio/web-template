import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_COUPON_DISCOUNT, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * Renders the coupon discount line item.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemCouponDiscountMaybe = props => {
  const { lineItems, intl } = props;

  const couponLineItem = lineItems.find(
    item => item.code === LINE_ITEM_COUPON_DISCOUNT && !item.reversal
  );

  return couponLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.couponDiscount" defaultMessage="Coupon discount" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, couponLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemCouponDiscountMaybe;
