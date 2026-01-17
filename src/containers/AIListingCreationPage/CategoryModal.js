import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import css from './CategoryModal.module.css';
import categoriesData from '../../config/categories.json';

/**
 * CategoryModal Component
 *
 * Features:
 * - Full-screen modal overlay
 * - Three dropdown fields in column: category, subcategory, third category
 * - Pre-filled data from productAnalysis if available
 * - Subcategory options filtered by selected parent category
 * - Third category options filtered by selected subcategory
 * - Third category is optional
 */
const CategoryModal = ({
  initialCategoryId = null,
  initialSubcategoryId = null,
  initialThirdCategoryId = null,
  onComplete,
  onCancel,
}) => {
  const intl = useIntl();
  
  // Helper functions to find categories
  const findCategoryById = (id) => {
    return categoriesData.categories.find(cat => cat.id === id);
  };

  const findCategoryByName = (name) => {
    if (!name) return null;
    return categoriesData.categories.find(cat => 
      cat.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  const findSubcategoryById = (categoryId, subcategoryId) => {
    const category = findCategoryById(categoryId);
    if (!category || !category.subcategory) return null;
    return category.subcategory.find(sub => sub.id === subcategoryId);
  };

  const findSubcategoryByName = (categoryId, name) => {
    if (!name || !categoryId) return null;
    const category = findCategoryById(categoryId);
    if (!category || !category.subcategory) return null;
    return category.subcategory.find(sub => 
      sub.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  const findThirdCategoryById = (categoryId, subcategoryId, thirdCategoryId) => {
    const subcategory = findSubcategoryById(categoryId, subcategoryId);
    if (!subcategory || !subcategory['sub-subcategory']) return null;
    return subcategory['sub-subcategory'].find(third => third.id === thirdCategoryId);
  };

  const findThirdCategoryByName = (categoryId, subcategoryId, name) => {
    if (!name || !categoryId || !subcategoryId) return null;
    const subcategory = findSubcategoryById(categoryId, subcategoryId);
    if (!subcategory || !subcategory['sub-subcategory']) return null;
    return subcategory['sub-subcategory'].find(third => 
      third.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  // Convert initial values: if they are IDs use them, if they are names find the IDs
  const getInitialCategoryId = () => {
    if (initialCategoryId) {
      // Check if it's already an ID (number) or needs to be found by name
      if (typeof initialCategoryId === 'number') {
        return initialCategoryId;
      }
      // If it's a string (name), try to find the ID
      const category = findCategoryByName(initialCategoryId);
      return category?.id || null;
    }
    return null;
  };

  const getInitialSubcategoryId = (catId) => {
    if (!catId) return null;
    if (initialSubcategoryId) {
      if (typeof initialSubcategoryId === 'number') {
        return initialSubcategoryId;
      }
      const subcategory = findSubcategoryByName(catId, initialSubcategoryId);
      return subcategory?.id || null;
    }
    return null;
  };

  const getInitialThirdCategoryId = (catId, subId) => {
    if (!catId || !subId) return null;
    if (initialThirdCategoryId) {
      if (typeof initialThirdCategoryId === 'number') {
        return initialThirdCategoryId;
      }
      const thirdCategory = findThirdCategoryByName(catId, subId, initialThirdCategoryId);
      return thirdCategory?.id || null;
    }
    return null;
  };

  // Initialize state with prefilled values
  const initialCatId = getInitialCategoryId();
  const initialSubId = getInitialSubcategoryId(initialCatId);
  const initialThirdId = getInitialThirdCategoryId(initialCatId, initialSubId);

  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCatId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(initialSubId);
  const [selectedThirdCategoryId, setSelectedThirdCategoryId] = useState(initialThirdId);

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
  const availableCategories = useMemo(() => categoriesData.categories || [], []);

  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    const category = findCategoryById(selectedCategoryId);
    return category?.subcategory || [];
  }, [selectedCategoryId]);

  const availableThirdCategories = useMemo(() => {
    if (!selectedCategoryId || !selectedSubcategoryId) return [];
    const subcategory = findSubcategoryById(selectedCategoryId, selectedSubcategoryId);
    return subcategory?.['sub-subcategory'] || [];
  }, [selectedCategoryId, selectedSubcategoryId]);

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

  const handleCancel = () => {
    onCancel();
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
                  <FormattedMessage
                    id="CategoryModal.selectCategory"
                    defaultMessage="Seleziona una categoria"
                  />
                </option>
                {availableCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
                  <FormattedMessage
                    id="CategoryModal.selectSubcategory"
                    defaultMessage={selectedCategoryId ? "Seleziona una sottocategoria" : "Seleziona prima una categoria"}
                  />
                </option>
                {availableSubcategories.map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
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
                    <FormattedMessage
                      id="CategoryModal.selectThirdCategory"
                      defaultMessage="Nessuna"
                    />
                  </option>
                  {availableThirdCategories.map(thirdCategory => (
                    <option key={thirdCategory.id} value={thirdCategory.id}>
                      {thirdCategory.name}
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
            onClick={handleCancel}
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
    </div>
  );
};

export default CategoryModal;
