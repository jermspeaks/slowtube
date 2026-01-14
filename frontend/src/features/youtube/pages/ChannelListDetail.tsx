import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { channelListsAPI, videosAPI } from '../services/api'
import { ChannelListWithChannels } from '../types/channel-list'
import { Video, ViewMode } from '../types/video'
import { ChannelVideoType } from '../types/channel'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ChannelListForm from '../components/ChannelListForm'
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

function ChannelListDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const [list, setList] = useState<ChannelListWithChannels | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Determine active tab from route
  const activeTab: ChannelVideoType = location.pathname.includes('/latest') ? 'latest' : 
                                      location.pathname.includes('/liked') ? 'liked' : 
                                      'watch_later'
  
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
    } else if (location.pathname.includes('/watch-later') || !location.pathname.includes('/latest') && !location.pathname.includes('/liked')) {
      return 'added_to_playlist_at'
    }
    return 'added_to_latest_at'
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // State filter for watch later videos (default: exclude archived)
  const [stateFilter, setStateFilter] = useState<'all' | 'exclude_archived' | 'feed' | 'inbox' | 'archive'>('exclude_archived')
  const [showArchived, setShowArchived] = useState(false)
  
  // Shorts filter for latest videos (default: exclude shorts)
  const [shortsFilter, setShortsFilter] = useState<'all' | 'exclude' | 'only'>('exclude')

  useEffect(() => {
    if (id) {
      loadList()
    }
  }, [id])

  useEffect(() => {
    if (list && activeTab) {
      // Reset sort to default when switching tabs
      if (activeTab === 'watch_later') {
        setSortBy('added_to_playlist_at')
      } else if (activeTab === 'latest') {
        setSortBy('added_to_latest_at')
      }
      setSortOrder('desc')
      loadVideos()
      // Clear selection when switching tabs
      setSelectedVideoIds(new Set())
    }
  }, [list, activeTab, sortBy, sortOrder, stateFilter, showArchived, shortsFilter])

  const loadList = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await channelListsAPI.getById(parseInt(id, 10))
      setList(data)
    } catch (error: any) {
      console.error('Error loading channel list:', error)
      toast.error(error.response?.data?.error || 'Failed to load channel list')
      if (error.response?.status === 404) {
        navigate('/channel-lists')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadVideos = async () => {
    if (!id || !activeTab) return

    try {
      setVideosLoading(true)
      // Determine state filter for watch later videos
      let effectiveStateFilter: 'all' | 'exclude_archived' | 'feed' | 'inbox' | 'archive' | undefined = undefined
      if (activeTab === 'watch_later') {
        // If stateFilter is a specific state (feed, inbox, archive), use that directly
        if (stateFilter === 'feed' || stateFilter === 'inbox' || stateFilter === 'archive') {
          effectiveStateFilter = stateFilter
        }
        // If stateFilter is 'all' and showArchived is checked, show all videos
        else if (stateFilter === 'all' && showArchived) {
          effectiveStateFilter = 'all'
        }
        // Default: exclude archived (either 'exclude_archived' or 'all' with showArchived unchecked)
        else {
          effectiveStateFilter = 'exclude_archived'
        }
      }
      
      // Pass sort parameters for latest and watch_later tabs, state filter for watch later tab, shorts filter for latest tab
      const data = await channelListsAPI.getVideos(
        parseInt(id, 10),
        activeTab,
        (activeTab === 'latest' || activeTab === 'watch_later') ? sortBy : undefined,
        (activeTab === 'latest' || activeTab === 'watch_later') ? sortOrder : undefined,
        activeTab === 'watch_later' ? effectiveStateFilter : undefined,
        activeTab === 'latest' ? shortsFilter : undefined
      )
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
      if (activeTab === 'watch_later') {
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
      const response = await channelListsAPI.refresh(parseInt(id, 10), 50)
      toast.success(response.message || `Refreshed ${response.totalVideos || 0} videos`)
      // Refresh the video list to show newly fetched videos
      await loadVideos()
    } catch (error: any) {
      console.error('Error refreshing list:', error)
      
      if (error.response?.status === 401 || error.response?.data?.requiresAuth) {
        toast.error('YouTube authentication required. Please connect your YouTube account in Settings.', {
          action: {
            label: 'Go to Settings',
            onClick: () => navigate('/settings')
          }
        })
      } else {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to refresh list'
        toast.error(errorMessage)
      }
    } finally {
      setFetching(false)
    }
  }

  const handleUpdate = async (data: { name: string; description: string | null; color: string | null }) => {
    if (!list) return

    try {
      const updated = await channelListsAPI.update(list.id, data)
      setList(updated)
      toast.success('Channel list updated successfully')
      setIsEditModalOpen(false)
    } catch (error: any) {
      console.error('Error updating channel list:', error)
      toast.error(error.response?.data?.error || 'Failed to update channel list')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading channel list...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">Channel list not found</p>
            <Button onClick={() => navigate('/channel-lists')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Channel Lists
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* List Header */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/channel-lists')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {list.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: list.color }}
                    />
                  )}
                  <h1 className="text-2xl font-bold text-foreground">
                    {list.name}
                  </h1>
                  <span className="text-sm text-muted-foreground">
                    • {list.channel_count} {list.channel_count === 1 ? 'channel' : 'channels'}
                  </span>
                </div>
                {list.description && (
                  <p className="text-muted-foreground mb-2">
                    {list.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={fetching}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                {fetching ? 'Refreshing...' : 'Refresh List'}
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
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card rounded-lg shadow-sm mb-6">
          <div className="border-b border-border">
            <nav className="flex -mb-px">
              <button
                onClick={() => navigate(`/channel-lists/${id}/watch-later`)}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === 'watch_later'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                Watch Later Videos
              </button>
              <button
                onClick={() => navigate(`/channel-lists/${id}/latest`)}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 transition-colors
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
                onClick={() => navigate(`/channel-lists/${id}/liked`)}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 transition-colors
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
          {/* Filter and Sort Panel - only show for watch later tab, always visible */}
          {activeTab === 'watch_later' && !videosLoading && (
            <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <label className="font-semibold text-sm text-foreground whitespace-nowrap">Filter:</label>
                  <select
                    value={stateFilter}
                    onChange={(e) => {
                      const newFilter = e.target.value as 'all' | 'exclude_archived' | 'feed' | 'inbox' | 'archive'
                      setStateFilter(newFilter)
                      // If selecting archive, automatically check show archived
                      if (newFilter === 'archive') {
                        setShowArchived(true)
                      }
                      // If selecting a specific state other than archive, uncheck show archived
                      else if (newFilter === 'feed' || newFilter === 'inbox') {
                        setShowArchived(false)
                      }
                    }}
                    className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
                  >
                    <option value="exclude_archived">All (Exclude Archived)</option>
                    <option value="all">All</option>
                    <option value="feed">Feed</option>
                    <option value="inbox">Inbox</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>
                {stateFilter === 'all' && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      id="show-archived"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <label htmlFor="show-archived" className="text-sm text-foreground cursor-pointer">
                      Show archived
                    </label>
                  </div>
                )}
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
                  >
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                    <option value="added_to_playlist_at_desc">Date Added (Newest)</option>
                    <option value="added_to_playlist_at_asc">Date Added (Oldest)</option>
                    <option value="published_at_desc">Date Published (Newest)</option>
                    <option value="published_at_asc">Date Published (Oldest)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Sort Panel - only show for latest tab, always visible */}
          {activeTab === 'latest' && !videosLoading && (
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
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <label className="font-semibold text-sm text-foreground whitespace-nowrap">Shorts:</label>
                  <select
                    value={shortsFilter}
                    onChange={(e) => setShortsFilter(e.target.value as 'all' | 'exclude' | 'only')}
                    className="px-3 py-2 border border-border rounded text-sm bg-background flex-1 sm:flex-initial"
                  >
                    <option value="all">All Videos</option>
                    <option value="exclude">Exclude Shorts</option>
                    <option value="only">Shorts Only</option>
                  </select>
                </div>
              </div>
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
                {activeTab === 'watch_later' 
                  ? 'This list has no watch later videos from its channels matching the current filter.'
                  : 'This list has no latest videos pending review from its channels.'}
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
                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
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
          onClose={() => setSelectedVideo(null)}
          onVideoUpdated={handleVideoUpdated}
        />
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel List</DialogTitle>
            <DialogDescription>
              Update channel list details.
            </DialogDescription>
          </DialogHeader>
          <ChannelListForm
            list={list}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChannelListDetail

