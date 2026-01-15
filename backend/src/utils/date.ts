/**
 * Normalize an episode air date to 20:00 UTC (8pm UTC)
 * TV shows typically air in the evening, so storing dates at 20:00 UTC
 * ensures they appear on the correct day when converted to different timezones.
 * 
 * @param airDate - Date string in YYYY-MM-DD format or ISO format
 * @returns Date string in ISO format with 20:00:00 UTC, or null if input is null/empty
 */
export function normalizeAirDate(airDate: string | null | undefined): string | null {
  if (!airDate) return null
  
  // If it's already in ISO format with a time, use it as-is
  if (airDate.includes('T')) {
    return airDate
  }
  
  // If it's just a date (YYYY-MM-DD), convert to 20:00 UTC
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(airDate)) {
    console.warn(`Invalid air date format: ${airDate}, using as-is`)
    return airDate
  }
  
  return `${airDate}T20:00:00Z`
}

/**
 * Format a date to a string
 * @param date - Date object or ISO string
 * @param format - Format string (default: 'YYYY-MM-DD')
 *   - 'YYYY-MM-DD' - ISO date format
 *   - 'YYYY-MM-DD HH:mm:ss' - ISO datetime format
 *   - 'RFC3339' - RFC 3339 format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date')
  }
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  const seconds = String(dateObj.getSeconds()).padStart(2, '0')
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    case 'RFC3339':
      return dateObj.toISOString()
    default:
      // Simple format string replacement
      return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds)
  }
}

/**
 * Parse a date string to a Date object
 * @param dateString - Date string in various formats
 * @returns Date object or null if parsing fails
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null
  }
  
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    return null
  }
  
  return date
}

