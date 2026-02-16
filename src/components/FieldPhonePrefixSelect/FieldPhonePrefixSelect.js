/**
 * Phone prefix select with flag images (from flagcdn.com).
 * Uses real flag images instead of emoji for better cross-platform compatibility.
 */

import React, { useState, useRef } from 'react';
import { Field } from 'react-final-form';
import classNames from 'classnames';

import ValidationError from '../ValidationError/ValidationError';
import OutsideClickHandler from '../OutsideClickHandler/OutsideClickHandler';

import css from './FieldPhonePrefixSelect.module.css';

const FLAG_CDN_URL = 'https://flagcdn.com/w20';
const getFlagSrc = countryCode =>
  countryCode ? `${FLAG_CDN_URL}/${countryCode.toLowerCase()}.png` : null;

const FieldPhonePrefixSelectComponent = props => {
  const {
    className,
    selectClassName,
    id,
    label,
    input,
    meta,
    options,
    ...rest
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  const { value, onChange } = input;
  const { valid, invalid, touched, error } = meta;
  const hasError = touched && invalid && error;

  const selectedOption = options.find(opt => opt.code === value) || options[0];

  const selectClasses = classNames(selectClassName, css.select, {
    [css.selectError]: hasError,
  });
  const labelClasses = classNames({ [css.labelDisabled]: rest.showLabelAsDisabled });

  return (
    <OutsideClickHandler
      className={classNames(css.root, className)}
      onOutsideClick={() => setIsOpen(false)}
    >
      {label ? (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      ) : null}
      <div
        ref={selectRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        id={id}
        tabIndex={0}
        className={selectClasses}
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
      >
        <div className={css.selectedOption}>
          <img
            src={getFlagSrc(selectedOption.country)}
            alt=""
            className={css.flag}
          />
          <span className={css.code}>{selectedOption.code}</span>
          <span className={css.arrow}>▾</span>
        </div>
        {isOpen && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            className={css.dropdown}
            aria-label={label}
          >
            {options.map(opt => (
              <li
                key={opt.code}
                role="option"
                aria-selected={opt.code === value}
                className={classNames(css.option, {
                  [css.optionSelected]: opt.code === value,
                })}
                onClick={e => {
                  e.stopPropagation();
                  onChange(opt.code);
                  setIsOpen(false);
                }}
              >
                <img
                  src={getFlagSrc(opt.country)}
                  alt=""
                  className={css.flag}
                />
                <span className={css.code}>{opt.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ValidationError fieldMeta={meta} />
    </OutsideClickHandler>
  );
};

/**
 * Field component for phone prefix selection with flag images.
 *
 * @param {Object} props
 * @param {Array} props.options - Array of { code, country, label }
 * @returns {JSX.Element}
 */
const FieldPhonePrefixSelect = props => {
  return <Field component={FieldPhonePrefixSelectComponent} {...props} />;
};

export default FieldPhonePrefixSelect;
