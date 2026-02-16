import React from 'react';
import classNames from 'classnames';

import { IconArrowHead } from '../../../components';

import { getMonths } from './DatePicker.helpers';

import css from './DatePicker.module.css';

// IconArrowHead component might not be defined if exposed directly to the file.
// This component is called before IconArrowHead component in components/index.js
const PrevIcon = props => (
  <IconArrowHead {...props} direction="left" rootClassName={css.arrowIcon} />
);
const NextIcon = props => (
  <IconArrowHead {...props} direction="right" rootClassName={css.arrowIcon} />
);

const DatePickerHeader = props => {
  const {
    monthClassName,
    currentDate,
    showMonthStepper,
    showPreviousMonthStepper,
    showNextMonthStepper,
    showYearStepper,
    nextMonth,
    previousMonth,
    nextYear,
    previousYear,
    disabled,
    intl,
  } = props;

  const getTitle = () => {
    if (!currentDate) {
      return;
    }

    const dateFormattingOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };

    return intl.formatDate(currentDate, dateFormattingOptions);
  };

  return (
    <div className={css.header}>
      <span aria-atomic="true" aria-live="polite" className={css.hidden}>
        {getTitle()}
      </span>

      {showYearStepper ? (
        <button
          aria-label={intl.formatMessage({ id: 'DatePicker.screenreader.previousYearButton' })}
          className={css.previousYearButton}
          disabled={disabled}
          onClick={previousYear}
          type="button"
        >
          <span className={css.yearArrowIcon}>«</span>
        </button>
      ) : null}

      {showMonthStepper && showPreviousMonthStepper ? (
        <button
          aria-label={intl.formatMessage({ id: 'DatePicker.screenreader.previousMonthButton' })}
          className={css.previousMonthButton}
          disabled={disabled}
          onClick={previousMonth}
          type="button"
        >
          <PrevIcon />
        </button>
      ) : showMonthStepper ? (
        <span className={css.previousMonthSpacer}></span>
      ) : null}

      <span className={css.currentMonth}>
        <strong className={classNames(css.monthName, monthClassName)}>
          {getMonths(intl)[currentDate.getMonth()]} {currentDate.getFullYear()}
        </strong>
      </span>

      {showMonthStepper && showNextMonthStepper ? (
        <button
          aria-label={intl.formatMessage({ id: 'DatePicker.screenreader.nextMonthButton' })}
          className={css.nextMonthButton}
          disabled={disabled}
          onClick={nextMonth}
          type="button"
        >
          <NextIcon />
        </button>
      ) : showMonthStepper ? (
        <span className={css.nextMonthSpacer}></span>
      ) : null}

      {showYearStepper ? (
        <button
          aria-label={intl.formatMessage({ id: 'DatePicker.screenreader.nextYearButton' })}
          className={css.nextYearButton}
          disabled={disabled}
          onClick={nextYear}
          type="button"
        >
          <span className={css.yearArrowIcon}>»</span>
        </button>
      ) : null}
    </div>
  );
};

export default DatePickerHeader;
