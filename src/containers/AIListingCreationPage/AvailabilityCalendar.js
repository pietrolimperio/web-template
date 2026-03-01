import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import classNames from 'classnames';
import css from './AvailabilityCalendar.module.css';

/**
 * AvailabilityCalendar Component
 * 
 * A calendar component that shows current and next months
 * Allows date range selection or single date selection
 * All dates from today onwards are selected by default (unless autoSelectDates is false)
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
  singleMonth = false, // If true, always show only one month regardless of screen size
  autoSelectDates = true, // If false, calendar starts without any dates selected
  onMonthsContainerClick = null, // Optional click handler for monthsContainer
  maxBookingDays = null, // If set (e.g. 80), range selection is capped to this many days (inclusive)
  ignoreDisabledDates = false, // If true, disabled dates are informational only
}) => {
  const intl = useIntl();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectingRange, setSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [internalSelectedDates, setInternalSelectedDates] = useState([]);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);

  const canBypassDisabled = selectMode === 'exception' || ignoreDisabledDates;
  const getDayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const disabledDaySet = useMemo(() => {
    if (!disabledDates || disabledDates.length === 0) {
      return new Set();
    }
    return new Set(
      disabledDates.map(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return getDayKey(date);
      })
    );
  }, [disabledDates]);

  const firstDisabledAfterStart = useMemo(() => {
    if (!selectingRange || !rangeStart || canBypassDisabled || !disabledDates || disabledDates.length === 0) {
      return null;
    }
    const startTime = rangeStart.getTime();
    let candidate = null;
    disabledDates.forEach(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      const time = date.getTime();
      if (time > startTime && (!candidate || time < candidate.getTime())) {
        candidate = date;
      }
    });
    return candidate;
  }, [disabledDates, canBypassDisabled, rangeStart, selectingRange]);

  // Initialize with all future dates selected for default mode (up to 1 year)
  useEffect(() => {
    if (selectMode === 'range' && selectedDates.length === 0 && !readOnly && autoSelectDates) {
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
  }, [selectMode, readOnly, autoSelectDates]); // Removed selectedDates from dependencies to avoid loop

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

  // When selecting a range, dates more than (maxBookingDays - 1) days after rangeStart cannot be chosen as end
  const isDateBeyondMaxRange = (date) => {
    if (!maxBookingDays || !selectingRange || !rangeStart) return false;
    const startDay = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysDiff = Math.round((dateDay - startDay) / (24 * 60 * 60 * 1000));
    return daysDiff >= maxBookingDays;
  };

  const isDateDisabled = date => {
    if (disabledDaySet.has(getDayKey(date))) {
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

  // Check if date is the start of the range
  const isRangeStart = (date) => {
    if (!rangeStart && !rangeEnd) return false;
    const start = rangeStart && rangeEnd 
      ? (rangeStart < rangeEnd ? rangeStart : rangeEnd)
      : rangeStart;
    return start && date.getTime() === start.getTime();
  };

  // Check if date is the end of the range
  const isRangeEnd = (date) => {
    if (!rangeEnd) return false;
    const end = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return date.getTime() === end.getTime();
  };

  // Check if date is in the middle of the range (not start or end)
  const isInRange = (date) => {
    if (!rangeStart || !rangeEnd) return false;
    const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return date > start && date < end;
  };

  // Check if date would be in the preview range (when hovering during selection)
  const isInPreviewRange = (date) => {
    if (!selectingRange || !rangeStart || !hoveredDate) return false;
    let start = rangeStart < hoveredDate ? rangeStart : hoveredDate;
    let end = rangeStart < hoveredDate ? hoveredDate : rangeStart;
    if (maxBookingDays) {
      const maxEnd = new Date(start);
      maxEnd.setDate(maxEnd.getDate() + maxBookingDays - 1);
      if (end > maxEnd) end = new Date(maxEnd);
    }
    if (date < start || date > end) return false;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateToCheck = new Date(d);
      dateToCheck.setHours(0, 0, 0, 0);
      if (!canBypassDisabled) {
        const afterFirstDisabled =
          firstDisabledAfterStart && dateToCheck.getTime() > firstDisabledAfterStart.getTime();
        if (isDateDisabled(dateToCheck) || isDateInPast(dateToCheck) || afterFirstDisabled) return false;
      } else if (isDateInPast(dateToCheck)) {
        return false;
      }
    }
    return true;
  };

  // Check if this would be the preview end date (capped when maxBookingDays set)
  const isPreviewEnd = (date) => {
    if (!selectingRange || !rangeStart || !hoveredDate) return false;
    let end = rangeStart < hoveredDate ? hoveredDate : rangeStart;
    if (maxBookingDays) {
      const start = rangeStart < hoveredDate ? rangeStart : hoveredDate;
      const maxEnd = new Date(start);
      maxEnd.setDate(maxEnd.getDate() + maxBookingDays - 1);
      if (end > maxEnd) end = new Date(maxEnd);
    }
    const sameDay =
      date.getDate() === end.getDate() &&
      date.getMonth() === end.getMonth() &&
      date.getFullYear() === end.getFullYear();
    const isStart =
      date.getDate() === rangeStart.getDate() &&
      date.getMonth() === rangeStart.getMonth() &&
      date.getFullYear() === rangeStart.getFullYear();
    return sameDay && !isStart;
  };

  const handleDateClick = date => {
    const dateIsDisabled = isDateDisabled(date);
    const tempBlocked =
      !canBypassDisabled &&
      selectingRange &&
      firstDisabledAfterStart &&
      date.getTime() > firstDisabledAfterStart.getTime();

    if (readOnly || isDateInPast(date)) return;
    if (!canBypassDisabled && (dateIsDisabled || tempBlocked)) return;
    if (maxBookingDays && selectingRange && rangeStart && isDateBeyondMaxRange(date)) return;

    // If there's already a complete range and user clicks on any date, clear and start new selection
    if (rangeStart && rangeEnd && !selectingRange) {
      setRangeStart(date);
      setRangeEnd(null);
      setSelectingRange(true);
      setInternalSelectedDates([date]);
      onDatesChange([date]);
      return;
    }

    // Both modes now work the same way: range selection
    if (!selectingRange) {
      // Start a new range - clear previous selection
      setRangeStart(date);
      setRangeEnd(null);
      setSelectingRange(true);
      setInternalSelectedDates([date]);
      onDatesChange([date]);
    } else {
      // Complete the range - check if all dates in range are available
      const start = rangeStart < date ? rangeStart : date;
      let end = rangeStart < date ? date : rangeStart;

      // Cap range at maxBookingDays when set
      if (maxBookingDays) {
        const maxEnd = new Date(start);
        maxEnd.setDate(maxEnd.getDate() + maxBookingDays - 1);
        maxEnd.setHours(23, 59, 59, 999);
        if (end > maxEnd) end = maxEnd;
      }

      const range = [];

      // Build the range and check for disabled dates
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateToCheck = new Date(d);
        dateToCheck.setHours(0, 0, 0, 0);

        if (!canBypassDisabled) {
          const afterFirstDisabled =
            firstDisabledAfterStart && dateToCheck.getTime() > firstDisabledAfterStart.getTime();
          if (isDateDisabled(dateToCheck) || isDateInPast(dateToCheck) || afterFirstDisabled) {
            setInternalSelectedDates([rangeStart]);
            onDatesChange([rangeStart]);
            setSelectingRange(true);
            return;
          }
        }

        range.push(new Date(d));
      }

      // Cap at maxBookingDays (safety)
      const finalRange =
        maxBookingDays && range.length > maxBookingDays ? range.slice(0, maxBookingDays) : range;

      setInternalSelectedDates(finalRange);
      onDatesChange(finalRange);
      const endDate = finalRange.length > 0 ? finalRange[finalRange.length - 1] : end;
      setRangeStart(start);
      setRangeEnd(endDate);
      setSelectingRange(false);

      // If end date is in a different month, switch the calendar view to that month
      const endMonth = endDate.getMonth();
      const endYear = endDate.getFullYear();
      if (endMonth !== currentMonth || endYear !== currentYear) {
        setCurrentMonth(endMonth);
        setCurrentYear(endYear);
      }
    }
  };

  const handleDateHover = date => {
    if (readOnly || isDateInPast(date)) {
      setHoveredDate(null);
      return;
    }

    if (!canBypassDisabled) {
      const tempBlocked =
        selectingRange &&
        firstDisabledAfterStart &&
        date.getTime() > firstDisabledAfterStart.getTime();
      if (isDateDisabled(date) || tempBlocked) {
        setHoveredDate(null);
        return;
      }
    }

    // When maxBookingDays is set, don't show hover for dates beyond the allowed range
    if (maxBookingDays && selectingRange && rangeStart && isDateBeyondMaxRange(date)) {
      setHoveredDate(null);
      return;
    }

    // If selecting a range, check if the hovered date would create a valid range
    if (selectingRange && rangeStart) {
      const start = rangeStart < date ? rangeStart : date;
      const end = rangeStart < date ? date : rangeStart;
      
      // Check if all dates in the potential range would be available
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateToCheck = new Date(d);
        dateToCheck.setHours(0, 0, 0, 0);
        if (!canBypassDisabled) {
          const afterFirstDisabled =
            firstDisabledAfterStart && dateToCheck.getTime() > firstDisabledAfterStart.getTime();
          if (isDateDisabled(dateToCheck) || isDateInPast(dateToCheck) || afterFirstDisabled) {
            setHoveredDate(null);
            return;
          }
        } else if (isDateInPast(dateToCheck)) {
          setHoveredDate(null);
          return;
        }
      }
    }
    
    setHoveredDate(date);
  };

  const handleDateLeave = () => {
    setHoveredDate(null);
  };

  const resetSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setSelectingRange(false);
    setInternalSelectedDates([]);
    setHoveredDate(null);
    onDatesChange([]);
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
    const useFixedFiveWeeks = singleMonth || !isLargeScreen;

    let weeks;
    if (useFixedFiveWeeks) {
      // Single-month view: always 5 weeks, fill with previous/next month days for consistent height
      const firstDateInGrid = new Date(year, month, 1 - firstDay);
      const WEEKS_COUNT = 5;
      const DAYS_PER_WEEK = 7;
      const totalCells = WEEKS_COUNT * DAYS_PER_WEEK;
      const allDays = [];
      for (let i = 0; i < totalCells; i++) {
        const date = new Date(firstDateInGrid);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);
        const isCurrentMonth = date.getMonth() === month && date.getFullYear() === year;
        allDays.push({ date, isCurrentMonth });
      }
      weeks = [];
      for (let w = 0; w < WEEKS_COUNT; w++) {
        weeks.push(allDays.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));
      }
    } else {
      // Two-month view: only current month days, empty cells for padding (no previous/next month days)
      weeks = [];
      let week = new Array(7).fill(null);
      let dayCounter = 1;
      for (let i = firstDay; i < 7 && dayCounter <= daysInMonth; i++) {
        week[i] = dayCounter++;
      }
      weeks.push(week);
      while (dayCounter <= daysInMonth) {
        week = new Array(7).fill(null);
        for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
          week[i] = dayCounter++;
        }
        weeks.push(week);
      }
    }

    const renderDayCell = (dayInfoOrDayNum) => {
      const isFixedGrid = useFixedFiveWeeks;
      const date = isFixedGrid
        ? dayInfoOrDayNum.date
        : new Date(year, month, dayInfoOrDayNum);
      const isCurrentMonth = isFixedGrid ? dayInfoOrDayNum.isCurrentMonth : true;

      if (!isFixedGrid && typeof dayInfoOrDayNum !== 'number') {
        return null;
      }

      /* In single-month view, days of previous/next month are full buttons with availability (unavailable shown correctly) */
      const dateNorm = isFixedGrid ? date : new Date(year, month, dayInfoOrDayNum);
      dateNorm.setHours(0, 0, 0, 0);

      const isPast = isDateInPast(dateNorm);
      const isDisabled = isDateDisabled(dateNorm);
      const isSelected = isDateSelected(dateNorm);
      const isToday =
        dateNorm.getFullYear() === today.getFullYear() &&
        dateNorm.getMonth() === today.getMonth() &&
        dateNorm.getDate() === today.getDate();
      const isStart = isRangeStart(dateNorm);
      const isEnd = isRangeEnd(dateNorm);
      const inRange = isInRange(dateNorm);
      const inPreview = isInPreviewRange(dateNorm);
      const previewEnd = isPreviewEnd(dateNorm);
      const isSingleDay = rangeStart && rangeEnd && rangeStart.getTime() === rangeEnd.getTime();
      const isHoveredWithRange =
        hoveredDate &&
        dateNorm.getTime() === hoveredDate.getTime() &&
        rangeStart &&
        rangeEnd &&
        !selectingRange;
      const handleDayClick = (e) => {
        if (readOnly && onMonthsContainerClick) {
          e.preventDefault();
          onMonthsContainerClick(e);
        } else {
          handleDateClick(dateNorm);
        }
      };
      const isBeyondMax =
        maxBookingDays && selectingRange && rangeStart && isDateBeyondMaxRange(dateNorm);
      const tempBlocked =
        !canBypassDisabled &&
        selectingRange &&
        rangeStart &&
        firstDisabledAfterStart &&
        dateNorm.getTime() > firstDisabledAfterStart.getTime();
      const lockedUnavailable = !canBypassDisabled && isDisabled;
      const isDayDisabled =
        isPast ||
        lockedUnavailable ||
        tempBlocked ||
        isBeyondMax ||
        (readOnly && !onMonthsContainerClick);

      return (
        <button
          key={dateNorm.getTime()}
          type="button"
          onClick={handleDayClick}
          onMouseEnter={() => handleDateHover(dateNorm)}
          onMouseLeave={handleDateLeave}
          disabled={isDayDisabled}
          className={classNames(css.day, {
            [css.dayOtherMonth]: isFixedGrid && !isCurrentMonth,
            [css.daySelected]: isSelected && !isStart && !isEnd && !inRange,
            [css.dayRangeStart]: isStart && !isSingleDay,
            [css.dayRangeEnd]: isEnd && !isSingleDay,
            [css.daySingleSelected]: isSingleDay && isStart,
            [css.dayInRange]: inRange,
            [css.dayPreview]: inPreview && selectingRange && !isStart,
            [css.dayPreviewEnd]: previewEnd,
            [css.dayDisabled]: isPast,
            [css.dayUnavailable]: isDisabled || isBeyondMax,
            [css.dayUnavailableLocked]: lockedUnavailable || (!canBypassDisabled && isBeyondMax),
            [css.dayTempUnavailable]: tempBlocked,
            [css.dayToday]: isToday,
            [css.dayReadOnly]: readOnly,
            [css.dayHoverClear]: isHoveredWithRange,
          })}
          style={readOnly && onMonthsContainerClick && !isDayDisabled ? { cursor: 'pointer' } : undefined}
        >
          {dateNorm.getDate()}
        </button>
      );
    };

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
              {week.map((dayInfoOrDayNum, dayIdx) => {
                if (useFixedFiveWeeks) {
                  return renderDayCell(dayInfoOrDayNum);
                }
                if (dayInfoOrDayNum === null) {
                  return <div key={`${weekIdx}-${dayIdx}`} className={css.emptyDay} />;
                }
                return renderDayCell(dayInfoOrDayNum);
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

      <div 
        className={css.monthsContainer}
        onClick={(e) => {
          // Don't trigger if clicking on a button (day buttons will handle their own clicks, nav buttons, etc.)
          if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
          }
          // Trigger the handler if clicking on the container background or month container areas
          if (onMonthsContainerClick) {
            onMonthsContainerClick(e);
          }
        }}
        style={onMonthsContainerClick ? { cursor: 'pointer' } : undefined}
      >
        {renderMonth(0)}
        {!singleMonth && isLargeScreen && renderMonth(1)}
      </div>

      {selectingRange && (
        <div className={css.rangeIndicator}>
          <FormattedMessage 
            id="AvailabilityCalendar.selectEndDate" 
            defaultMessage="Click another date to complete the range" 
          />
          {rangeStart && (
            <div className={css.rangeIndicatorActions}>
              <button type="button" className={css.rangeIndicatorLink} onClick={resetSelection}>
                <FormattedMessage
                  id="AvailabilityCalendar.resetSelection"
                  defaultMessage="Reset selection"
                />
              </button>
            </div>
          )}
        </div>
      )}

      <div className={css.legend}>
        <div className={css.legendItem}>
          <div className={classNames(css.legendBox, css.legendStartEnd)} />
          <span>
            <FormattedMessage 
              id="AvailabilityCalendar.startEnd" 
              defaultMessage="Start / End" 
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
