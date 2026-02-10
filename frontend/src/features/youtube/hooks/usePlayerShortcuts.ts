import { useEffect, useCallback } from 'react'

interface UsePlayerShortcutsOptions {
  enabled?: boolean
  onPlayPause?: () => void
  onSeekBackward?: () => void
  onSeekForward?: () => void
  onVolumeUp?: () => void
  onVolumeDown?: () => void
  onMute?: () => void
  onFullscreen?: () => void
  onSpeedDecrease?: () => void
  onSpeedIncrease?: () => void
  onNext?: () => void
  onPrevious?: () => void
  onToggleState?: () => void
  onClose?: () => void
  onShowHelp?: () => void
}

export function usePlayerShortcuts({
  enabled = true,
  onPlayPause,
  onSeekBackward,
  onSeekForward,
  onVolumeUp,
  onVolumeDown,
  onMute,
  onFullscreen,
  onSpeedDecrease,
  onSpeedIncrease,
  onNext,
  onPrevious,
  onToggleState,
  onClose,
  onShowHelp,
}: UsePlayerShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Handle shortcuts
      switch (event.key) {
        case ' ':
          event.preventDefault()
          onPlayPause?.()
          break
        case 'ArrowLeft':
          event.preventDefault()
          onSeekBackward?.()
          break
        case 'ArrowRight':
          event.preventDefault()
          onSeekForward?.()
          break
        case 'ArrowUp':
          event.preventDefault()
          onVolumeUp?.()
          break
        case 'ArrowDown':
          event.preventDefault()
          onVolumeDown?.()
          break
        case 'm':
        case 'M':
          event.preventDefault()
          onMute?.()
          break
        case 'f':
        case 'F':
          event.preventDefault()
          onFullscreen?.()
          break
        case '[':
          event.preventDefault()
          onSpeedDecrease?.()
          break
        case ']':
          event.preventDefault()
          onSpeedIncrease?.()
          break
        case 'n':
        case 'N':
          event.preventDefault()
          onNext?.()
          break
        case 'p':
        case 'P':
          event.preventDefault()
          onPrevious?.()
          break
        case 'o':
        case 'O':
          event.preventDefault()
          onToggleState?.()
          break
        case 'Escape':
          event.preventDefault()
          onClose?.()
          break
        case '?':
          event.preventDefault()
          onShowHelp?.()
          break
      }
    },
    [
      enabled,
      onPlayPause,
      onSeekBackward,
      onSeekForward,
      onVolumeUp,
      onVolumeDown,
      onMute,
      onFullscreen,
      onSpeedDecrease,
      onSpeedIncrease,
      onNext,
      onPrevious,
      onToggleState,
      onClose,
      onShowHelp,
    ]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
