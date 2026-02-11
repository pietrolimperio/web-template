/**
 * Helpers for deriving available/disabled dates from timeslots.
 * Used by ProductPage and PreviewListingPage calendars.
 */

import { addTime, getStartOf, stringifyDateToISO8601, subtractTime } from './dates';
import { timeSlotsPerDate } from './generators';

/**
 * Converts timeslots to availableDates and disabledDates for AvailabilityCalendar.
 * A day is available if it has at least one timeslot with seats > 0.
 *
 * @param {Array} timeSlots - Array of timeslot entities from sdk.timeslots.query
 * @param {Date} rangeStart - Start of date range
 * @param {Date} rangeEnd - End of date range (inclusive)
 * @param {Object} publicData - Listing publicData (availableFrom, availableUntil)
 * @param {String} timeZone - IANA timezone
 * @returns {{ availableDates: Date[], disabledDates: Date[] }}
 */
export const timeSlotsToAvailableDisabledDates = (
  timeSlots,
  rangeStart,
  rangeEnd,
  publicData,
  timeZone,
  options = {}
) => {
  let start = getStartOf(rangeStart, 'day', timeZone);
  let end = getStartOf(rangeEnd, 'day', timeZone, 1, 'days');

  if (publicData?.availableFrom) {
    const fromDate = getStartOf(new Date(publicData.availableFrom), 'day', timeZone);
    if (fromDate > start) start = fromDate;
  }

  if (publicData?.availableUntil) {
    const untilDate = getStartOf(new Date(publicData.availableUntil), 'day', timeZone);
    if (untilDate < end) end = getStartOf(untilDate, 'day', timeZone, 1, 'days');
  }

  const slotOptions = {};
  if (options.minDurationStartingInDay) {
    slotOptions.minDurationStartingInDay = options.minDurationStartingInDay;
  }
  if (options.seats) {
    slotOptions.seats = options.seats;
  }

  const slotsData = timeSlotsPerDate(start, end, timeSlots || [], timeZone, slotOptions);
  const availableDates = [];
  const disabledDates = [];

  const current = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() - 1);

  while (current <= endDate) {
    const dateObj = new Date(current);
    dateObj.setHours(0, 0, 0, 0);
    const dayId = stringifyDateToISO8601(dateObj, timeZone);
    const dayData = slotsData[dayId];

    if (dayData?.hasAvailability) {
      availableDates.push(new Date(dateObj));
    } else {
      disabledDates.push(new Date(dateObj));
    }
    current.setDate(current.getDate() + 1);
  }

  return { availableDates, disabledDates };
};

/**
 * Expands disabled dates by adding padding days before and after each unavailable block.
 * Use for booking scenarios where extra days are needed (e.g. 1 day before for shipping, 1 day after for return).
 *
 * @param {Date[]} availableDates
 * @param {Date[]} disabledDates
 * @param {number} paddingStart - Extra days to mark unavailable before each disabled date
 * @param {number} paddingEnd - Extra days to mark unavailable after each disabled date
 * @param {Date} rangeStart - Don't add dates before this
 * @param {Date} rangeEnd - Don't add dates after this (inclusive)
 * @param {String} timeZone
 * @returns {{ availableDates: Date[], disabledDates: Date[] }}
 */
export const applyUnavailabilityPadding = (
  availableDates,
  disabledDates,
  paddingStart,
  paddingEnd,
  rangeStart,
  rangeEnd,
  timeZone
) => {
  if ((!paddingStart && !paddingEnd) || disabledDates.length === 0) {
    return { availableDates, disabledDates };
  }

  const dayStart = d => getStartOf(d, 'day', timeZone).getTime();
  const disabledSet = new Set(disabledDates.map(dayStart));
  const rangeStartTime = dayStart(rangeStart);
  const rangeEndTime = dayStart(rangeEnd);

  disabledDates.forEach(d => {
    const baseDate = getStartOf(d, 'day', timeZone);
    for (let i = 1; i <= paddingStart; i++) {
      const padDate = subtractTime(baseDate, i, 'days', timeZone);
      const padTime = dayStart(padDate);
      if (padTime >= rangeStartTime && padTime <= rangeEndTime) {
        disabledSet.add(padTime);
      }
    }
    for (let i = 1; i <= paddingEnd; i++) {
      const padDate = addTime(baseDate, i, 'days', timeZone);
      const padTime = dayStart(padDate);
      if (padTime >= rangeStartTime && padTime <= rangeEndTime) {
        disabledSet.add(padTime);
      }
    }
  });

  const paddedDisabled = Array.from(disabledSet).map(t => new Date(t));
  const paddedDisabledSet = new Set(disabledSet);
  const paddedAvailable = availableDates.filter(d => !paddedDisabledSet.has(getStartOf(d, 'day', timeZone).getTime()));

  return { availableDates: paddedAvailable, disabledDates: paddedDisabled };
};
