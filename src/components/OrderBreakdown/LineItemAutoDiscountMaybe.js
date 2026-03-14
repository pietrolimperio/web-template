import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_AUTO_DISCOUNT } from '../../util/types';

import css from './OrderBreakdown.module.css';

const LineItemAutoDiscountMaybe = props => {
  const { lineItems, intl } = props;

  const discountLineItem = lineItems.find(
    item => item.code === LINE_ITEM_AUTO_DISCOUNT && !item.reversal
  );

  return discountLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.autoDiscount" defaultMessage="Sconto automatico" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, discountLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemAutoDiscountMaybe;
