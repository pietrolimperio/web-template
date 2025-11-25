import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import classNames from 'classnames';
import css from './AvailabilityCalendar.module.css';

/**
 * AvailabilityCalendar Component
 * 
 * A calendar component that shows current and next months
 * Allows date range selection or single date selection
 * All dates from today onwards are selected by default
 */
const AvailabilityCalendar = ({ 
  selectedDates = [], 
  onDatesChange,
  selectMode = 'range', // 'range' | 'exception' - determines if dates start selected or empty
  marketplaceColor = '#4A90E2',
  disabledDates = [], // Dates that cannot be selected (e.g., availability exceptions)
  readOnly = false, // If true, calendar is read-only (only navigation, no date selection)
  availableFrom = null, // Start date of availability range
  availableUntil = null, // End date of availability range
}) => {
  const intl = useIntl();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectingRange, setSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [internalSelectedDates, setInternalSelectedDates] = useState([]);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize with all future dates selected for default mode (up to 1 year)
  useEffect(() => {
    if (selectMode === 'range' && selectedDates.length === 0 && !readOnly) {
      // Auto-select all dates from today for 1 year ahead
      const futureDates = [];
      const endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year later
      
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        futureDates.push(new Date(d));
      }
      
      setInternalSelectedDates(futureDates);
      onDatesChange(futureDates);
    } else {
      setInternalSelectedDates(selectedDates);
    }
  }, [selectMode, readOnly]); // Removed selectedDates from dependencies to avoid loop

  // Separate useEffect to update internal state when selectedDates prop changes
  useEffect(() => {
    setInternalSelectedDates(selectedDates);
  }, [selectedDates]);

  // Detect screen size for showing two months on large screens
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let mediaQueryList = null;
    let updateIsLargeScreen = null;

    if (mounted) {
      // Set initial value for screens >= 1400px
      mediaQueryList = window.matchMedia('(min-width: 1400px)');
      setIsLargeScreen(mediaQueryList.matches);

      // Watch for updates
      updateIsLargeScreen = e => {
        setIsLargeScreen(e.matches);
      };
      mediaQueryList.addEventListener('change', updateIsLargeScreen);
    }

    // Clean up after ourselves
    return () => {
      if (mediaQueryList && updateIsLargeScreen) {
        mediaQueryList.removeEventListener('change', updateIsLargeScreen);
      }
    };
  }, [mounted]);

  const monthNames = [
    intl.formatMessage({ id: 'AvailabilityCalendar.january' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.february' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.march' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.april' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.may' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.june' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.july' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.august' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.september' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.october' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.november' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.december' }),
  ];

  const dayNames = [
    intl.formatMessage({ id: 'AvailabilityCalendar.sunday' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.monday' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.tuesday' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.wednesday' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.thursday' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.friday' }),
    intl.formatMessage({ id: 'AvailabilityCalendar.saturday' }),
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const isDateSelected = (date) => {
    return internalSelectedDates.some(d => 
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const isDateInPast = (date) => {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const isDateDisabled = (date) => {
    // Check if date is in disabledDates array
    if (disabledDates.some(d => 
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    )) {
      return true;
    }

    // Only apply availableFrom/availableUntil restrictions when selecting exceptions
    // This allows users to modify the main availability range freely
    if (selectMode === 'exception') {
      // Check if date is before availableFrom
      if (availableFrom) {
        const fromDate = new Date(availableFrom);
        // Extract only year, month, day for comparison (ignore time and timezone)
        const fromYear = fromDate.getFullYear();
        const fromMonth = fromDate.getMonth();
        const fromDay = fromDate.getDate();
        
        const compareDate = new Date(date);
        const compareYear = compareDate.getFullYear();
        const compareMonth = compareDate.getMonth();
        const compareDay = compareDate.getDate();
        
        // Compare dates only (year, month, day)
        if (compareYear < fromYear || 
            (compareYear === fromYear && compareMonth < fromMonth) ||
            (compareYear === fromYear && compareMonth === fromMonth && compareDay < fromDay)) {
          return true;
        }
      }

      // Check if date is after availableUntil
      if (availableUntil) {
        const untilDate = new Date(availableUntil);
        // Extract only year, month, day for comparison (ignore time and timezone)
        const untilYear = untilDate.getFullYear();
        const untilMonth = untilDate.getMonth();
        const untilDay = untilDate.getDate();
        
        const compareDate = new Date(date);
        const compareYear = compareDate.getFullYear();
        const compareMonth = compareDate.getMonth();
        const compareDay = compareDate.getDate();
        
        // Compare dates only (year, month, day)
        if (compareYear > untilYear || 
            (compareYear === untilYear && compareMonth > untilMonth) ||
            (compareYear === untilYear && compareMonth === untilMonth && compareDay > untilDay)) {
          return true;
        }
      }
    }

    return false;
  };

  const handleDateClick = (date) => {
    if (readOnly || isDateInPast(date) || isDateDisabled(date)) return;

    // Both modes now work the same way: range selection
    if (!selectingRange) {
      // Start a new range - clear previous selection
      setRangeStart(date);
      setSelectingRange(true);
      setInternalSelectedDates([date]);
      onDatesChange([date]);
    } else {
      // Complete the range
      const start = rangeStart < date ? rangeStart : date;
      const end = rangeStart < date ? date : rangeStart;
      const range = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        range.push(new Date(d));
      }
      
      setInternalSelectedDates(range);
      onDatesChange(range);
      setSelectingRange(false);
      setRangeStart(null);
    }
  };

  const navigateMonth = (direction) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    // Don't allow navigation before current month
    const targetDate = new Date(newYear, newMonth, 1);
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (targetDate < todayMonth && direction < 0) {
      return;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const renderMonth = (monthOffset) => {
    let month = currentMonth + monthOffset;
    let year = currentYear;

    if (month > 11) {
      month -= 12;
      year++;
    }

    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const weeks = [];
    let week = new Array(7).fill(null);
    let dayCounter = 1;

    // Fill first week
    for (let i = firstDay; i < 7 && dayCounter <= daysInMonth; i++) {
      week[i] = dayCounter++;
    }
    weeks.push(week);

    // Fill remaining weeks
    while (dayCounter <= daysInMonth) {
      week = new Array(7).fill(null);
      for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
        week[i] = dayCounter++;
      }
      weeks.push(week);
    }

    return (
      <div key={`${year}-${month}`} className={css.monthContainer}>
        <div className={css.monthHeader}>
          <span className={css.monthName}>
            {monthNames[month]} {year}
          </span>
        </div>

        <div className={css.dayNames}>
          {dayNames.map(name => (
            <div key={name} className={css.dayName}>
              {name}
            </div>
          ))}
        </div>

        <div className={css.daysGrid}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className={css.week}>
              {week.map((day, dayIdx) => {
                if (day === null) {
                  return <div key={dayIdx} className={css.emptyDay} />;
                }

                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0);
                const isPast = isDateInPast(date);
                const isDisabled = isDateDisabled(date);
                const isSelected = isDateSelected(date);
                const isToday = 
                  date.getFullYear() === today.getFullYear() &&
                  date.getMonth() === today.getMonth() &&
                  date.getDate() === today.getDate();

                return (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() => handleDateClick(date)}
                    disabled={isPast || isDisabled || readOnly}
                    className={classNames(css.day, {
                      [css.daySelected]: isSelected,
                      [css.dayDisabled]: isPast,
                      [css.dayUnavailable]: isDisabled,
                      [css.dayToday]: isToday,
                      [css.dayReadOnly]: readOnly,
                      [css.dayRangeStart]: selectingRange && rangeStart && 
                        date.getTime() === rangeStart.getTime(),
                    })}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const canNavigateBack = () => {
    const targetDate = new Date(currentYear, currentMonth - 1, 1);
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return targetDate >= todayMonth;
  };

  return (
    <div className={css.root} style={{ '--marketplaceColor': marketplaceColor }}>
      <div className={css.navigationHeader}>
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          disabled={!canNavigateBack()}
          className={css.navButton}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className={css.navButton}
        >
          →
        </button>
      </div>

      <div className={css.monthsContainer}>
        {renderMonth(0)}
        {isLargeScreen && renderMonth(1)}
      </div>

      {selectingRange && (
        <div className={css.rangeIndicator}>
          <FormattedMessage 
            id="AvailabilityCalendar.selectEndDate" 
            defaultMessage="Click another date to complete the range" 
          />
        </div>
      )}

      <div className={css.legend}>
        <div className={css.legendItem}>
          <div className={classNames(css.legendBox, css.legendSelected)} />
          <span>
            <FormattedMessage 
              id="AvailabilityCalendar.selected" 
              defaultMessage="Selected" 
            />
          </span>
        </div>
        <div className={css.legendItem}>
          <div className={classNames(css.legendBox, css.legendAvailable)} />
          <span>
            <FormattedMessage 
              id="AvailabilityCalendar.available" 
              defaultMessage="Available" 
            />
          </span>
        </div>
        <div className={css.legendItem}>
          <div className={classNames(css.legendBox, css.legendDisabled)} />
          <span>
            <FormattedMessage 
              id="AvailabilityCalendar.past" 
              defaultMessage="Past date" 
            />
          </span>
        </div>
        {disabledDates.length > 0 && (
          <div className={css.legendItem}>
            <div className={classNames(css.legendBox, css.legendUnavailable)} />
            <span>
              <FormattedMessage 
                id="AvailabilityCalendar.unavailable" 
                defaultMessage="Unavailable (exception)" 
              />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
