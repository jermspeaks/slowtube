import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Channel, ChannelVideoType } from '../types/channel'
import { Video } from '../types/video'
import { channelsAPI, videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoDetailModal from '../components/VideoDetailModal'
import LatestVideosFetcher from '../components/LatestVideosFetcher'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Loader2, Archive, Inbox, Rss } from 'lucide-react'

function ChannelDetail() {
  const navigate = useNavigate()
  const { channelId } = useParams<{ channelId: string }>()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ChannelVideoType>('watch_later')
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [fetching, setFetching] = useState(false)
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    if (!channelId) {
      navigate('/youtube/channels/watch-later')
      return
    }

    loadChannel()
  }, [navigate, channelId])

  useEffect(() => {
    if (channel && activeTab) {
      loadVideos()
      // Clear selection when switching tabs
      setSelectedVideoIds(new Set())
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
      navigate('/youtube/channels/watch-later')
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


  const handleVideoSelect = (videoId: number, selected: boolean) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(videoId)
      } else {
        next.delete(videoId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedVideoIds.size === videos.length) {
      setSelectedVideoIds(new Set())
    } else {
      setSelectedVideoIds(new Set(videos.map(v => v.id)))
    }
  }

  const handleBulkAction = async (state: 'inbox' | 'archive' | 'feed') => {
    if (selectedVideoIds.size === 0) return

    try {
      setBulkActionLoading(true)
      const updates = Array.from(selectedVideoIds).map(videoId => ({
        videoId,
        state,
      }))

      await videosAPI.bulkUpdateState(updates)
      toast.success(`Moved ${updates.length} video(s) to ${state}`)
      
      // Clear selection and refresh videos
      setSelectedVideoIds(new Set())
      await loadVideos()
    } catch (error: any) {
      console.error('Error performing bulk action:', error)
      toast.error(error.response?.data?.error || 'Failed to update videos')
    } finally {
      setBulkActionLoading(false)
    }
  }


  const handleFetchLatest = async () => {
    if (!channelId) return

    try {
      setFetching(true)
      const response = await channelsAPI.fetchLatest(channelId, 50)
      toast.success(`Fetched ${response.videos?.length || 0} videos`)
      // Refresh the video list to show newly fetched videos
      await loadVideos()
    } catch (error: any) {
      console.error('Error fetching latest videos:', error)
      toast.error(error.response?.data?.error || 'Failed to fetch latest videos')
    } finally {
      setFetching(false)
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
            <>
              {activeTab === 'latest' && (
                <div className="mb-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleSelectAll}
                        variant="outline"
                        size="sm"
                      >
                        {selectedVideoIds.size === videos.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedVideoIds.size > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleFetchLatest}
                      disabled={fetching}
                      variant="default"
                    >
                      {fetching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Fetch New Videos'
                      )}
                    </Button>
                  </div>
                  {selectedVideoIds.size > 0 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleBulkAction('inbox')}
                        disabled={bulkActionLoading}
                        variant="default"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Inbox className="mr-2 h-4 w-4" />
                        Move to Inbox ({selectedVideoIds.size})
                      </Button>
                      <Button
                        onClick={() => handleBulkAction('archive')}
                        disabled={bulkActionLoading}
                        variant="default"
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Move to Archive ({selectedVideoIds.size})
                      </Button>
                      <Button
                        onClick={() => handleBulkAction('feed')}
                        disabled={bulkActionLoading}
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Rss className="mr-2 h-4 w-4" />
                        Move to Feed ({selectedVideoIds.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onClick={() => handleVideoClick(video)}
                    onStateChange={handleVideoUpdated}
                    showFeedDate={activeTab === 'latest'}
                    selectable={activeTab === 'latest'}
                    selected={selectedVideoIds.has(video.id)}
                    onSelectChange={(selected) => handleVideoSelect(video.id, selected)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          videos={videos}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdated={(updatedVideo) => {
            setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v))
            if (selectedVideo?.id === updatedVideo.id) {
              setSelectedVideo(updatedVideo)
            }
          }}
          onVideoChange={(newVideo) => {
            setSelectedVideo(newVideo)
          }}
        />
      )}
    </div>
  )
}

export default ChannelDetail

