import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Channel } from '../types/channel'
import { Video } from '../types/video'
import { channelsAPI, videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoDetailModal from '../components/VideoDetailModal'
import ChannelHeader from '../components/ChannelHeader'
import ChannelNavigation from '../components/ChannelNavigation'
import LatestVideosFetcher from '../components/LatestVideosFetcher'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Loader2, Archive, Inbox, Rss } from 'lucide-react'

function ChannelLatest() {
  const navigate = useNavigate()
  const { channelId } = useParams<{ channelId: string }>()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [fetching, setFetching] = useState(false)
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  
  // Sort state - default to Date Added (Newest) to match current behavior
  const [sortBy, setSortBy] = useState<'title' | 'added_to_latest_at' | 'published_at'>('added_to_latest_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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
  }, [channel, channelId, sortBy, sortOrder])

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
      const data = await channelsAPI.getVideos(channelId, 'latest', sortBy, sortOrder)
      setVideos(data.videos || [])
    } catch (error) {
      console.error('Error loading videos:', error)
      setVideos([])
    } finally {
      setVideosLoading(false)
    }
  }

  const handleSortChange = (value: string) => {
    const lastUnderscoreIndex = value.lastIndexOf('_')
    if (lastUnderscoreIndex !== -1) {
      const by = value.substring(0, lastUnderscoreIndex) as 'title' | 'added_to_latest_at' | 'published_at'
      const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
      if ((by === 'title' || by === 'added_to_latest_at' || by === 'published_at') && (order === 'asc' || order === 'desc')) {
        setSortBy(by)
        setSortOrder(order)
      }
    }
  }

  const handleVideoClick = async (video: Video) => {
    try {
      setSelectedVideo(video)
    } catch (error) {
      console.error('Error loading video details:', error)
      setSelectedVideo(video)
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
        <ChannelHeader channel={channel} onChannelUpdated={setChannel} />
        <ChannelNavigation />

        {videosLoading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading videos...</div>
          </div>
        ) : videos.length === 0 ? (
          <LatestVideosFetcher
            channelId={channelId || ''}
            onVideosFetched={loadVideos}
          />
        ) : (
          <>
            {/* Sort Panel */}
            <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
                  >
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                    <option value="added_to_latest_at_desc">Date Added (Newest)</option>
                    <option value="added_to_latest_at_asc">Date Added (Oldest)</option>
                    <option value="published_at_desc">Date Published (Newest)</option>
                    <option value="published_at_asc">Date Published (Oldest)</option>
                  </select>
                </div>
              </div>
            </div>

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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoClick(video)}
                  onStateChange={handleVideoUpdated}
                  showFeedDate={true}
                  selectable={true}
                  selected={selectedVideoIds.has(video.id)}
                  onSelectChange={(selected) => handleVideoSelect(video.id, selected)}
                />
              ))}
            </div>
          </>
        )}
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

export default ChannelLatest

