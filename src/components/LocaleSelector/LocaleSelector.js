import React from 'react';
import { bool, func, string } from 'prop-types';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';
import { COUNTRIES, LANGUAGE_LABELS, getCountryFromLocale } from '../../config/localeConfig';

import Menu from '../Menu/Menu';
import MenuLabel from '../MenuLabel/MenuLabel';
import MenuContent from '../MenuContent/MenuContent';
import MenuItem from '../MenuItem/MenuItem';

import css from './LocaleSelector.module.css';

// Build a flat list: one entry per locale across all countries
const ALL_LOCALE_ITEMS = Object.values(COUNTRIES).flatMap(country =>
  country.languages.map(locale => ({ locale, countryCode: country.code, countryName: country.name }))
);

const getFlagImageUrl = countryCode =>
  `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

const LocaleSelector = ({
  className = null,
  rootClassName = null,
  currentLocale,
  onLocaleChange,
  showLabel = false,
}) => {
  const intl = useIntl();
  const classes = classNames(rootClassName || css.root, className);

  const currentCountry = getCountryFromLocale(currentLocale) || COUNTRIES.IT;

  const visibleItems = ALL_LOCALE_ITEMS.filter(item => item.locale !== currentLocale);

  return (
    <Menu className={classes} useArrowCursor>
      <MenuLabel className={css.menuLabel} isOpenClassName={css.menuLabelOpen}>
        <img
          src={getFlagImageUrl(currentCountry.code)}
          alt={currentCountry.name}
          className={css.flag}
        />
        {showLabel && LANGUAGE_LABELS[currentLocale] && (
          <span className={css.currentLanguageLabel}>
            {intl.formatMessage({ id: LANGUAGE_LABELS[currentLocale].translationKey })}
          </span>
        )}
      </MenuLabel>
      <MenuContent className={css.menuContent}>
        {visibleItems.map(({ locale, countryCode, countryName }) => {
          const label = LANGUAGE_LABELS[locale];
          if (!label) return null;
          return (
            <MenuItem key={locale} className={css.menuItem}>
              <button
                className={css.countryButton}
                onClick={() => onLocaleChange(locale)}
                type="button"
              >
                <img
                  src={getFlagImageUrl(countryCode)}
                  alt={countryName}
                  className={css.flag}
                />
                <span className={css.countryName}>
                  {intl.formatMessage({ id: label.translationKey })}
                </span>
              </button>
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
};

LocaleSelector.propTypes = {
  className: string,
  rootClassName: string,
  currentLocale: string.isRequired,
  onLocaleChange: func.isRequired,
  showLabel: bool,
};

export default LocaleSelector;
