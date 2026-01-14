import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Hook to preserve scroll position when navigating between routes
 * Saves scroll position to sessionStorage before navigation
 * Restores scroll position after content loads
 */
export function usePreserveScrollPosition(loading: boolean) {
  const location = useLocation()
  const hasRestoredRef = useRef(false)
  const scrollKey = `scrollPos:${location.pathname}`

  // Find the scroll container (main element in DashboardLayout)
  const getScrollContainer = (): HTMLElement | null => {
    return document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement | null
  }

  // Save scroll position to sessionStorage
  const saveScrollPosition = () => {
    const container = getScrollContainer()
    if (container) {
      sessionStorage.setItem(scrollKey, container.scrollTop.toString())
    }
  }

  // Restore scroll position from sessionStorage
  const restoreScrollPosition = () => {
    const container = getScrollContainer()
    if (!container) return

    const savedPosition = sessionStorage.getItem(scrollKey)
    if (savedPosition !== null) {
      const scrollTop = parseInt(savedPosition, 10)
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        container.scrollTop = scrollTop
        // Don't clear immediately - keep it for when user navigates back
        // It will be overwritten when navigating away
      })
    }
  }

  // Restore scroll position when loading completes
  useEffect(() => {
    if (!loading && !hasRestoredRef.current) {
      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(() => {
        restoreScrollPosition()
        hasRestoredRef.current = true
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [loading, scrollKey])

  // Reset restoration flag when route changes
  useEffect(() => {
    hasRestoredRef.current = false
  }, [location.pathname])

  return { saveScrollPosition }
}
