import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import {
  LINE_ITEM_DAY,
  LINE_ITEM_FIXED,
  LINE_ITEM_HOUR,
  LINE_ITEM_NIGHT,
  LINE_ITEM_OFFER,
  LINE_ITEM_REQUEST,
  propTypes,
} from '../../util/types';

import css from './OrderBreakdown.module.css';

const { Money } = sdkTypes;

/** Ensure value is a Money instance (API may return plain { amount, currency } after deserialization). */
const ensureMoney = value => {
  if (!value || (typeof value.amount === 'undefined' && value.currency === undefined)) return null;
  return value instanceof Money ? value : new Money(Number(value.amount), value.currency);
};

/**
 * A component that renders the base price as a line item.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {propTypes.lineItemUnitType} props.code - The code of the line item
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemBasePriceMaybe = props => {
  const { lineItems, code, intl } = props;
  const isNightly = code === LINE_ITEM_NIGHT;
  const isDaily = code === LINE_ITEM_DAY;
  const isHourly = code === LINE_ITEM_HOUR;
  const isFixed = code === LINE_ITEM_FIXED;
  const isRequest = code === LINE_ITEM_REQUEST;
  const isOffer = code === LINE_ITEM_OFFER;
  const translationKey = isNightly
    ? 'OrderBreakdown.baseUnitNight'
    : isDaily
    ? 'OrderBreakdown.baseUnitDay'
    : isHourly
    ? 'OrderBreakdown.baseUnitHour'
    : isFixed
    ? 'OrderBreakdown.baseUnitFixedBooking'
    : isRequest
    ? 'OrderBreakdown.baseUnitRequest'
    : isOffer
    ? 'OrderBreakdown.baseUnitOffer'
    : 'OrderBreakdown.baseUnitQuantity';

  // Find correct line-item for given code prop.
  // It should be one of the following: 'line-item/night, 'line-item/day', 'line-item/hour', 'line-item/fixed', 'line-item/item', 'line-item/offer', 'line-item/request'
  // These are defined in '../../util/types';
  const unitPurchase = lineItems.find(item => item.code === code && !item.reversal);

  const quantity = unitPurchase?.units
    ? unitPurchase.units.toString()
    : unitPurchase?.quantity
    ? unitPurchase.quantity.toString()
    : null;
  const unitPrice = ensureMoney(unitPurchase?.unitPrice);
  const unitPriceFormatted = unitPrice ? formatMoney(intl, unitPrice) : null;
  const lineTotalMoney = ensureMoney(unitPurchase?.lineTotal);
  const total = lineTotalMoney ? formatMoney(intl, lineTotalMoney) : null;
  const originalUnitPrice = ensureMoney(unitPurchase?.originalUnitPrice);
  const hasPriceVariantDiscount =
    originalUnitPrice &&
    unitPrice &&
    Number(originalUnitPrice.amount) !== Number(unitPrice.amount);
  const originalTotalMoney =
    hasPriceVariantDiscount && quantity && originalUnitPrice
      ? new Money(
          Math.round(Number(originalUnitPrice.amount) * Number(quantity)),
          originalUnitPrice.currency
        )
      : null;
  const originalTotalFormatted = originalTotalMoney
    ? formatMoney(intl, originalTotalMoney)
    : null;
  const originalUnitPriceFormatted = originalUnitPrice
    ? formatMoney(intl, originalUnitPrice)
    : null;

  // Show original price only when the final price is actually lower (real discount)
  const showOriginalPriceLine =
    hasPriceVariantDiscount &&
    originalUnitPriceFormatted &&
    originalTotalFormatted &&
    lineTotalMoney &&
    originalTotalMoney &&
    Number(lineTotalMoney.amount) < Number(originalTotalMoney.amount);

  const message = unitPurchase?.seats ? (
    <FormattedMessage
      id={`${translationKey}Seats`}
      values={{ unitPrice: unitPriceFormatted, quantity, seats: unitPurchase.seats }}
    />
  ) : (
    <FormattedMessage id={translationKey} values={{ unitPrice: unitPriceFormatted, quantity }} />
  );

  return quantity && total ? (
    <div className={css.lineItemBasePriceBlock}>
      {showOriginalPriceLine && (
        <div className={css.lineItem}>
          <span className={css.itemLabelOriginal}>
            <FormattedMessage
              id="OrderBreakdown.baseUnitOriginalPrice"
              defaultMessage="Prezzo base: {unitPrice} x {quantity}"
              values={{
                unitPrice: originalUnitPriceFormatted,
                quantity,
              }}
            />
          </span>
          <span className={css.itemValueOriginal}>{originalTotalFormatted}</span>
        </div>
      )}
      <div className={css.lineItem}>
        <span className={css.itemLabel}>{message}</span>
        <span className={css.itemValue}>{total}</span>
      </div>
    </div>
  ) : null;
};

export default LineItemBasePriceMaybe;
