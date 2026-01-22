import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Channel } from '../types/channel'
import { Video } from '../types/video'
import { channelsAPI, videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoDetailModal from '../components/VideoDetailModal'
import VideoTable from '../components/VideoTable'
import ViewToggle from '../components/ViewToggle'
import ChannelHeader from '../components/ChannelHeader'
import ChannelNavigation from '../components/ChannelNavigation'
import { toast } from 'sonner'
import { ViewMode } from '../types/video'

function ChannelLiked() {
  const navigate = useNavigate()
  const { channelId } = useParams<{ channelId: string }>()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  useEffect(() => {
    if (!channelId) {
      navigate('/youtube/channels/watch-later')
      return
    }

    loadChannel()
  }, [navigate, channelId])

  useEffect(() => {
    if (channel && channelId) {
      loadVideos()
    }
  }, [channel, channelId])

  const loadChannel = async () => {
    if (!channelId) return

    try {
      setLoading(true)
      const data = await channelsAPI.getById(channelId)
      setChannel(data)
    } catch (error) {
      console.error('Error loading channel:', error)
      toast.error('Failed to load channel')
      navigate('/youtube/channels/watch-later')
    } finally {
      setLoading(false)
    }
  }

  const loadVideos = async () => {
    if (!channelId) return

    try {
      setVideosLoading(true)
      const response = await videosAPI.getChannelLikedVideos(channelId)
      setVideos(response.videos || [])
    } catch (error) {
      console.error('Error loading liked videos:', error)
      toast.error('Failed to load liked videos')
      setVideos([])
    } finally {
      setVideosLoading(false)
    }
  }

  const handleVideoClick = async (video: Video) => {
    try {
      const fullVideo = await videosAPI.getById(video.id)
      setSelectedVideo(fullVideo)
    } catch (error) {
      console.error('Error loading video details:', error)
      setSelectedVideo(video)
    }
  }

  const handleVideoUpdated = (updatedVideo: Video) => {
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v))
    if (selectedVideo?.id === updatedVideo.id) {
      setSelectedVideo(updatedVideo)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channel...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Channel not found</p>
            <button
              onClick={() => navigate('/youtube/channels/watch-later')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Back to Channels
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <ChannelHeader channel={channel} onChannelUpdated={setChannel} />
        <ChannelNavigation />

        <div className="mb-6 flex justify-end">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {videosLoading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading liked videos...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No liked videos from this channel
            </p>
            <p className="text-sm text-muted-foreground">
              Liked videos from this channel will appear here.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onClick={() => handleVideoClick(video)}
                    onStateChange={handleVideoUpdated}
                  />
                ))}
              </div>
            ) : (
              <VideoTable
                videos={videos}
                onVideoClick={handleVideoClick}
                onStateChange={handleVideoUpdated}
              />
            )}
          </>
        )}
      </main>

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          videos={videos}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdated={handleVideoUpdated}
          onVideoChange={(newVideo) => {
            setSelectedVideo(newVideo)
          }}
        />
      )}
    </div>
  )
}

export default ChannelLiked

