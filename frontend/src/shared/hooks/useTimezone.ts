import { useState, useEffect } from 'react'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { format } from 'date-fns'
import { settingsAPI } from '../services/api'

// Get browser's timezone as default
const getBrowserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export const useTimezone = () => {
  const [timezone, setTimezone] = useState<string>(getBrowserTimezone())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTimezone = async () => {
      try {
        const savedTimezone = await settingsAPI.getTimezone()
        if (savedTimezone) {
          setTimezone(savedTimezone)
        }
      } catch (error) {
        console.error('Error loading timezone:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTimezone()
  }, [])

  const updateTimezone = async (newTimezone: string) => {
    try {
      await settingsAPI.setTimezone(newTimezone)
      setTimezone(newTimezone)
    } catch (error) {
      console.error('Error updating timezone:', error)
      throw error
    }
  }

  // Convert UTC date string to zoned date
  const utcToZoned = (utcDateString: string | null): Date | null => {
    if (!utcDateString) return null
    try {
      // Parse UTC date string (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
      // If it's just a date (YYYY-MM-DD), treat it as midnight UTC
      const dateStr = utcDateString.includes('T') ? utcDateString : `${utcDateString}T00:00:00Z`
      const utcDate = new Date(dateStr)
      if (isNaN(utcDate.getTime())) {
        console.error('Invalid date string:', utcDateString)
        return null
      }
      return toZonedTime(utcDate, timezone)
    } catch (error) {
      console.error('Error converting UTC to zoned time:', error)
      return null
    }
  }

  // Format date in timezone
  const formatInTimezone = (date: Date | string | null, formatString: string): string => {
    if (!date) return ''
    try {
      let dateObj: Date
      if (typeof date === 'string') {
        const dateStr = date.includes('T') ? date : `${date}T00:00:00Z`
        dateObj = new Date(dateStr)
      } else {
        dateObj = date
      }
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date)
        return ''
      }
      return formatInTimeZone(dateObj, timezone, formatString)
    } catch (error) {
      console.error('Error formatting date in timezone:', error)
      return ''
    }
  }

  // Get date key (YYYY-MM-DD) in timezone from UTC date string
  const getDateKey = (utcDateString: string | null): string => {
    if (!utcDateString) return ''
    const zonedDate = utcToZoned(utcDateString)
    if (!zonedDate) return ''
    return format(zonedDate, 'yyyy-MM-dd')
  }

  return {
    timezone,
    loading,
    updateTimezone,
    utcToZoned,
    formatInTimezone,
    getDateKey,
  }
}

