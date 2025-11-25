import React, { useState } from 'react';
import { bool, func, string } from 'prop-types';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { COUNTRIES, LANGUAGE_LABELS } from '../../config/localeConfig';

import Menu from '../Menu/Menu';
import MenuLabel from '../MenuLabel/MenuLabel';
import MenuContent from '../MenuContent/MenuContent';
import MenuItem from '../MenuItem/MenuItem';
import Modal from '../Modal/Modal';

import css from './LocaleSelector.module.css';

/**
 * LocaleSelector Component
 * 
 * Allows users to select their country and language.
 * For countries with multiple languages (e.g., Switzerland), shows a dialog.
 */
const LocaleSelector = ({
  className = null,
  rootClassName = null,
  currentLocale,
  onLocaleChange,
}) => {
  
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const modalBackdropRef = React.useRef(null);
  
  const classes = classNames(rootClassName || css.root, className);
  
  // Get current country from locale
  const getCurrentCountry = () => {
    for (const country of Object.values(COUNTRIES)) {
      if (country.languages.includes(currentLocale)) {
        return country;
      }
    }
    return COUNTRIES.IT; // Default
  };
  
  const currentCountry = getCurrentCountry();
  
  // Get flag image URL for circular flag
  const getFlagImageUrl = (countryCode) => {
    // Use flagcdn.com for circular flags (w40 = 40px width, circular format)
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };
  
  // Handle country selection
  const handleCountrySelect = country => {
    if (country.languages.length === 1) {
      // Single language - change immediately
      onLocaleChange(country.defaultLocale);
    } else {
      // Multiple languages - show dialog
      setSelectedCountry(country);
      setIsLanguageDialogOpen(true);
    }
  };
  
  // Handle language selection in dialog
  const handleLanguageSelect = locale => {
    onLocaleChange(locale);
    setIsLanguageDialogOpen(false);
    setSelectedCountry(null);
  };
  
  // Cancel language dialog
  const handleCancel = () => {
    setIsLanguageDialogOpen(false);
    setSelectedCountry(null);
  };
  
  // Add click-outside-to-close functionality
  React.useEffect(() => {
    if (!isLanguageDialogOpen) return;
    
    const handleClickOutside = (event) => {
      // Check if click is on the backdrop (scrollLayer) and not on the content
      const scrollLayer = document.querySelector(`[id="LocaleSelector.languageDialog"]`)?.closest('[class*="scrollLayer"]');
      const modalContent = modalBackdropRef.current;
      
      if (scrollLayer && event.target === scrollLayer && !modalContent?.contains(event.target)) {
        handleCancel();
      }
    };
    
    // Add listener with a small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isLanguageDialogOpen]);
  
  return (
    <>
      <Menu className={classes} useArrowCursor>
        <MenuLabel className={css.menuLabel}>
          <img 
            src={getFlagImageUrl(currentCountry.code)} 
            alt={currentCountry.name}
            className={css.flag}
          />
        </MenuLabel>
        <MenuContent className={css.menuContent}>
          {Object.values(COUNTRIES).map(country => (
            <MenuItem key={country.code} className={css.menuItem}>
              <button
                className={css.countryButton}
                onClick={() => handleCountrySelect(country)}
                type="button"
              >
                <img 
                  src={getFlagImageUrl(country.code)} 
                  alt={country.name}
                  className={css.flag}
                />
                <span className={css.countryName}>
                  <FormattedMessage id={country.nameTranslationKey} />
                </span>
              </button>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
      
      {/* Language Selection Dialog (for multi-language countries) */}
      {isLanguageDialogOpen && selectedCountry && (
        <Modal
          id="LocaleSelector.languageDialog"
          isOpen={isLanguageDialogOpen}
          onClose={handleCancel}
          onManageDisableScrolling={() => {}}
          usePortal
          containerClassName={css.modalContainer}
          contentClassName={css.modalContent}
          scrollLayerClassName={css.modalScrollLayer}
        >
          <div className={css.modalContentWrapper} ref={modalBackdropRef} onClick={(e) => e.stopPropagation()}>
            <button className={css.closeButton} onClick={handleCancel} type="button" aria-label="Close">
              ×
            </button>
            
            <div className={css.dialogHeader}>
              <img 
                src={getFlagImageUrl(selectedCountry.code)} 
                alt={selectedCountry.name}
                className={css.dialogFlag}
              />
              <h2 className={css.dialogTitle}>
                <FormattedMessage id="LocaleSelector.chooseLanguage" />
              </h2>
            </div>
            
            <div className={css.languageList}>
              {selectedCountry.languages.map(locale => {
                const label = LANGUAGE_LABELS[locale];
                return (
                  <button
                    key={locale}
                    className={css.languageButton}
                    onClick={() => handleLanguageSelect(locale)}
                    type="button"
                  >
                    <span className={css.languageNative}>{label.native}</span>
                    <span className={css.languageEnglish}>{label.english}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

LocaleSelector.propTypes = {
  className: string,
  rootClassName: string,
  currentLocale: string.isRequired,
  onLocaleChange: func.isRequired,
};

export default LocaleSelector;
