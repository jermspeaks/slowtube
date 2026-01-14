import { useState, useEffect } from 'react'
import { settingsAPI } from '../services/api'

// Get system preference
const getSystemPreference = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Apply theme to document
const applyTheme = (theme: 'system' | 'light' | 'dark') => {
  const root = document.documentElement
  const effectiveTheme = theme === 'system' ? getSystemPreference() : theme
  
  if (effectiveTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useTheme = () => {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await settingsAPI.getTheme()
        if (savedTheme) {
          setTheme(savedTheme)
          applyTheme(savedTheme)
        } else {
          // Default to system
          applyTheme('system')
        }
      } catch (error) {
        console.error('Error loading theme:', error)
        // Default to system on error
        applyTheme('system')
      } finally {
        setLoading(false)
      }
    }

    loadTheme()
  }, [])

  // Listen to system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      applyTheme('system')
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [theme])

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const updateTheme = async (newTheme: 'system' | 'light' | 'dark') => {
    try {
      await settingsAPI.setTheme(newTheme)
      setTheme(newTheme)
    } catch (error) {
      console.error('Error updating theme:', error)
      throw error
    }
  }

  return {
    theme,
    loading,
    updateTheme,
  }
}

