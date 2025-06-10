import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import isTodayPlugin from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(isTodayPlugin);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);

/**
 * Format a date using the specified format
 * @param date Date to format
 * @param formatStr Format string (optional, defaults to 'MMM DD, YYYY')
 * @returns Formatted date string
 */
export function format(date: Date | string | number, formatStr: string = 'MMM DD, YYYY'): string {
  return dayjs(date).format(formatStr);
}

/**
 * Format the relative time from now
 * @param date Date to format
 * @param options Options object (addSuffix: true to include ago/in)
 * @returns Formatted relative time string (e.g. "2 days ago", "in 3 hours")
 */
export function formatDistanceToNow(
  date: Date | string | number, 
  options?: { addSuffix?: boolean }
): string {
  // dayjs fromNow() already includes the suffix by default
  return dayjs(date).fromNow();
}

/**
 * Check if the given date is in the past
 * @param date Date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  return dayjs(date).isBefore(dayjs());
}

/**
 * Get the difference in days between two dates
 * @param dateLeft Later date
 * @param dateRight Earlier date
 * @returns Number of days difference
 */
export function differenceInDays(dateLeft: Date | string | number, dateRight: Date | string | number): number {
  return dayjs(dateLeft).diff(dayjs(dateRight), 'day');
}

/**
 * Add days to a date
 * @param date The date to add days to
 * @param amount Number of days to add
 * @returns New date with added days
 */
export function addDays(date: Date | string | number, amount: number): Date {
  return dayjs(date).add(amount, 'day').toDate();
}

/**
 * Subtract days from a date
 * @param date The date to subtract days from
 * @param amount Number of days to subtract
 * @returns New date with subtracted days
 */
export function subDays(date: Date | string | number, amount: number): Date {
  return dayjs(date).subtract(amount, 'day').toDate();
}

/**
 * Parse ISO date string to Date object
 * @param dateString ISO date string
 * @returns Date object
 */
export function parseISO(dateString: string): Date {
  return dayjs(dateString).toDate();
}

/**
 * Safely parse any date string and handle Postgres timestamp formats
 * @param dateString Date string in any supported format
 * @returns Valid Date object or null if invalid
 */
export function safeParse(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null;
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? null : dateString;
  }
  
  // Handle Postgres timestamp format which might be missing the 'T' separator
  // Example: "2025-05-07 13:51:17.328"
  if (typeof dateString === 'string' && 
      dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
    // Convert to ISO format by replacing the space with 'T'
    dateString = dateString.replace(' ', 'T');
  }
  
  const parsedDate = dayjs(dateString);
  
  // Check if the date is valid
  if (!parsedDate.isValid()) return null;
  
  return parsedDate.toDate();
}

/**
 * Check if two dates are the same day
 * @param dateLeft First date
 * @param dateRight Second date
 * @returns True if dates are the same day
 */
export function isSameDay(dateLeft: Date | string | number, dateRight: Date | string | number): boolean {
  return dayjs(dateLeft).isSame(dayjs(dateRight), 'day');
}

/**
 * Check if date is today
 * @param date Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string | number): boolean {
  return dayjs(date).isToday();
}

/**
 * Compare two dates and returns a number based on their order
 * @param dateLeft First date
 * @param dateRight Second date
 * @returns -1 if dateLeft is after dateRight, 1 if dateLeft is before dateRight, 0 if they're the same
 */
export function compareDesc(dateLeft: Date | string | number, dateRight: Date | string | number): number {
  const a = dayjs(dateLeft);
  const b = dayjs(dateRight);
  
  if (a.isAfter(b)) return -1;
  if (a.isBefore(b)) return 1;
  return 0;
}

/**
 * Get the start of the week for a given date
 * @param date Date to get the start of the week for
 * @returns Date object representing the start of the week
 */
export function startOfWeek(date: Date | string | number): Date {
  return dayjs(date).startOf('week').toDate();
}

export default {
  format,
  formatDistanceToNow,
  isPast,
  differenceInDays,
  addDays,
  subDays,
  parseISO,
  safeParse,
  isSameDay,
  isToday,
  compareDesc,
  startOfWeek
};