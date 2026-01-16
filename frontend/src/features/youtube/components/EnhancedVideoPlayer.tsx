import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import ReactPlayer from 'react-player'
import { Video } from '../types/video'

interface EnhancedVideoPlayerProps {
  video: Video
  onProgress?: (progress: number) => void
  onEnded?: () => void
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onError?: (error: Error) => void
  initialProgress?: number
  playbackSpeed?: number
  volume?: number
  startTime?: number | null
  endTime?: number | null
  lightMode?: boolean
}

const EnhancedVideoPlayer = forwardRef<any, EnhancedVideoPlayerProps>(
  (
    {
      video,
      onProgress,
      onEnded,
      onReady,
      onPlay,
      onPause,
      onError,
      initialProgress,
      playbackSpeed = 1.0,
      volume = 1.0,
      startTime,
      endTime,
      lightMode = false,
    },
    ref
  ) => {
    const playerRef = useRef<ReactPlayer>(null)
    const [playing, setPlaying] = useState(false)
    const [hasSeekedToStart, setHasSeekedToStart] = useState(false)
    const [hasReachedEnd, setHasReachedEnd] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)

  // Skip player for unavailable or failed videos
  if (video.fetch_status === 'unavailable' || video.fetch_status === 'failed') {
    return (
      <div className="w-full pt-[56.25%] relative bg-muted rounded flex items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          {video.thumbnail_url && (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover rounded opacity-50"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
            <p className="text-white text-sm font-medium">Video unavailable</p>
          </div>
        </div>
      </div>
    )
  }

  // Handle missing youtube_id
  if (!video.youtube_id) {
    return (
      <div className="w-full pt-[56.25%] relative bg-muted rounded flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Video ID not available</p>
        </div>
      </div>
    )
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`

  // Seek to start time when video is ready
  useEffect(() => {
    if (startTime !== null && startTime !== undefined && startTime > 0 && !hasSeekedToStart && playerRef.current) {
      const player = playerRef.current.getInternalPlayer() as any
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(startTime, true)
        setHasSeekedToStart(true)
      }
    }
  }, [startTime, hasSeekedToStart])

  // Seek to initial progress when video is ready
  useEffect(() => {
    if (initialProgress !== undefined && initialProgress > 0 && !hasSeekedToStart && playerRef.current) {
      const player = playerRef.current.getInternalPlayer() as any
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(initialProgress, true)
        setHasSeekedToStart(true)
      }
    }
  }, [initialProgress, hasSeekedToStart])

  // Check for end time
  const handleProgress = useCallback(
    (state: { played: number; playedSeconds: number }) => {
      if (onProgress) {
        onProgress(state.playedSeconds)
      }

      // Update current time
      setCurrentTime(state.playedSeconds)
      
      // Note: Progress saving is handled by the parent component via onProgress callback

      // Check if we've reached the end time
      if (endTime !== null && endTime !== undefined && state.playedSeconds >= endTime && !hasReachedEnd) {
        setHasReachedEnd(true)
        setPlaying(false)
        if (onEnded) {
          // Small delay to ensure the pause is registered
          setTimeout(() => {
            onEnded()
          }, 100)
        }
      }
    },
    [onProgress, saveProgress, endTime, hasReachedEnd, onEnded]
  )

  const handleReady = useCallback(() => {
    if (onReady) {
      onReady()
    }
  }, [onReady])

  const handlePlay = useCallback(() => {
    setPlaying(true)
    if (onPlay) {
      onPlay()
    }
  }, [onPlay])

  const handlePause = useCallback(() => {
    setPlaying(false)
    if (onPause) {
      onPause()
    }
  }, [onPause])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    setHasReachedEnd(true)
    if (onEnded) {
      onEnded()
    }
  }, [onEnded])

  const handleError = useCallback(
    (error: Error) => {
      console.error('Video player error:', error)
      if (onError) {
        onError(error)
      }
    },
    [onError]
  )

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    seekTo: (seconds: number) => {
      if (playerRef.current) {
        const player = playerRef.current.getInternalPlayer() as any
        if (player && typeof player.seekTo === 'function') {
          player.seekTo(seconds, true)
        }
      }
    },
    getCurrentTime: () => currentTime,
  }))

  return (
    <div className={`w-full pt-[56.25%] relative bg-black rounded overflow-hidden ${lightMode ? 'player-light-mode' : ''}`}>
      <div className="absolute top-0 left-0 w-full h-full">
        <ReactPlayer
          ref={playerRef}
          url={youtubeUrl}
          playing={playing}
          controls={true}
          width="100%"
          height="100%"
          playbackRate={playbackSpeed}
          volume={volume}
          onProgress={handleProgress}
          onReady={handleReady}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
                start: startTime ? Math.floor(startTime) : undefined,
              },
            },
          }}
        />
      </div>
    </div>
  )
  }
)

EnhancedVideoPlayer.displayName = 'EnhancedVideoPlayer'

export default EnhancedVideoPlayer
