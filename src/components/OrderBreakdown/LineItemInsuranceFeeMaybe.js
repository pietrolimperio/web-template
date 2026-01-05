import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_INSURANCE_FEE, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * A component that renders the insurance fee as a line item.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemInsuranceFeeMaybe = props => {
  const { lineItems, intl } = props;

  const insuranceFeeLineItem = lineItems.find(
    item => item.code === LINE_ITEM_INSURANCE_FEE && !item.reversal
  );

  return insuranceFeeLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.insuranceFee" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, insuranceFeeLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemInsuranceFeeMaybe;

