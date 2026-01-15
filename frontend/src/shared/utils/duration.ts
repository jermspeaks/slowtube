/**
 * Duration utility functions for parsing and formatting video durations
 */

/**
 * Parse human-readable duration string (e.g., "1h 23m 45s") to seconds
 * @param durationString - Human-readable duration string
 * @returns Duration in seconds, or 0 if parsing fails
 */
export function parseDuration(durationString: string | null | undefined): number {
  if (!durationString || typeof durationString !== 'string') {
    return 0
  }
  
  let totalSeconds = 0
  const hourMatch = durationString.match(/(\d+)h/)
  const minuteMatch = durationString.match(/(\d+)m/)
  const secondMatch = durationString.match(/(\d+)s/)
  
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600
  if (minuteMatch) totalSeconds += parseInt(minuteMatch[1], 10) * 60
  if (secondMatch) totalSeconds += parseInt(secondMatch[1], 10)
  
  return totalSeconds
}

/**
 * Format seconds to human-readable duration string (e.g., "1h 23m 45s")
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return '-'
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0) parts.push(`${secs}s`)

  return parts.join(' ') || '0s'
}

/**
 * Format seconds to compact duration string (e.g., "1:23:45" or "23:45")
 * @param seconds - Duration in seconds
 * @returns Compact formatted duration string
 */
export function formatDurationShort(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return '-'
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Format seconds to extended duration string with months and days
 * Used for total watch time statistics
 * @param seconds - Duration in seconds
 * @returns Formatted duration string with months, days, hours, minutes, seconds
 */
export function formatDurationExtended(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return '0s'
  }
  
  const SECONDS_PER_MINUTE = 60
  const SECONDS_PER_HOUR = 3600
  const SECONDS_PER_DAY = 86400
  const SECONDS_PER_MONTH = 2592000 // 30 days

  const months = Math.floor(seconds / SECONDS_PER_MONTH)
  const days = Math.floor((seconds % SECONDS_PER_MONTH) / SECONDS_PER_DAY)
  const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const secs = seconds % SECONDS_PER_MINUTE

  const parts: string[] = []
  if (months > 0) parts.push(`${months}mo`)
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}
