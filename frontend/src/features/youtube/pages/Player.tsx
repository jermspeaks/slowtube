import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { Video, VideoState } from '../types/video'
import { videosAPI } from '../services/api'
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer'
import PlayerControls from '../components/PlayerControls'
import PlayerMetadata from '../components/PlayerMetadata'
import PlayerNavigation from '../components/PlayerNavigation'
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp'
import { useVideoProgress } from '../hooks/useVideoProgress'
import { usePlayerSettings } from '../hooks/usePlayerSettings'
import { usePlayerShortcuts } from '../hooks/usePlayerShortcuts'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft, HelpCircle } from 'lucide-react'

function Player() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoId = searchParams.get('id')
  const listType = searchParams.get('list') || 'inbox'
  const listId = searchParams.get('listId')

  const [video, setVideo] = useState<Video | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [lightMode, setLightMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [metadataCollapsed, setMetadataCollapsed] = useState(false)
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null)
  const playerRef = useRef<any>(null)

  const { progress, loading: progressLoading, saveProgress } = useVideoProgress({
    videoId: video ? video.id : 0,
    enabled: !!video,
  })

  const { settings, loading: settingsLoading, updateSettings } = usePlayerSettings({
    videoId: video ? video.id : 0,
    enabled: !!video,
  })

  // Load video list based on list type
  useEffect(() => {
    const loadVideoList = async () => {
      try {
        let response
        if (listType === 'inbox') {
          response = await videosAPI.getAll('inbox', undefined, 'published_at', 'desc', undefined, 1, 1000)
        } else if (listType === 'feed') {
          response = await videosAPI.getAll('feed', undefined, 'published_at', 'desc', undefined, 1, 1000)
        } else if (listType === 'archive') {
          response = await videosAPI.getAll('archive', undefined, 'published_at', 'desc', undefined, 1, 1000)
        } else if (listType === 'channel' && listId) {
          // Load channel videos - would need channel API
          response = await videosAPI.getAll(undefined, undefined, 'published_at', 'desc', undefined, 1, 1000)
        } else if (listType === 'channel-list' && listId) {
          // Load channel list videos - would need channel list API
          response = await videosAPI.getAll(undefined, undefined, 'published_at', 'desc', undefined, 1, 1000)
        } else {
          response = await videosAPI.getAll('inbox', undefined, 'published_at', 'desc', undefined, 1, 1000)
        }

        const videoList = response.videos || []
        setVideos(videoList)

        // Find current video index
        if (videoId) {
          const index = videoList.findIndex((v) => v.id === parseInt(videoId, 10))
          setCurrentIndex(index >= 0 ? index : 0)
        }
      } catch (error) {
        console.error('Error loading video list:', error)
        toast.error('Failed to load video list')
      }
    }

    loadVideoList()
  }, [listType, listId])

  // Update current index when videoId changes
  useEffect(() => {
    if (videoId && videos.length > 0) {
      const index = videos.findIndex((v) => v.id === parseInt(videoId, 10))
      if (index >= 0) {
        setCurrentIndex(index)
      }
    }
  }, [videoId, videos])

  // Load current video
  useEffect(() => {
    const loadVideo = async () => {
      if (!videoId) {
        navigate('/youtube/watch-next')
        return
      }

      try {
        setLoading(true)
        const videoData = await videosAPI.getById(parseInt(videoId, 10))
        setVideo(videoData)
      } catch (error) {
        console.error('Error loading video:', error)
        toast.error('Failed to load video')
        navigate('/youtube/watch-next')
      } finally {
        setLoading(false)
      }
    }

    loadVideo()
  }, [videoId, navigate])

  // Navigation handlers
  const handlePrevious = useCallback(async () => {
    if (currentIndex <= 0 || videos.length === 0) return

    const previousVideo = videos[currentIndex - 1]
    navigate(`/youtube/player?id=${previousVideo.id}&list=${listType}${listId ? `&listId=${listId}` : ''}`)
  }, [currentIndex, videos, navigate, listType, listId])

  const handleNext = useCallback(async () => {
    if (currentIndex >= videos.length - 1 || videos.length === 0) return

    const nextVideo = videos[currentIndex + 1]
    navigate(`/youtube/player?id=${nextVideo.id}&list=${listType}${listId ? `&listId=${listId}` : ''}`)
  }, [currentIndex, videos, navigate, listType, listId])

  // State change handler
  const handleStateChange = useCallback(
    async (newState: VideoState) => {
      if (!video) return

      try {
        await videosAPI.updateState(video.id, newState)
        setVideo({ ...video, state: newState })
        toast.success(`Video moved to ${newState}`)
      } catch (error) {
        console.error('Error updating state:', error)
        toast.error('Failed to update video state')
      }
    },
    [video]
  )

  // Playback handlers
  const handlePlay = useCallback(() => {
    console.log('[Player] handlePlay called')
    setIsPlaying(true)
  }, [])

  const handlePause = useCallback(() => {
    console.log('[Player] handlePause called')
    setIsPlaying(false)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (settings.autoplay_next && currentIndex < videos.length - 1) {
      // Start countdown
      let countdown = 5
      setAutoplayCountdown(countdown)
      const interval = setInterval(() => {
        countdown--
        setAutoplayCountdown(countdown)
        if (countdown <= 0) {
          clearInterval(interval)
          setAutoplayCountdown(null)
          handleNext()
        }
      }, 1000)
    }
  }, [settings.autoplay_next, currentIndex, videos.length, handleNext])

  // Seek handlers
  const handleSeekBackward = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      const currentTime = progress || 0
      playerRef.current.seekTo(Math.max(0, currentTime - 10))
    }
  }, [progress])

  const handleSeekForward = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      const currentTime = progress || 0
      playerRef.current.seekTo(currentTime + 10)
    }
  }, [progress])

  // Volume handlers
  const handleVolumeChange = useCallback(
    async (newVolume: number) => {
      setIsMuted(false)
      await updateSettings({ volume: newVolume })
    },
    [updateSettings]
  )

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleVolumeUp = useCallback(async () => {
    const newVolume = Math.min(1, (isMuted ? 0 : settings.volume) + 0.1)
    await handleVolumeChange(newVolume)
  }, [isMuted, settings.volume, handleVolumeChange])

  const handleVolumeDown = useCallback(async () => {
    const newVolume = Math.max(0, (isMuted ? 0 : settings.volume) - 0.1)
    await handleVolumeChange(newVolume)
  }, [isMuted, settings.volume, handleVolumeChange])

  // Speed handlers
  const handleSpeedChange = useCallback(
    async (newSpeed: number) => {
      await updateSettings({ playback_speed: newSpeed })
    },
    [updateSettings]
  )

  const handleSpeedDecrease = useCallback(async () => {
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    const currentIndex = speeds.indexOf(settings.playback_speed)
    if (currentIndex > 0) {
      await handleSpeedChange(speeds[currentIndex - 1])
    }
  }, [settings.playback_speed, handleSpeedChange])

  const handleSpeedIncrease = useCallback(async () => {
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    const currentIndex = speeds.indexOf(settings.playback_speed)
    if (currentIndex < speeds.length - 1) {
      await handleSpeedChange(speeds[currentIndex + 1])
    }
  }, [settings.playback_speed, handleSpeedChange])

  // Time marker handlers
  const handleStartTimeChange = useCallback(
    async (time: number | null) => {
      await updateSettings({ start_time_seconds: time })
    },
    [updateSettings]
  )

  const handleEndTimeChange = useCallback(
    async (time: number | null) => {
      await updateSettings({ end_time_seconds: time })
    },
    [updateSettings]
  )

  // Fullscreen handler
  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  // Keyboard shortcuts
  usePlayerShortcuts({
    enabled: true,
    onPlayPause: () => {
      if (isPlaying) {
        handlePause()
      } else {
        handlePlay()
      }
    },
    onSeekBackward: handleSeekBackward,
    onSeekForward: handleSeekForward,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onMute: handleMuteToggle,
    onFullscreen: handleFullscreen,
    onSpeedDecrease: handleSpeedDecrease,
    onSpeedIncrease: handleSpeedIncrease,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onToggleState: () => {
      if (video) {
        const transitions: VideoState[] = ['feed', 'inbox', 'archive']
        const currentStateIndex = transitions.indexOf(video.state || 'inbox')
        const nextState = transitions[(currentStateIndex + 1) % transitions.length]
        handleStateChange(nextState)
      }
    },
    onClose: () => {
      navigate('/youtube/watch-next')
    },
    onShowHelp: () => {
      setShowHelp(true)
    },
  })

  if (loading || progressLoading || settingsLoading || !video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading video...</div>
      </div>
    )
  }

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < videos.length - 1

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/youtube/watch-next')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold">Video Player</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            aria-label="Show keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          {autoplayCountdown !== null && (
            <div className="text-sm text-muted-foreground">
              Next video in {autoplayCountdown}s...
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      <div className={lightMode ? 'player-light-mode' : ''}>
        {(() => {
          console.log('[Player] Rendering EnhancedVideoPlayer with props', {
            videoId: video.id,
            youtubeId: video.youtube_id,
            isPlaying,
            progress,
            playbackSpeed: settings.playback_speed,
            volume: isMuted ? 0 : settings.volume,
            startTime: settings.start_time_seconds,
            endTime: settings.end_time_seconds,
          })
          return (
            <EnhancedVideoPlayer
              ref={playerRef}
              video={video}
              playing={isPlaying}
              onProgress={(progressSeconds) => {
                // Save progress (debounced in hook)
                saveProgress(progressSeconds)
              }}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              initialProgress={progress}
              playbackSpeed={settings.playback_speed}
              volume={isMuted ? 0 : settings.volume}
              startTime={settings.start_time_seconds}
              endTime={settings.end_time_seconds}
              lightMode={lightMode}
            />
          )
        })()}
      </div>

      {/* Controls */}
      <PlayerControls
        playbackSpeed={settings.playback_speed}
        onSpeedChange={handleSpeedChange}
        volume={settings.volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        isPlaying={isPlaying}
        onPlayPause={() => {
          console.log('[Player] PlayPause button clicked', { currentIsPlaying: isPlaying })
          if (isPlaying) {
            handlePause()
          } else {
            handlePlay()
          }
        }}
        startTime={settings.start_time_seconds}
        endTime={settings.end_time_seconds}
        onStartTimeChange={handleStartTimeChange}
        onEndTimeChange={handleEndTimeChange}
        lightMode={lightMode}
        onLightModeToggle={() => setLightMode(!lightMode)}
      />

      {/* Navigation */}
      <PlayerNavigation
        video={video}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        currentIndex={currentIndex}
        totalVideos={videos.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onStateChange={handleStateChange}
        loading={loading}
      />

      {/* Metadata */}
      <PlayerMetadata
        video={video}
        onTagAdded={(tag) => setVideo({ ...video, tags: [...(video.tags || []), tag] })}
        onTagRemoved={(tagId) =>
          setVideo({ ...video, tags: video.tags?.filter((t) => t.id !== tagId) || [] })
        }
        onCommentAdded={(comment) =>
          setVideo({ ...video, comments: [...(video.comments || []), comment] })
        }
        onCommentUpdated={(comment) =>
          setVideo({
            ...video,
            comments: video.comments?.map((c) => (c.id === comment.id ? comment : c)) || [],
          })
        }
        onCommentRemoved={(commentId) =>
          setVideo({ ...video, comments: video.comments?.filter((c) => c.id !== commentId) || [] })
        }
        collapsed={metadataCollapsed}
        onToggleCollapse={() => setMetadataCollapsed(!metadataCollapsed)}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
    </div>
  )
}

export default Player
