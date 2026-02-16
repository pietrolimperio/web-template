import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import classNames from 'classnames';

import { OutsideClickHandler } from '../../../components';

import { getISODateString, getStartOfDay, isValidDateString } from './DatePicker.helpers';

// Auto-insert "/" when typing DD/MM/YYYY: after 2 digits (day), after 4 digits (month)
const formatWithAutoSlash = str => {
  const digits = str.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits + (digits.length === 2 ? '/' : '');
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2) + (digits.length === 4 ? '/' : '');
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
};
import DatePicker from './DatePicker';

import css from './SingleDatepicker.module.css';

const dateFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

export const SingleDatePicker = props => {
  const intl = useIntl();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const justClosedRef = useRef(false);
  const [dateData, setDateData] = useState({
    date: props.value || null,
    formatted: props.value ? intl.formatDate(props.value, dateFormatOptions) : '',
  });
  const element = useRef(null);

  const {
    className,
    rootClassName,
    inputClassName,
    popupClassName,
    id,
    name,
    placeholderText,
    isDayBlocked,
    onChange,
    value,
    readOnly,
    ...rest
  } = props;

  // If value has changed, update internal state
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && value?.getTime() !== dateData?.date?.getTime()) {
      // If mounted, changes to value should be reflected to 'date' state
      setDateData({
        date: value,
        formatted: value ? intl.formatDate(value, dateFormatOptions) : '',
      });
    }
  }, [mounted, value]);

  const pickerId = `${id}_SingleDatePicker`;

  const classes = classNames(rootClassName || css.root, className, css.outsideClickWrapper);
  const startDateMaybe =
    dateData.date instanceof Date && !isNaN(dateData.date)
      ? { startDate: getISODateString(dateData.date) }
      : {};

  const handleChange = value => {
    const startOfDay = value ? getStartOfDay(value) : null;
    setDateData({
      date: startOfDay,
      formatted: startOfDay ? intl.formatDate(startOfDay, dateFormatOptions) : '',
    });
    justClosedRef.current = true;
    setIsOpen(false);

    if (element.current) {
      const inputEl = element.current.querySelector('input');
      if (inputEl) inputEl.focus();
    }

    if (onChange) {
      onChange(startOfDay);
    }
  };

  const handleOnChangeOnInput = e => {
    const inputStr = e.target.value;
    if (!inputStr) {
      setDateData({ date: null, formatted: inputStr });
      if (onChange) onChange(null);
      return;
    }

    const formattedWithSlash = formatWithAutoSlash(inputStr);

    if (isValidDateString(formattedWithSlash)) {
      const d = getStartOfDay(new Date(formattedWithSlash));
      setDateData({ date: d, formatted: intl.formatDate(d, dateFormatOptions) });
      setIsOpen(false);
      if (onChange) onChange(d);
      return;
    }

    setDateData({ date: dateData.date, formatted: formattedWithSlash });
  };

  const handleBlur = () => {
    setIsOpen(false);
  };

  const handleKeyDown = e => {
    // Gather all escape presses to close menu
    if (e.key === 'Escape') {
      toggleOpen(false);
    }
  };
  const handleOnKeyDownOnInput = e => {
    if (e.key === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      toggleOpen();
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && dateData.formatted) {
      e.preventDefault();
      setDateData({ date: null, formatted: '' });
      if (onChange) onChange(null);
    }
  };

  const toggleOpen = enforcedState => {
    if (enforcedState) {
      setIsOpen(enforcedState);
    } else {
      setIsOpen(prevState => !prevState);
    }
  };

  const handleFocus = () => {
    if (justClosedRef.current) {
      justClosedRef.current = false;
      return;
    }
    if (!props.disabled && !readOnly) {
      setIsOpen(true);
    }
  };

  const disabled = props.disabled;
  const inputProps = {
    type: 'text',
    onChange: handleOnChangeOnInput,
    onKeyDown: handleOnKeyDownOnInput,
    onFocus: handleFocus,
    ...(readOnly ? { readOnly } : {}),
    ...(disabled ? { disabled } : {}),
  };

  return (
    <OutsideClickHandler className={classes} onOutsideClick={handleBlur}>
      <div id={pickerId} onKeyDown={handleKeyDown} ref={element}>
        <div
          className={classNames(css.inputWrapper, {
            [css.open]: isOpen,
            [inputClassName]: inputClassName,
          })}
          onClick={toggleOpen}
        >
          <input
            id={id}
            className={classNames(css.input, { [css.inputPlaceholder]: !value })}
            placeholder={placeholderText}
            value={dateData.formatted}
            {...inputProps}
          />
        </div>

        <div className={popupClassName || css.popup}>
          {isOpen ? (
            <DatePicker
              range={false}
              showMonthStepper={true}
              hasFocusOnMount={false}
              onChange={handleChange}
              onDaySelect={() => setIsOpen(false)}
              isDayBlocked={isDayBlocked}
              value={dateData.date}
              {...startDateMaybe}
              {...rest}
            />
          ) : null}
        </div>
      </div>
    </OutsideClickHandler>
  );
};

export default SingleDatePicker;
