import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Channel, ChannelVideoType } from '../types/channel'
import { Video } from '../types/video'
import { channelsAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoDetailModal from '../components/VideoDetailModal'
import LatestVideosFetcher from '../components/LatestVideosFetcher'
import { toast } from 'sonner'

function ChannelDetail() {
  const navigate = useNavigate()
  const { channelId } = useParams<{ channelId: string }>()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ChannelVideoType>('watch_later')
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  useEffect(() => {
    if (!channelId) {
      navigate('/channels/watch-later')
      return
    }

    loadChannel()
  }, [navigate, channelId])

  useEffect(() => {
    if (channel && activeTab) {
      loadVideos()
    }
  }, [channel, activeTab])

  const loadChannel = async () => {
    if (!channelId) return

    try {
      setLoading(true)
      const data = await channelsAPI.getById(channelId)
      setChannel(data)
    } catch (error) {
      console.error('Error loading channel:', error)
      toast.error('Failed to load channel')
      navigate('/channels/watch-later')
    } finally {
      setLoading(false)
    }
  }

  const loadVideos = async () => {
    if (!channelId || !activeTab) return

    try {
      setVideosLoading(true)
      const data = await channelsAPI.getVideos(channelId, activeTab)
      setVideos(data.videos || [])
    } catch (error) {
      console.error('Error loading videos:', error)
      setVideos([])
    } finally {
      setVideosLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!channelId) return

    try {
      if (channel?.is_subscribed) {
        await channelsAPI.unsubscribe(channelId)
      } else {
        await channelsAPI.subscribe(channelId)
      }
      await loadChannel()
    } catch (error) {
      console.error('Error toggling subscription:', error)
      toast.error('Failed to update subscription')
    }
  }

  const handleVideoClick = async (video: Video) => {
    try {
      // Fetch full video details if needed
      setSelectedVideo(video)
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

  const formatSubscriberCount = (count: number | null) => {
    if (!count) return 'N/A'
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-6 py-6">
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
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Channel not found</p>
            <button
              onClick={() => navigate('/channels/watch-later')}
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
        {/* Channel Header */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-6">
            {channel.thumbnail_url ? (
              <img
                src={channel.thumbnail_url}
                alt={channel.channel_title || 'Channel'}
                className="w-24 h-24 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-muted-foreground text-2xl">
                  {channel.channel_title?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {channel.channel_title || 'Untitled Channel'}
              </h1>
              {channel.subscriber_count !== null && (
                <p className="text-muted-foreground mb-2">
                  {formatSubscriberCount(channel.subscriber_count)} subscribers
                </p>
              )}
              {channel.description && (
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {channel.description}
                </p>
              )}
              <button
                onClick={handleSubscribe}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  channel.is_subscribed
                    ? 'bg-muted text-foreground hover:bg-accent'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {channel.is_subscribed ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-lg shadow-sm mb-6">
          <div className="border-b border-border">
            <nav className="flex -mb-px">
              {(['watch_later', 'latest', 'liked'] as ChannelVideoType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }
                  `}
                >
                  {tab === 'watch_later' && 'Watch Later Videos'}
                  {tab === 'latest' && 'Latest Videos'}
                  {tab === 'liked' && 'Liked Videos'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Videos Content */}
        <div>
          {videosLoading ? (
            <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
              <div className="text-lg text-muted-foreground">Loading videos...</div>
            </div>
          ) : activeTab === 'liked' ? (
            <div className="text-center py-[60px] px-5 bg-card rounded-lg">
              <p className="text-lg text-muted-foreground mb-4">
                Coming soon - Liked videos will be imported separately
              </p>
            </div>
          ) : activeTab === 'latest' && videos.length === 0 ? (
            <LatestVideosFetcher
              channelId={channelId || ''}
              onVideosFetched={loadVideos}
            />
          ) : videos.length === 0 ? (
            <div className="text-center py-[60px] px-5 bg-card rounded-lg">
              <p className="text-lg text-muted-foreground mb-4">
                No videos found
              </p>
              <p className="text-sm text-muted-foreground">
                This channel has no videos in your watch later list.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoClick(video)}
                  onStateChange={handleVideoUpdated}
                  showFeedDate={activeTab === 'latest'}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdated={handleVideoUpdated}
        />
      )}
    </div>
  )
}

export default ChannelDetail

