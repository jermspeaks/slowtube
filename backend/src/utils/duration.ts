/**
 * Duration utility functions for parsing and formatting video durations
 */

/**
 * Parse YouTube ISO 8601 duration format (e.g., "PT1H23M45S") to seconds
 * @param iso - ISO 8601 duration string
 * @returns Duration in seconds, or 0 if parsing fails
 */
export function parseDurationISO8601(iso: string): number {
  if (!iso || typeof iso !== 'string') return 0
  
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Parse human-readable duration string (e.g., "1h 23m 45s") to seconds
 * @param duration - Human-readable duration string
 * @returns Duration in seconds, or 0 if parsing fails
 */
export function parseDurationToSeconds(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0
  
  let totalSeconds = 0
  const hourMatch = duration.match(/(\d+)h/)
  const minuteMatch = duration.match(/(\d+)m/)
  const secondMatch = duration.match(/(\d+)s/)
  
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
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s'
  
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
export function formatDurationShort(seconds: number): string {
  if (seconds < 0) return '0:00'
  
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
export function formatDurationExtended(seconds: number): string {
  if (seconds < 0) return '0s'
  
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

/**
 * Convert YouTube ISO 8601 duration format to human-readable format
 * This is a convenience function that combines parsing and formatting
 * @param iso - ISO 8601 duration string
 * @returns Human-readable duration string
 */
export function parseDuration(iso: string): string {
  const seconds = parseDurationISO8601(iso)
  if (seconds === 0 && iso) {
    // If parsing failed, return original string
    return iso
  }
  return formatDuration(seconds)
}

/**
 * Check if a video is a YouTube Short (≤60 seconds)
 * @param duration - Duration string (ISO 8601 or human-readable)
 * @returns true if duration is ≤60 seconds
 */
export function isShortVideo(duration: string | null): boolean {
  if (!duration || typeof duration !== 'string') return false
  
  // Try parsing as ISO 8601 first
  let seconds = parseDurationISO8601(duration)
  
  // If that fails, try parsing as human-readable
  if (seconds === 0 && duration !== '0s') {
    seconds = parseDurationToSeconds(duration)
  }
  
  return seconds > 0 && seconds <= 60
}
