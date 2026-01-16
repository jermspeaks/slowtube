import { useState, useEffect, useCallback, useRef } from 'react'
import { videosAPI } from '../services/api'

interface UseVideoProgressOptions {
  videoId: number
  enabled?: boolean
  debounceMs?: number
}

export function useVideoProgress({ videoId, enabled = true, debounceMs = 5000 }: UseVideoProgressOptions) {
  const [progress, setProgress] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedProgressRef = useRef<number>(0)

  // Load initial progress
  useEffect(() => {
    if (!enabled || !videoId) return

    const loadProgress = async () => {
      try {
        setLoading(true)
        const data = await videosAPI.getProgress(videoId)
        setProgress(data.progress_seconds || 0)
        lastSavedProgressRef.current = data.progress_seconds || 0
      } catch (error) {
        console.error('Error loading video progress:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [videoId, enabled])

  // Save progress with debouncing
  const saveProgress = useCallback(
    async (progressSeconds: number) => {
      if (!enabled || !videoId) return
      
      // Validate progress value
      if (
        typeof progressSeconds !== 'number' ||
        isNaN(progressSeconds) ||
        !isFinite(progressSeconds) ||
        progressSeconds < 0
      ) {
        console.warn('Invalid progress value, skipping save:', progressSeconds)
        return
      }
      
      if (Math.abs(progressSeconds - lastSavedProgressRef.current) < 1) return // Don't save if change is less than 1 second

      setProgress(progressSeconds)

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(async () => {
        try {
          await videosAPI.updateProgress(videoId, progressSeconds)
          lastSavedProgressRef.current = progressSeconds
        } catch (error) {
          console.error('Error saving video progress:', error)
        }
      }, debounceMs)
    },
    [videoId, enabled, debounceMs]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    progress,
    loading,
    saveProgress,
  }
}
