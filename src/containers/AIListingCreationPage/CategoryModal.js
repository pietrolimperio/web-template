import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { getCategoryDisplayName, getShortLocaleForCategoryDisplay } from '../../util/fieldHelpers';
import css from './CategoryModal.module.css';

/**
 * CategoryModal Component
 *
 * Features:
 * - Full-screen modal overlay
 * - Three dropdown fields in column: category, subcategory, third category
 * - Pre-filled from AI: use only categoryId, subcategoryId, thirdCategoryId (IDs). Names are
 *   always taken from the localized categories API (user locale), not from AI (backend uses locale en).
 * - Subcategory options filtered by selected parent category
 * - Third category options filtered by selected subcategory
 * - Third category is optional
 * - Categories are loaded from Leaz backend API via app config (categoryConfiguration.categories)
 */
const CategoryModal = ({
  initialCategoryId = null,
  initialSubcategoryId = null,
  initialThirdCategoryId = null,
  onComplete,
  onCancel,
}) => {
  const intl = useIntl();
  const config = useConfiguration();
  const categoriesList = config?.categoryConfiguration?.categories ?? [];
  const shortLocale = getShortLocaleForCategoryDisplay(config, intl?.locale);

  // Helper functions to find categories (structure: subcategories at every level)
  const findCategoryById = (id) => {
    return categoriesList.find(cat => cat.id === id);
  };

  const findCategoryByName = (name) => {
    if (!name) return null;
    return categoriesList.find(cat =>
      cat.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  const findSubcategoryById = (categoryId, subcategoryId) => {
    const category = findCategoryById(categoryId);
    if (!category || !category.subcategories) return null;
    return category.subcategories.find(sub => sub.id === subcategoryId);
  };

  const findSubcategoryByName = (categoryId, name) => {
    if (!name || !categoryId) return null;
    const category = findCategoryById(categoryId);
    if (!category || !category.subcategories) return null;
    return category.subcategories.find(sub =>
      sub.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  const findThirdCategoryById = (categoryId, subcategoryId, thirdCategoryId) => {
    const subcategory = findSubcategoryById(categoryId, subcategoryId);
    if (!subcategory || !subcategory.subcategories) return null;
    return subcategory.subcategories.find(third => third.id === thirdCategoryId);
  };

  const findThirdCategoryByName = (categoryId, subcategoryId, name) => {
    if (!name || !categoryId || !subcategoryId) return null;
    const subcategory = findSubcategoryById(categoryId, subcategoryId);
    if (!subcategory || !subcategory.subcategories) return null;
    return subcategory.subcategories.find(third =>
      third.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  // Initial values: prefer IDs (e.g. from AI). If a string is passed (legacy), resolve by name.
  // For AI flow we only pass IDs so the preselection uses our localized tree for display names.
  const getInitialCategoryId = () => {
    if (initialCategoryId == null) return null;
    if (typeof initialCategoryId === 'number') return initialCategoryId;
    const category = findCategoryByName(initialCategoryId);
    return category?.id ?? null;
  };

  const getInitialSubcategoryId = catId => {
    if (!catId || initialSubcategoryId == null) return null;
    if (typeof initialSubcategoryId === 'number') return initialSubcategoryId;
    const subcategory = findSubcategoryByName(catId, initialSubcategoryId);
    return subcategory?.id ?? null;
  };

  const getInitialThirdCategoryId = (catId, subId) => {
    if (!catId || !subId || initialThirdCategoryId == null) return null;
    if (typeof initialThirdCategoryId === 'number') return initialThirdCategoryId;
    const thirdCategory = findThirdCategoryByName(catId, subId, initialThirdCategoryId);
    return thirdCategory?.id ?? null;
  };

  // Initialize state with prefilled values
  const initialCatId = getInitialCategoryId();
  const initialSubId = getInitialSubcategoryId(initialCatId);
  const initialThirdId = getInitialThirdCategoryId(initialCatId, initialSubId);

  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCatId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(initialSubId);
  const [selectedThirdCategoryId, setSelectedThirdCategoryId] = useState(initialThirdId);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Reset subcategory when category changes (except on initial load)
  const prevCategoryRef = useRef(initialCatId);
  useEffect(() => {
    if (prevCategoryRef.current !== selectedCategoryId && prevCategoryRef.current !== null) {
      setSelectedSubcategoryId(null);
      setSelectedThirdCategoryId(null);
    }
    prevCategoryRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  // Reset third category when subcategory changes (except on initial load)
  const prevSubcategoryRef = useRef(initialSubId);
  useEffect(() => {
    if (prevSubcategoryRef.current !== selectedSubcategoryId && prevSubcategoryRef.current !== null) {
      setSelectedThirdCategoryId(null);
    }
    prevSubcategoryRef.current = selectedSubcategoryId;
  }, [selectedSubcategoryId]);

  // Get available options based on selections
  const availableCategories = useMemo(() => categoriesList, [categoriesList]);

  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    const category = findCategoryById(selectedCategoryId);
    return category?.subcategories || [];
  }, [selectedCategoryId, categoriesList]);

  const availableThirdCategories = useMemo(() => {
    if (!selectedCategoryId || !selectedSubcategoryId) return [];
    const subcategory = findSubcategoryById(selectedCategoryId, selectedSubcategoryId);
    return subcategory?.subcategories || [];
  }, [selectedCategoryId, selectedSubcategoryId, categoriesList]);

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value ? parseInt(e.target.value, 10) : null;
    setSelectedCategoryId(categoryId);
  };

  const handleSubcategoryChange = (e) => {
    const subcategoryId = e.target.value ? parseInt(e.target.value, 10) : null;
    setSelectedSubcategoryId(subcategoryId);
  };

  const handleThirdCategoryChange = (e) => {
    const thirdCategoryId = e.target.value ? parseInt(e.target.value, 10) : null;
    setSelectedThirdCategoryId(thirdCategoryId);
  };

  const handleContinue = () => {
    const category = selectedCategoryId ? findCategoryById(selectedCategoryId) : null;
    const subcategory = selectedCategoryId && selectedSubcategoryId 
      ? findSubcategoryById(selectedCategoryId, selectedSubcategoryId) 
      : null;
    const thirdCategory = selectedCategoryId && selectedSubcategoryId && selectedThirdCategoryId
      ? findThirdCategoryById(selectedCategoryId, selectedSubcategoryId, selectedThirdCategoryId)
      : null;

    const categoriesData = {
      category: category?.name || null,
      subcategory: subcategory?.name || null,
      thirdCategory: thirdCategory?.name || null,
      categoryId: selectedCategoryId,
      subcategoryId: selectedSubcategoryId,
      thirdCategoryId: selectedThirdCategoryId,
    };

    onComplete(categoriesData);
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    onCancel();
  };

  const handleCancelDialogClose = () => {
    setShowCancelDialog(false);
  };

  const canContinue = selectedCategoryId && selectedSubcategoryId;

  return (
    <div className={css.modalOverlay}>
      <div className={css.modalContent}>
        <div className={css.modalHeader}>
          <h2 className={css.modalTitle}>
            <FormattedMessage
              id="CategoryModal.title"
              defaultMessage="Seleziona le categorie"
            />
          </h2>
          <p className={css.modalSubtitle}>
            <FormattedMessage
              id="CategoryModal.subtitle"
              defaultMessage="Scegli la categoria principale e la sottocategoria per il tuo prodotto. La terza categoria è opzionale."
            />
          </p>
        </div>

        <div className={css.modalBody}>
          <div className={css.dropdownGroup}>
            {/* Category Dropdown */}
            <div className={css.dropdownWrapper}>
              <label className={css.dropdownLabel}>
                <FormattedMessage
                  id="CategoryModal.categoryLabel"
                  defaultMessage="Categoria *"
                />
              </label>
              <select
                className={css.dropdown}
                value={selectedCategoryId || ''}
                onChange={handleCategoryChange}
                disabled={true}
                required
              >
                <option value="">
                  {intl.formatMessage({ id: 'CategoryModal.selectCategory' })}
                </option>
                {availableCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {getCategoryDisplayName(category, shortLocale)}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Dropdown */}
            <div className={css.dropdownWrapper}>
              <label className={css.dropdownLabel}>
                <FormattedMessage
                  id="CategoryModal.subcategoryLabel"
                  defaultMessage="Sottocategoria *"
                />
              </label>
              <select
                className={css.dropdown}
                value={selectedSubcategoryId || ''}
                onChange={handleSubcategoryChange}
                disabled={true}
                required
              >
                <option value="">
                  {intl.formatMessage({ id: 'CategoryModal.selectSubcategory' })}
                </option>
                {availableSubcategories.map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {getCategoryDisplayName(subcategory, shortLocale)}
                  </option>
                ))}
              </select>
            </div>

            {/* Third Category Dropdown (Optional) */}
            {availableThirdCategories.length > 0 && (
              <div className={css.dropdownWrapper}>
                <label className={css.dropdownLabel}>
                  <FormattedMessage
                    id="CategoryModal.thirdCategoryLabel"
                    defaultMessage="Terza categoria (opzionale)"
                  />
                </label>
                <select
                  className={css.dropdown}
                  value={selectedThirdCategoryId || ''}
                  onChange={handleThirdCategoryChange}
                  disabled={!selectedSubcategoryId}
                >
                  <option value="">
                    {intl.formatMessage({ id: 'CategoryModal.selectThirdCategory' })}
                  </option>
                    {availableThirdCategories.map(thirdCategory => (
                      <option key={thirdCategory.id} value={thirdCategory.id}>
                        {getCategoryDisplayName(thirdCategory, shortLocale)}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className={css.modalFooter}>
          <button
            type="button"
            className={css.cancelButton}
            onClick={handleCancelClick}
          >
            <FormattedMessage
              id="CategoryModal.cancel"
              defaultMessage="Annulla"
            />
          </button>
          <button
            type="button"
            className={`${css.continueButton} ${!canContinue ? css.continueButtonDisabled : ''}`}
            onClick={handleContinue}
            disabled={!canContinue}
          >
            <FormattedMessage
              id="CategoryModal.continue"
              defaultMessage="Continua"
            />
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className={css.dialogOverlay}>
          <div className={css.dialogBox}>
            <h3 className={css.dialogTitle}>
              <FormattedMessage
                id="QuestionModal.cancelDialogTitle"
                defaultMessage="Interrupt Listing Creation?"
              />
            </h3>
            <p className={css.dialogMessage}>
              <FormattedMessage
                id="QuestionModal.cancelDialogMessage"
                defaultMessage="If you continue, the listing creation process will be interrupted and you will return to the first step with your previously loaded images. All answers will be lost."
              />
            </p>
            <div className={css.dialogButtons}>
              <button
                type="button"
                onClick={handleCancelDialogClose}
                className={css.dialogSecondaryButton}
              >
                <FormattedMessage id="QuestionModal.cancelDialogStay" defaultMessage="Stay" />
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className={css.dialogPrimaryButton}
              >
                <FormattedMessage
                  id="QuestionModal.cancelDialogConfirm"
                  defaultMessage="Yes, Interrupt"
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryModal;
