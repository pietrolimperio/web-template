import React, { useState } from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';
import css from './CalendarAvailability.module.css';

/**
 * CalendarAvailability Component
 * 
 * Simplified availability management for AI listing creation flow
 * 
 * Features:
 * - Default availability (always available / specific weekdays)
 * - Exception dates (unavailable dates)
 * - Simple and fast UX
 */

const WEEKDAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const CalendarAvailability = ({ onComplete, onBack, isSubmitting }) => {
  const [availabilityMode, setAvailabilityMode] = useState('always'); // 'always' | 'weekdays' | 'custom'
  const [selectedWeekdays, setSelectedWeekdays] = useState([
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun',
  ]);
  const [exceptions, setExceptions] = useState([]);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionStartDate, setExceptionStartDate] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState('');

  const timezone = getDefaultTimeZoneOnBrowser();

  const handleWeekdayToggle = weekday => {
    if (selectedWeekdays.includes(weekday)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== weekday));
    } else {
      setSelectedWeekdays([...selectedWeekdays, weekday]);
    }
  };

  const handleAddException = () => {
    if (!exceptionStartDate) {
      alert('Please select a start date');
      return;
    }

    const endDate = exceptionEndDate || exceptionStartDate;

    // Validate dates
    if (new Date(endDate) < new Date(exceptionStartDate)) {
      alert('End date must be after start date');
      return;
    }

    const newException = {
      id: Date.now().toString(),
      startDate: exceptionStartDate,
      endDate: endDate,
    };

    setExceptions([...exceptions, newException]);
    setExceptionStartDate('');
    setExceptionEndDate('');
    setShowExceptionForm(false);
  };

  const handleRemoveException = id => {
    setExceptions(exceptions.filter(e => e.id !== id));
  };

  const handleSubmit = () => {
    // Build availability plan
    const availabilityPlan = {
      type: 'availability-plan/time',
      timezone,
      entries: [],
    };

    if (availabilityMode === 'always' || availabilityMode === 'weekdays') {
      // Create entries for selected weekdays (all day)
      const daysToInclude = availabilityMode === 'always' ? WEEKDAYS.map(d => d.key) : selectedWeekdays;

      daysToInclude.forEach(day => {
        availabilityPlan.entries.push({
          dayOfWeek: day,
          startTime: '00:00',
          endTime: '00:00', // Means 24:00 / full day
          seats: 1,
        });
      });
    }

    // Build availability exceptions
    const availabilityExceptions = exceptions.map(exc => ({
      start: new Date(exc.startDate).toISOString(),
      end: new Date(exc.endDate + 'T23:59:59').toISOString(),
      seats: 0, // 0 seats means unavailable
    }));

    onComplete({
      availabilityPlan,
      availabilityExceptions,
    });
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className={css.container}>
      <div className={css.header}>
        <h2 className={css.title}>
          <FormattedMessage id="AIListingCreation.availabilityTitle" defaultMessage="Set Availability" />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id="AIListingCreation.availabilitySubtitle"
            defaultMessage="When is your product available for rental?"
          />
        </p>
      </div>

      {/* Availability Mode Selection */}
      <div className={css.section}>
        <h3 className={css.sectionTitle}>Default Availability</h3>
        
        <div className={css.radioGroup}>
          <label className={css.radioOption}>
            <input
              type="radio"
              name="availabilityMode"
              value="always"
              checked={availabilityMode === 'always'}
              onChange={() => setAvailabilityMode('always')}
              className={css.radio}
            />
            <div className={css.radioContent}>
              <div className={css.radioLabel}>Always Available</div>
              <div className={css.radioDescription}>
                Available every day of the week (you can still add exceptions below)
              </div>
            </div>
          </label>

          <label className={css.radioOption}>
            <input
              type="radio"
              name="availabilityMode"
              value="weekdays"
              checked={availabilityMode === 'weekdays'}
              onChange={() => setAvailabilityMode('weekdays')}
              className={css.radio}
            />
            <div className={css.radioContent}>
              <div className={css.radioLabel}>Specific Weekdays</div>
              <div className={css.radioDescription}>
                Available only on selected days of the week
              </div>
            </div>
          </label>
        </div>

        {/* Weekday Selection (only if weekdays mode) */}
        {availabilityMode === 'weekdays' && (
          <div className={css.weekdaySelector}>
            {WEEKDAYS.map(day => (
              <button
                key={day.key}
                type="button"
                onClick={() => handleWeekdayToggle(day.key)}
                className={`${css.weekdayButton} ${selectedWeekdays.includes(day.key) ? css.weekdayButtonSelected : ''}`}
              >
                {day.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exceptions Section */}
      <div className={css.section}>
        <div className={css.sectionHeader}>
          <h3 className={css.sectionTitle}>Unavailable Dates (Optional)</h3>
          <button
            type="button"
            onClick={() => setShowExceptionForm(!showExceptionForm)}
            className={css.addButton}
          >
            {showExceptionForm ? '− Cancel' : '+ Add Dates'}
          </button>
        </div>

        {showExceptionForm && (
          <div className={css.exceptionForm}>
            <div className={css.dateInputs}>
              <div className={css.dateInput}>
                <label className={css.label}>Start Date</label>
                <input
                  type="date"
                  value={exceptionStartDate}
                  onChange={e => setExceptionStartDate(e.target.value)}
                  min={getTodayDate()}
                  className={css.input}
                />
              </div>
              <div className={css.dateInput}>
                <label className={css.label}>End Date (optional)</label>
                <input
                  type="date"
                  value={exceptionEndDate}
                  onChange={e => setExceptionEndDate(e.target.value)}
                  min={exceptionStartDate || getTodayDate()}
                  className={css.input}
                  placeholder="Same as start date"
                />
              </div>
            </div>
            <button type="button" onClick={handleAddException} className={css.addExceptionButton}>
              Add Exception
            </button>
          </div>
        )}

        {/* Exceptions List */}
        {exceptions.length > 0 && (
          <div className={css.exceptionsList}>
            {exceptions.map(exception => (
              <div key={exception.id} className={css.exceptionItem}>
                <div className={css.exceptionDates}>
                  <span className={css.exceptionDate}>{formatDate(exception.startDate)}</span>
                  {exception.endDate !== exception.startDate && (
                    <>
                      <span className={css.exceptionSeparator}>→</span>
                      <span className={css.exceptionDate}>{formatDate(exception.endDate)}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveException(exception.id)}
                  className={css.removeExceptionButton}
                  aria-label="Remove exception"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {exceptions.length === 0 && !showExceptionForm && (
          <p className={css.emptyMessage}>No exceptions added. Your product will be available according to the default availability above.</p>
        )}
      </div>

      {/* Footer Actions */}
      <div className={css.footer}>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className={css.secondaryButton}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (availabilityMode === 'weekdays' && selectedWeekdays.length === 0)}
          className={css.primaryButton}
        >
          {isSubmitting ? (
            <>
              <div className={css.spinner} />
              Saving...
            </>
          ) : (
            'Continue to Preview →'
          )}
        </button>
      </div>
    </div>
  );
};

export default CalendarAvailability;
