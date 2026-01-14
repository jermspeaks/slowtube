import { useEffect, useRef } from 'react'

interface UseAutoRefreshOptions {
  onRefresh: () => Promise<void>
  intervalHours?: number
}

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export function useAutoRefresh({ onRefresh, intervalHours = 24 }: UseAutoRefreshOptions) {
  const lastRefreshRef = useRef<number | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkAndRefresh = async () => {
    const now = Date.now()
    const intervalMs = intervalHours * 60 * 60 * 1000

    // Check if we need to refresh
    if (lastRefreshRef.current === null || now - lastRefreshRef.current >= intervalMs) {
      try {
        await onRefresh()
        lastRefreshRef.current = now
        // Store last refresh time in localStorage
        localStorage.setItem('lastVideoRefresh', now.toString())
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }
  }

  useEffect(() => {
    // Load last refresh time from localStorage
    const lastRefresh = localStorage.getItem('lastVideoRefresh')
    if (lastRefresh) {
      lastRefreshRef.current = parseInt(lastRefresh, 10)
    }

    // Check immediately on mount
    checkAndRefresh()

    // Check every hour if refresh is needed
    checkIntervalRef.current = setInterval(() => {
      checkAndRefresh()
    }, 60 * 60 * 1000) // Check every hour

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [onRefresh, intervalHours])

  const manualRefresh = async () => {
    try {
      await onRefresh()
      lastRefreshRef.current = Date.now()
      localStorage.setItem('lastVideoRefresh', lastRefreshRef.current.toString())
    } catch (error) {
      console.error('Manual refresh failed:', error)
      throw error
    }
  }

  return { manualRefresh }
}

