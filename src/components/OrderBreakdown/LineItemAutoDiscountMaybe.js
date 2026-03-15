import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { LINE_ITEM_AUTO_DISCOUNT } from '../../util/types';

import css from './OrderBreakdown.module.css';

const { Money } = sdkTypes;

// Same "best discount" logic as server (lineItemHelpers.getAutoDiscountMaybe)
const getBestDiscount = (autoDiscounts = []) => {
  if (!autoDiscounts.length) return null;
  return autoDiscounts.reduce((acc, d) => {
    if (!acc) return d;
    if (d.type === 'percentage' && acc.type !== 'percentage') return d;
    if (d.type === acc.type && d.value > acc.value) return d;
    return acc;
  }, null);
};

const formatDiscountValueSuffix = (bestDiscount, discountLineItem, intl) => {
  if (bestDiscount) {
    if (bestDiscount.type === 'percentage') {
      return ` (-${bestDiscount.value}%)`;
    }
    if (bestDiscount.type === 'fixed' && discountLineItem?.lineTotal) {
      const currency = discountLineItem.lineTotal.currency || 'EUR';
      const amount = Math.abs(Number(discountLineItem.lineTotal.amount));
      return ` (-${formatMoney(intl, new Money(amount, currency))})`;
    }
  }
  // Fallback: try to get percentage from line item (e.g. when autoDiscounts not passed)
  const pct = discountLineItem?.percentage;
  if (pct != null) {
    const absPct = Math.abs(typeof pct === 'object' && pct.toNumber ? pct.toNumber() : Number(pct));
    return ` (-${absPct}%)`;
  }
  // Fallback for fixed: show amount from lineTotal
  if (discountLineItem?.lineTotal) {
    const amount = Math.abs(Number(discountLineItem.lineTotal.amount));
    const currency = discountLineItem.lineTotal.currency || 'EUR';
    return ` (-${formatMoney(intl, new Money(amount, currency))})`;
  }
  return null;
};

const LineItemAutoDiscountMaybe = props => {
  const { lineItems, intl, autoDiscounts } = props;

  const discountLineItem = lineItems.find(
    item => item.code === LINE_ITEM_AUTO_DISCOUNT && !item.reversal
  );

  if (!discountLineItem) return null;

  const bestDiscount = getBestDiscount(autoDiscounts);
  const name =
    discountLineItem.discountName ||
    bestDiscount?.name ||
    null;
  const valueSuffix = formatDiscountValueSuffix(bestDiscount, discountLineItem, intl);

  const label = name ? (
    <>
      {name}
      {valueSuffix}
    </>
  ) : (
    <FormattedMessage id="OrderBreakdown.autoDiscount" defaultMessage="Sconto automatico" />
  );

  return (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>{label}</span>
      <span className={css.itemValue}>{formatMoney(intl, discountLineItem.lineTotal)}</span>
    </div>
  );
};

export default LineItemAutoDiscountMaybe;
