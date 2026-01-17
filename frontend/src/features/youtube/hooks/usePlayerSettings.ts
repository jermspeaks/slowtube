import { useState, useEffect, useCallback } from 'react'
import { videosAPI } from '../services/api'

interface PlayerSettings {
  start_time_seconds: number | null
  end_time_seconds: number | null
  playback_speed: number
  volume: number
  autoplay_next: boolean
}

interface UsePlayerSettingsOptions {
  videoId: number
  enabled?: boolean
}

export function usePlayerSettings({ videoId, enabled = true }: UsePlayerSettingsOptions) {
  const [settings, setSettings] = useState<PlayerSettings>({
    start_time_seconds: null,
    end_time_seconds: null,
    playback_speed: 1.0,
    volume: 1.0,
    autoplay_next: true,
  })
  const [loading, setLoading] = useState(true)

  // Load initial settings
  useEffect(() => {
    if (!enabled || !videoId) return

    const loadSettings = async () => {
      try {
        setLoading(true)
        const data = await videosAPI.getPlayerSettings(videoId)
        setSettings({
          start_time_seconds: data.start_time_seconds ?? null,
          end_time_seconds: data.end_time_seconds ?? null,
          playback_speed: data.playback_speed ?? 1.0,
          volume: data.volume ?? 1.0,
          autoplay_next: data.autoplay_next ?? true,
        })
      } catch (error) {
        console.error('Error loading player settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [videoId, enabled])

  // Update settings
  const updateSettings = useCallback(
    async (updates: Partial<PlayerSettings>) => {
      if (!enabled || !videoId) return

      try {
        await videosAPI.updatePlayerSettings(videoId, updates)
        setSettings((prev) => ({ ...prev, ...updates }))
      } catch (error) {
        console.error('Error updating player settings:', error)
        throw error
      }
    },
    [videoId, enabled]
  )

  return {
    settings,
    loading,
    updateSettings,
  }
}
