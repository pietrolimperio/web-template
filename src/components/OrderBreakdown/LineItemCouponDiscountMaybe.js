import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { LINE_ITEM_COUPON_DISCOUNT, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

const { Money } = sdkTypes;

/**
 * Format value suffix for coupon: percentage or fixed amount
 */
const formatCouponValueSuffix = (couponData, couponLineItem, intl) => {
  if (couponData) {
    if (couponData.type === 'percentage' && couponData.value != null) {
      return ` (-${couponData.value}%)`;
    }
    if (couponData.type === 'fixed' && couponLineItem?.lineTotal) {
      const currency = couponLineItem.lineTotal.currency || 'EUR';
      const amount = Math.abs(Number(couponLineItem.lineTotal.amount));
      return ` (-${formatMoney(intl, new Money(amount, currency))})`;
    }
  }
  // Fallback: get percentage from line item
  const pct = couponLineItem?.percentage;
  if (pct != null) {
    const absPct = Math.abs(typeof pct === 'object' && pct.toNumber ? pct.toNumber() : Number(pct));
    return ` (-${absPct}%)`;
  }
  // Fallback for fixed: show amount from lineTotal
  if (couponLineItem?.lineTotal) {
    const amount = Math.abs(Number(couponLineItem.lineTotal.amount));
    const currency = couponLineItem.lineTotal.currency || 'EUR';
    return ` (-${formatMoney(intl, new Money(amount, currency))})`;
  }
  return null;
};

/**
 * Renders the coupon discount line item.
 * Label: "Coupon {code} (-X%)" or "Coupon {code} (-X,XX €)"
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {intlShape} props.intl - The intl object
 * @param {string} [props.couponCode] - The coupon code (e.g. "SAVE20")
 * @param {Object} [props.couponData] - { type: 'percentage'|'fixed', value: number } from validation
 * @returns {JSX.Element}
 */
const LineItemCouponDiscountMaybe = props => {
  const { lineItems, intl, couponCode, couponData } = props;

  const couponLineItem = lineItems.find(
    item => item.code === LINE_ITEM_COUPON_DISCOUNT && !item.reversal
  );

  if (!couponLineItem) return null;

  const code = couponCode?.trim()?.toUpperCase() || null;
  const valueSuffix = formatCouponValueSuffix(couponData, couponLineItem, intl);

  const label = code ? (
    <>
      <FormattedMessage id="OrderBreakdown.coupon" defaultMessage="Coupon" />
      {' '}
      {code}
      {valueSuffix}
    </>
  ) : (
    <FormattedMessage id="OrderBreakdown.couponDiscount" defaultMessage="Sconto coupon" />
  );

  return (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>{label}</span>
      <span className={css.itemValue}>{formatMoney(intl, couponLineItem.lineTotal)}</span>
    </div>
  );
};

export default LineItemCouponDiscountMaybe;
