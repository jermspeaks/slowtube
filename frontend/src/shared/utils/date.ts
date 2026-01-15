import { format, formatDistanceToNow } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

/**
 * Format a date to a string
 * @param date - Date object or ISO string
 * @param formatType - Format type: 'short' (MMM d, yyyy), 'long' (EEEE, MMMM d, yyyy), 'relative' (X ago), 'datetime' (MMM d, yyyy HH:mm), or custom date-fns format string
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatType: 'short' | 'long' | 'relative' | 'datetime' | string = 'short',
  timezone?: string
): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return '-'
  }

  // Handle relative format
  if (formatType === 'relative') {
    return formatDistanceToNow(dateObj, { addSuffix: true })
  }

  // Determine format string based on type
  let formatString: string
  switch (formatType) {
    case 'short':
      formatString = 'MMM d, yyyy'
      break
    case 'long':
      formatString = 'EEEE, MMMM d, yyyy'
      break
    case 'datetime':
      formatString = 'MMM d, yyyy HH:mm'
      break
    default:
      formatString = formatType
  }

  // Use timezone-aware formatting if timezone is provided
  if (timezone) {
    return formatInTimeZone(dateObj, timezone, formatString)
  }

  return format(dateObj, formatString)
}

/**
 * Format a date and time to a string
 * @param date - Date object or ISO string
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  timezone?: string
): string {
  return formatDate(date, 'datetime', timezone)
}

/**
 * Format a date to a short string (MMM d, yyyy)
 * @param date - Date object or ISO string
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Formatted date string
 */
export function formatDateShort(
  date: Date | string | null | undefined,
  timezone?: string
): string {
  return formatDate(date, 'short', timezone)
}

/**
 * Format a date to a long string (EEEE, MMMM d, yyyy)
 * @param date - Date object or ISO string
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Formatted date string
 */
export function formatDateLong(
  date: Date | string | null | undefined,
  timezone?: string
): string {
  return formatDate(date, 'long', timezone)
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function formatDateRelative(
  date: Date | string | null | undefined
): string {
  return formatDate(date, 'relative')
}

/**
 * Format a date to yyyy-MM-dd format (for date inputs)
 * @param date - Date object or ISO string
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Formatted date string in yyyy-MM-dd format
 */
export function formatDateInput(
  date: Date | string | null | undefined,
  timezone?: string
): string {
  return formatDate(date, 'yyyy-MM-dd', timezone)
}
