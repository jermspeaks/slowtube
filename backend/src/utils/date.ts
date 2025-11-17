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

