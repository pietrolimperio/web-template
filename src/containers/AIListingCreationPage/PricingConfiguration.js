import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import css from './PricingConfiguration.module.css';

const { Money } = sdkTypes;

/**
 * PricingConfiguration Component
 * 
 * Allows users to:
 * - Set default price (from AI suggestion)
 * - Add duration-based variants (e.g., >10 days, 7-10 days)
 * - Add period-based variants (e.g., seasonal pricing)
 */
const PricingConfiguration = ({ suggestedPrice, currency, onComplete, onBack, isSubmitting }) => {
  // Parse suggested price
  const parsedPrice = suggestedPrice?.match(/\$?(\d+)/);
  const defaultPriceAmount = parsedPrice ? parseInt(parsedPrice[1], 10) * 100 : 1000; // Convert to cents

  const [defaultPrice, setDefaultPrice] = useState(defaultPriceAmount);
  const [priceVariants, setPriceVariants] = useState([]);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({
    type: 'duration', // 'duration' or 'period'
    price: defaultPriceAmount,
    duration: '>10', // e.g., ">10", "7-10"
    period: '', // e.g., "20251012-20251212,20251224-20251231"
  });

  // Add a price variant
  const handleAddVariant = () => {
    if (newVariant.type === 'duration' && !newVariant.duration) {
      alert('Please specify a duration');
      return;
    }
    if (newVariant.type === 'period' && !newVariant.period) {
      alert('Please specify a period');
      return;
    }

    const variant = {
      name: `price_variant${priceVariants.length + 1}`,
      priceInSubunits: newVariant.price,
      ...(newVariant.type === 'duration' && { duration: newVariant.duration }),
      ...(newVariant.type === 'period' && { period: newVariant.period }),
    };

    setPriceVariants([...priceVariants, variant]);
    setShowAddVariant(false);
    setNewVariant({
      type: 'duration',
      price: defaultPriceAmount,
      duration: '>10',
      period: '',
    });
  };

  // Remove a price variant
  const handleRemoveVariant = index => {
    setPriceVariants(priceVariants.filter((_, i) => i !== index));
  };

  // Handle continue
  const handleContinue = () => {
    const pricingConfig = {
      priceVariationsEnabled: priceVariants.length > 0,
      priceVariants: [
        {
          name: 'price_default',
          priceInSubunits: defaultPrice,
        },
        ...priceVariants,
      ],
    };

    onComplete(pricingConfig);
  };

  return (
    <div className={css.root}>
      <div className={css.header}>
        <h2 className={css.title}>
          <FormattedMessage
            id="AIListingCreation.pricingTitle"
            defaultMessage="Set Your Pricing"
          />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id="AIListingCreation.pricingDescription"
            defaultMessage="Configure your default price and optional variants based on rental duration or time period."
          />
        </p>
      </div>

      {/* Default Price */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AIListingCreation.defaultPrice" defaultMessage="Default Price" />
        </h3>
        <p className={css.sectionHint}>
          <FormattedMessage
            id="AIListingCreation.defaultPriceHint"
            defaultMessage="This is the base price per day for your rental."
          />
        </p>
        <div className={css.priceInput}>
          <span className={css.currency}>{currency || 'USD'}</span>
          <input
            type="number"
            value={defaultPrice / 100}
            onChange={e => setDefaultPrice(Math.round(parseFloat(e.target.value) * 100))}
            className={css.input}
            step="0.50"
            min="0"
          />
          <span className={css.perDay}>/ day</span>
        </div>
      </div>

      {/* Price Variants */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage
            id="AIListingCreation.priceVariants"
            defaultMessage="Price Variants (Optional)"
          />
        </h3>
        <p className={css.sectionHint}>
          <FormattedMessage
            id="AIListingCreation.priceVariantsHint"
            defaultMessage="Offer discounts for longer rentals or special pricing for specific periods (e.g., holidays)."
          />
        </p>

        {/* Existing Variants */}
        {priceVariants.length > 0 && (
          <div className={css.variantList}>
            {priceVariants.map((variant, index) => (
              <div key={index} className={css.variantItem}>
                <div className={css.variantInfo}>
                  <span className={css.variantLabel}>
                    {variant.duration && `Duration: ${variant.duration} days`}
                    {variant.period && `Period: ${variant.period}`}
                  </span>
                  <span className={css.variantPrice}>
                    {currency} {(variant.priceInSubunits / 100).toFixed(2)}/day
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(index)}
                  className={css.removeButton}
                  aria-label="Remove variant"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Variant */}
        {!showAddVariant ? (
          <button
            type="button"
            onClick={() => setShowAddVariant(true)}
            className={css.addButton}
          >
            + Add Price Variant
          </button>
        ) : (
          <div className={css.newVariantForm}>
            <div className={css.formRow}>
              <label className={css.label}>
                <FormattedMessage id="AIListingCreation.variantType" defaultMessage="Type" />
              </label>
              <select
                value={newVariant.type}
                onChange={e => setNewVariant({ ...newVariant, type: e.target.value })}
                className={css.select}
              >
                <option value="duration">Duration-based</option>
                <option value="period">Period-based (Seasonal)</option>
              </select>
            </div>

            {newVariant.type === 'duration' && (
              <div className={css.formRow}>
                <label className={css.label}>
                  <FormattedMessage id="AIListingCreation.duration" defaultMessage="Duration" />
                </label>
                <input
                  type="text"
                  value={newVariant.duration}
                  onChange={e => setNewVariant({ ...newVariant, duration: e.target.value })}
                  placeholder="e.g., >10, 7-10, 5-7"
                  className={css.input}
                />
                <span className={css.hint}>
                  Examples: &gt;10 (more than 10 days), 7-10 (7 to 10 days)
                </span>
              </div>
            )}

            {newVariant.type === 'period' && (
              <div className={css.formRow}>
                <label className={css.label}>
                  <FormattedMessage id="AIListingCreation.period" defaultMessage="Period" />
                </label>
                <input
                  type="text"
                  value={newVariant.period}
                  onChange={e => setNewVariant({ ...newVariant, period: e.target.value })}
                  placeholder="e.g., 20251012-20251212,20251224-20251231"
                  className={css.input}
                />
                <span className={css.hint}>
                  Format: YYYYMMDD-YYYYMMDD (comma-separated for multiple ranges)
                </span>
              </div>
            )}

            <div className={css.formRow}>
              <label className={css.label}>
                <FormattedMessage id="AIListingCreation.variantPrice" defaultMessage="Price" />
              </label>
              <div className={css.priceInput}>
                <span className={css.currency}>{currency || 'USD'}</span>
                <input
                  type="number"
                  value={newVariant.price / 100}
                  onChange={e =>
                    setNewVariant({ ...newVariant, price: Math.round(parseFloat(e.target.value) * 100) })
                  }
                  className={css.input}
                  step="0.50"
                  min="0"
                />
                <span className={css.perDay}>/ day</span>
              </div>
            </div>

            <div className={css.variantActions}>
              <button type="button" onClick={handleAddVariant} className={css.saveButton}>
                Save Variant
              </button>
              <button
                type="button"
                onClick={() => setShowAddVariant(false)}
                className={css.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={css.footer}>
        <button type="button" onClick={onBack} className={css.backButton} disabled={isSubmitting}>
          ← Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className={css.continueButton}
          disabled={isSubmitting}
        >
          Continue to Location →
        </button>
      </div>
    </div>
  );
};

export default PricingConfiguration;
