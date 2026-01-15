import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { channelGroupsAPI, videosAPI } from '../services/api'
import { ChannelGroupWithChannels } from '../types/channel-list'
import { Video, ViewMode } from '../types/video'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ChannelGroupForm from '../components/ChannelListForm'
import ViewToggle from '../components/ViewToggle'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Archive, Inbox, X, Edit, ArrowLeft, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

function ChannelGroupDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<ChannelGroupWithChannels | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Determine active tab from route - using local type for tabs
  type TabType = 'inbox' | 'feed' | 'archive' | 'latest' | 'liked'
  const activeTab: TabType = location.pathname.includes('/archive') ? 'archive' : 
                             location.pathname.includes('/feed') ? 'feed' : 
                             location.pathname.includes('/latest') ? 'latest' : 
                             location.pathname.includes('/liked') ? 'liked' : 
                             'inbox'
  
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [fetching, setFetching] = useState(false)
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  
  // Sort state - separate defaults for watch_later and latest tabs
  const [sortBy, setSortBy] = useState<'title' | 'added_to_latest_at' | 'published_at' | 'added_to_playlist_at'>(() => {
    // Initialize based on current active tab
    if (location.pathname.includes('/latest')) {
      return 'added_to_latest_at'
    } else if (location.pathname.includes('/inbox') || location.pathname.includes('/feed') || location.pathname.includes('/archive')) {
      return 'added_to_playlist_at'
    }
    return 'added_to_playlist_at'
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Shorts filter for latest videos (default: exclude shorts)
  const [shortsFilter, setShortsFilter] = useState<'all' | 'exclude' | 'only'>('exclude')

  useEffect(() => {
    if (id) {
      loadGroup()
    }
  }, [id])

  useEffect(() => {
    if (group && activeTab) {
      // Reset sort to default when switching tabs
      if (activeTab === 'latest') {
        setSortBy('added_to_latest_at')
      } else if (activeTab === 'inbox' || activeTab === 'feed' || activeTab === 'archive') {
        setSortBy('added_to_playlist_at')
      }
      setSortOrder('desc')
      loadVideos()
      // Clear selection when switching tabs
      setSelectedVideoIds(new Set())
    }
  }, [group, activeTab, sortBy, sortOrder, shortsFilter])

  const loadGroup = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await channelGroupsAPI.getById(parseInt(id, 10))
      setGroup(data)
    } catch (error: any) {
      console.error('Error loading channel group:', error)
      toast.error(error.response?.data?.error || 'Failed to load channel group')
      if (error.response?.status === 404 || error.response?.status === 400) {
        navigate('/youtube/channel-lists')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadVideos = async () => {
    if (!id || !activeTab) return

    try {
      setVideosLoading(true)
      
      let data
      if (activeTab === 'inbox' || activeTab === 'feed' || activeTab === 'archive') {
        // Map tab to state filter: inbox -> 'inbox', feed -> 'feed', archive -> 'archive'
        const stateFilter: 'feed' | 'inbox' | 'archive' = activeTab
        // Use 'watch_later' type with the appropriate state filter
        data = await channelGroupsAPI.getVideos(
          parseInt(id, 10),
          'watch_later',
          sortBy,
          sortOrder,
          stateFilter
        )
      } else if (activeTab === 'latest') {
        // Use 'latest' type with sort parameters and shorts filter
        data = await channelGroupsAPI.getVideos(
          parseInt(id, 10),
          'latest',
          sortBy,
          sortOrder,
          undefined,
          shortsFilter
        )
      } else if (activeTab === 'liked') {
        // Use 'liked' type
        data = await channelGroupsAPI.getVideos(
          parseInt(id, 10),
          'liked'
        )
      } else {
        data = { videos: [] }
      }
      
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
      const by = value.substring(0, lastUnderscoreIndex) as 'title' | 'added_to_latest_at' | 'published_at' | 'added_to_playlist_at'
      const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
      // Validate based on active tab
      if (activeTab === 'inbox' || activeTab === 'feed' || activeTab === 'archive') {
        if ((by === 'title' || by === 'added_to_playlist_at' || by === 'published_at') && (order === 'asc' || order === 'desc')) {
          setSortBy(by)
          setSortOrder(order)
        }
      } else if (activeTab === 'latest') {
        if ((by === 'title' || by === 'added_to_latest_at' || by === 'published_at') && (order === 'asc' || order === 'desc')) {
          setSortBy(by)
          setSortOrder(order)
        }
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

  const handleVideoUpdated = async (video: Video) => {
    // Refresh the video list to reflect any state changes
    await loadVideos()
    
    // Update the selected video if it's the one that was updated
    if (selectedVideo && selectedVideo.id === video.id) {
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

  // Helper function to check if a video is a short (≤60 seconds)
  const isShortVideo = (duration: string | null): boolean => {
    if (!duration || typeof duration !== 'string') return false
    
    let totalSeconds = 0
    const hourMatch = duration.match(/(\d+)h/)
    const minuteMatch = duration.match(/(\d+)m/)
    const secondMatch = duration.match(/(\d+)s/)
    
    if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600
    if (minuteMatch) totalSeconds += parseInt(minuteMatch[1], 10) * 60
    if (secondMatch) totalSeconds += parseInt(secondMatch[1], 10)
    
    return totalSeconds > 0 && totalSeconds <= 60
  }

  const handleSelectAllShorts = () => {
    const shorts = videos.filter(v => isShortVideo(v.duration))
    const shortsIds = new Set(shorts.map(v => v.id))
    
    // If all shorts are already selected, deselect them
    const allShortsSelected = shorts.length > 0 && shorts.every(v => selectedVideoIds.has(v.id))
    if (allShortsSelected) {
      setSelectedVideoIds(prev => {
        const next = new Set(prev)
        shortsIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // Select all shorts
      setSelectedVideoIds(prev => {
        const next = new Set(prev)
        shortsIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const handleBulkAction = async (state: 'inbox' | 'archive') => {
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

  const handleDismiss = async () => {
    await handleBulkAction('archive')
  }


  const handleRefresh = async () => {
    if (!id) return

    try {
      setFetching(true)
      const response = await channelGroupsAPI.refresh(parseInt(id, 10), 50)
      toast.success(response.message || `Refreshed ${response.totalVideos || 0} videos`)
      // Refresh the video list to show newly fetched videos
      await loadVideos()
    } catch (error: any) {
      console.error('Error refreshing group:', error)
      
      if (error.response?.status === 401 || error.response?.data?.requiresAuth) {
        toast.error('YouTube authentication required. Please connect your YouTube account in Settings.', {
          action: {
            label: 'Go to Settings',
            onClick: () => navigate('/settings')
          }
        })
      } else {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to refresh group'
        toast.error(errorMessage)
      }
    } finally {
      setFetching(false)
    }
  }

  const handleUpdate = async (data: { name: string; description: string | null; color: string | null }) => {
    if (!group) return

    try {
      const updated = await channelGroupsAPI.update(group.id, data)
      setGroup(updated)
      toast.success('Channel group updated successfully')
      setIsEditModalOpen(false)
    } catch (error: any) {
      console.error('Error updating channel group:', error)
      toast.error(error.response?.data?.error || 'Failed to update channel group')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channel group...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Channel group not found</p>
            <Button onClick={() => navigate('/youtube/channel-lists')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Channel Groups
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Group Header */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-6 mb-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/youtube/channel-lists')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {group.color && (
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    {group.name}
                  </h1>
                  <span className="text-sm text-muted-foreground">
                    • {group.channel_count} {group.channel_count === 1 ? 'channel' : 'channels'}
                  </span>
                </div>
                {group.description && (
                  <p className="text-muted-foreground mb-2">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={fetching}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                {fetching ? 'Refreshing...' : 'Refresh Group'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-t border-border pt-0">
            <nav className="flex -mb-px">
              <button
                onClick={() => navigate(`/youtube/channel-lists/${id}/inbox`)}
                className={`
                  px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'inbox'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                Inbox
              </button>
              <button
                onClick={() => navigate(`/youtube/channel-lists/${id}/feed`)}
                className={`
                  px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'feed'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                Feed
              </button>
              <button
                onClick={() => navigate(`/youtube/channel-lists/${id}/archive`)}
                className={`
                  px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'archive'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                Archive
              </button>
              <button
                onClick={() => navigate(`/youtube/channel-lists/${id}/latest`)}
                className={`
                  px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'latest'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                Latest Videos
              </button>
              <button
                onClick={() => navigate(`/youtube/channel-lists/${id}/liked`)}
                className={`
                  px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'liked'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                Liked Videos
              </button>
            </nav>
          </div>
        </div>

        {/* Videos Content */}
        <div>
          {/* Sort Panel and View Toggle - visible for all tabs */}
          {!videosLoading && (
            <div className="flex gap-4 items-center mb-6">
              <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                <div className="flex gap-2 items-center">
                  <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-border rounded text-sm bg-background"
                  >
                    {(activeTab === 'inbox' || activeTab === 'feed' || activeTab === 'archive') ? (
                      <>
                        <option value="title_asc">Title (A-Z)</option>
                        <option value="title_desc">Title (Z-A)</option>
                        <option value="added_to_playlist_at_desc">Date Added (Newest)</option>
                        <option value="added_to_playlist_at_asc">Date Added (Oldest)</option>
                        <option value="published_at_desc">Date Published (Newest)</option>
                        <option value="published_at_asc">Date Published (Oldest)</option>
                      </>
                    ) : activeTab === 'latest' ? (
                      <>
                        <option value="title_asc">Title (A-Z)</option>
                        <option value="title_desc">Title (Z-A)</option>
                        <option value="added_to_latest_at_desc">Date Added (Newest)</option>
                        <option value="added_to_latest_at_asc">Date Added (Oldest)</option>
                        <option value="published_at_desc">Date Published (Newest)</option>
                        <option value="published_at_asc">Date Published (Oldest)</option>
                      </>
                    ) : (
                      <>
                        <option value="title_asc">Title (A-Z)</option>
                        <option value="title_desc">Title (Z-A)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              {activeTab === 'latest' && (
                <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Shorts:</label>
                    <select
                      value={shortsFilter}
                      onChange={(e) => setShortsFilter(e.target.value as 'all' | 'exclude' | 'only')}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All Videos</option>
                      <option value="exclude">Exclude Shorts</option>
                      <option value="only">Shorts Only</option>
                    </select>
                  </div>
                </div>
              )}
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          )}

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
          ) : videos.length === 0 ? (
            <div className="text-center py-[60px] px-5 bg-card rounded-lg">
              <p className="text-lg text-muted-foreground mb-4">
                No videos found
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'latest' 
                  ? 'This list has no latest videos pending review from its channels.'
                  : `This list has no videos from its channels in ${activeTab}.`}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                {activeTab === 'latest' && (
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleSelectAll}
                      variant="outline"
                      size="sm"
                    >
                      {selectedVideoIds.size === videos.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    {(shortsFilter === 'all' || shortsFilter === 'only') && (
                      <Button
                        onClick={handleSelectAllShorts}
                        variant="outline"
                        size="sm"
                      >
                        {(() => {
                          const shorts = videos.filter(v => isShortVideo(v.duration))
                          const allShortsSelected = shorts.length > 0 && shorts.every(v => selectedVideoIds.has(v.id))
                          return allShortsSelected ? 'Deselect All Shorts' : 'Select All Shorts'
                        })()}
                      </Button>
                    )}
                    {selectedVideoIds.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                )}
              </div>
              {activeTab === 'latest' && selectedVideoIds.size > 0 && (
                <div className="mb-4 flex gap-2">
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
                    onClick={handleDismiss}
                    disabled={bulkActionLoading}
                    variant="outline"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Dismiss ({selectedVideoIds.size})
                  </Button>
                </div>
              )}
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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
              ) : (
                <VideoTable
                  videos={videos}
                  onVideoClick={handleVideoClick}
                  onStateChange={handleVideoUpdated}
                  selectable={activeTab === 'latest'}
                  selectedVideoIds={selectedVideoIds}
                  onSelectionChange={handleVideoSelect}
                  onSelectAll={handleSelectAll}
                  showFeedDate={activeTab === 'latest'}
                />
              )}
            </>
          )}
        </div>
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel Group</DialogTitle>
            <DialogDescription>
              Update channel group details.
            </DialogDescription>
          </DialogHeader>
          <ChannelGroupForm
            group={group}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChannelGroupDetail

