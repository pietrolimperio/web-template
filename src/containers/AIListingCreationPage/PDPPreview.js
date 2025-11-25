import React, { useState } from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import productApiInstance from '../../util/productApi';
import css from './PDPPreview.module.css';

/**
 * PDPPreview Component
 *
 * Product Detail Page Preview with:
 * - Display all product fields
 * - Edit each field inline
 * - AI regeneration for individual fields
 * - Draft save and publish actions
 */

const PDPPreview = ({ productData, images, onSaveDraft, onPublish, isSaving, isPublishing }) => {
  const [editingField, setEditingField] = useState(null);
  const [fieldValues, setFieldValues] = useState(productData.fields || {});
  const [regeneratingField, setRegeneratingField] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleEditField = fieldName => {
    setEditingField(fieldName);
    setFieldErrors({ ...fieldErrors, [fieldName]: null });
  };

  const handleSaveField = fieldName => {
    const value = fieldValues[fieldName];

    // Basic validation
    if (!value || (typeof value === 'string' && !value.trim())) {
      setFieldErrors({ ...fieldErrors, [fieldName]: 'This field cannot be empty' });
      return;
    }

    setEditingField(null);
    setFieldErrors({ ...fieldErrors, [fieldName]: null });
  };

  const handleCancelEdit = fieldName => {
    // Restore original value
    setFieldValues({ ...fieldValues, [fieldName]: productData.fields[fieldName] });
    setEditingField(null);
    setFieldErrors({ ...fieldErrors, [fieldName]: null });
  };

  const handleChangeField = (fieldName, value) => {
    setFieldValues({ ...fieldValues, [fieldName]: value });
  };

  const handleRegenerateField = async fieldName => {
    setRegeneratingField(fieldName);
    setFieldErrors({ ...fieldErrors, [fieldName]: null });

    try {
      const result = await productApiInstance.regenerate(productData, fieldName);

      if (result && result.newValue) {
        setFieldValues({ ...fieldValues, [fieldName]: result.newValue });
      } else {
        throw new Error('Failed to regenerate field');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      setFieldErrors({ ...fieldErrors, [fieldName]: 'Failed to regenerate. Please try again.' });
    } finally {
      setRegeneratingField(null);
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft({ ...productData, fields: fieldValues });
  };

  const handlePublish = () => {
    onPublish({ ...productData, fields: fieldValues });
  };

  const renderField = (fieldName, label, isMultiline = false, isArray = false) => {
    const value = fieldValues[fieldName];
    const isEditing = editingField === fieldName;
    const isRegenerating = regeneratingField === fieldName;
    const error = fieldErrors[fieldName];

    return (
      <div className={css.field}>
        <div className={css.fieldHeader}>
          <label className={css.fieldLabel}>{label}</label>
          <div className={css.fieldActions}>
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => handleEditField(fieldName)}
                  className={css.iconButton}
                  disabled={isRegenerating}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => handleRegenerateField(fieldName)}
                  className={css.iconButton}
                  disabled={isRegenerating}
                  title="Regenerate with AI"
                >
                  {isRegenerating ? '⏳' : '🔄'}
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveField(fieldName)}
                  className={css.saveButton}
                >
                  ✓ Save
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelEdit(fieldName)}
                  className={css.cancelButton}
                >
                  × Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <>
            {isArray ? (
              <div className={css.arrayEditor}>
                <textarea
                  value={Array.isArray(value) ? value.join('\n') : ''}
                  onChange={e =>
                    handleChangeField(fieldName, e.target.value.split('\n').filter(Boolean))
                  }
                  className={css.textarea}
                  rows={5}
                  placeholder="One item per line"
                />
                <p className={css.hint}>Enter one item per line</p>
              </div>
            ) : isMultiline ? (
              <textarea
                value={value || ''}
                onChange={e => handleChangeField(fieldName, e.target.value)}
                className={css.textarea}
                rows={6}
              />
            ) : (
              <input
                type="text"
                value={value || ''}
                onChange={e => handleChangeField(fieldName, e.target.value)}
                className={css.input}
              />
            )}
            {error && <p className={css.error}>{error}</p>}
          </>
        ) : (
          <div className={css.fieldValue}>
            {isArray ? (
              <ul className={css.list}>
                {(Array.isArray(value) ? value : []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : isMultiline ? (
              <p className={css.text}>{value || '—'}</p>
            ) : (
              <p className={css.text}>{value || '—'}</p>
            )}
            {isRegenerating && <p className={css.regenerating}>Regenerating...</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={css.container}>
      <div className={css.header}>
        <h2 className={css.title}>
          <FormattedMessage
            id="AIListingCreation.previewTitle"
            defaultMessage="Preview Your Listing"
          />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id="AIListingCreation.previewSubtitle"
            defaultMessage="Review and edit your listing details. You can save as draft or publish now."
          />
        </p>
      </div>

      {/* Images Preview */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Images</h3>
        <div className={css.imagesGrid}>
          {images.map((img, index) => (
            <div key={index} className={css.imagePreview}>
              <img
                src={typeof img === 'string' ? img : URL.createObjectURL(img)}
                alt={`Product ${index + 1}`}
                className={css.image}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Product Category */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Category</h3>
        <p className={css.categoryText}>
          {productData.category} {productData.subcategory && `→ ${productData.subcategory}`}
        </p>
      </div>

      {/* Main Product Fields */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Product Information</h3>

        {renderField('title', 'Title')}
        {renderField('shortDescription', 'Short Description', true)}
        {renderField('longDescription', 'Full Description', true)}
        {renderField('brand', 'Brand')}
        {renderField('condition', 'Condition')}
        {renderField('priceSuggestion', 'Price Suggestion')}
      </div>

      {/* Features & Tags */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Features & Tags</h3>

        {renderField('keyFeatures', 'Key Features', false, true)}
        {renderField('tags', 'Tags', false, true)}
      </div>

      {/* Additional Fields (category-specific) */}
      {Object.keys(fieldValues).some(
        key =>
          ![
            'title',
            'shortDescription',
            'longDescription',
            'brand',
            'condition',
            'priceSuggestion',
            'keyFeatures',
            'tags',
          ].includes(key)
      ) && (
        <div className={css.section}>
          <h3 className={css.sectionTitle}>Additional Details</h3>
          {Object.keys(fieldValues)
            .filter(
              key =>
                ![
                  'title',
                  'shortDescription',
                  'longDescription',
                  'brand',
                  'condition',
                  'priceSuggestion',
                  'keyFeatures',
                  'tags',
                ].includes(key)
            )
            .map(key => {
              // Generate human-readable label
              const cleanKey = key.replace(/^ai_/, ''); // Remove ai_ prefix
              const label = cleanKey
                .replace(/([A-Z])/g, ' $1') // Add space before capitals
                .replace(/_/g, ' ') // Replace underscores with spaces
                .replace(/^./, str => str.toUpperCase()); // Capitalize first letter

              return <div key={key}>{renderField(key, label)}</div>;
            })}
        </div>
      )}

      {/* Footer Actions */}
      <div className={css.footer}>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSaving || isPublishing}
          className={css.draftButton}
        >
          {isSaving ? (
            <>
              <div className={css.spinner} />
              Saving...
            </>
          ) : (
            <>💾 Save as Draft</>
          )}
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={isSaving || isPublishing}
          className={css.publishButton}
        >
          {isPublishing ? (
            <>
              <div className={css.spinner} />
              Publishing...
            </>
          ) : (
            <>🚀 Publish Listing</>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className={css.helpText}>
        <p>
          💡 <strong>Tip:</strong> Use the ✏️ button to edit any field manually, or the 🔄 button to
          regenerate it with AI. Save as draft to come back later, or publish now to make your
          listing live!
        </p>
      </div>
    </div>
  );
};

export default PDPPreview;
