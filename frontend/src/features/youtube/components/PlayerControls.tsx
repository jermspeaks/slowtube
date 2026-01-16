import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Volume2, VolumeX, Play, Pause } from 'lucide-react'

interface PlayerControlsProps {
  playbackSpeed: number
  onSpeedChange: (speed: number) => void
  volume: number
  onVolumeChange: (volume: number) => void
  isMuted: boolean
  onMuteToggle: () => void
  isPlaying: boolean
  onPlayPause: () => void
  startTime: number | null
  endTime: number | null
  onStartTimeChange: (time: number | null) => void
  onEndTimeChange: (time: number | null) => void
  lightMode: boolean
  onLightModeToggle: () => void
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

function PlayerControls({
  playbackSpeed,
  onSpeedChange,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  isPlaying,
  onPlayPause,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  lightMode,
  onLightModeToggle,
}: PlayerControlsProps) {
  const [showMarkers, setShowMarkers] = useState(false)

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseTime = (timeStr: string): number | null => {
    if (!timeStr.trim()) return null
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10)
      const secs = parseInt(parts[1], 10)
      if (!isNaN(mins) && !isNaN(secs)) {
        return mins * 60 + secs
      }
    }
    const seconds = parseInt(timeStr, 10)
    if (!isNaN(seconds)) return seconds
    return null
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Play/Pause */}
        <Button variant="outline" size="sm" onClick={onPlayPause}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Playback Speed */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Speed:</label>
          <select
            value={playbackSpeed.toString()}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="px-2 py-1 text-sm border rounded bg-background w-24"
          >
            {SPEED_OPTIONS.map((speed) => (
              <option key={speed} value={speed.toString()}>
                {speed}x
              </option>
            ))}
          </select>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <Button variant="ghost" size="sm" onClick={onMuteToggle}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume * 100}
            onChange={(e) => onVolumeChange(parseInt(e.target.value, 10) / 100)}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

        {/* Light Mode Toggle */}
        <Button variant="outline" size="sm" onClick={onLightModeToggle}>
          {lightMode ? 'Light' : 'Normal'}
        </Button>

        {/* Time Markers Toggle */}
        <Button variant="outline" size="sm" onClick={() => setShowMarkers(!showMarkers)}>
          Markers
        </Button>
      </div>

      {/* Time Markers */}
      {showMarkers && (
        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Start:</label>
            <input
              type="text"
              value={formatTime(startTime)}
              onChange={(e) => onStartTimeChange(parseTime(e.target.value))}
              placeholder="MM:SS"
              className="px-2 py-1 text-sm border rounded w-20"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartTimeChange(null)}
              className="h-7"
            >
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">End:</label>
            <input
              type="text"
              value={formatTime(endTime)}
              onChange={(e) => onEndTimeChange(parseTime(e.target.value))}
              placeholder="MM:SS"
              className="px-2 py-1 text-sm border rounded w-20"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEndTimeChange(null)}
              className="h-7"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerControls
