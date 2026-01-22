import { useState, useEffect, useRef } from 'react'
import { Video, ViewMode } from '../types/video'
import { videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ViewToggle from '../components/ViewToggle'
import FiltersAndSort from '../components/FiltersAndSort'
import { toast } from 'sonner'
import { usePreserveScrollPosition } from '@/shared/hooks/usePreserveScrollPosition'
import { Pagination } from '@/shared/components/Pagination'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useEntityListState } from '@/shared/hooks/useEntityListState'

function LikedVideos() {
  const [loading, setLoading] = useState(true)
  const {
    items: videos,
    setItems: setVideos,
    selectedItem: selectedVideo,
    setSelectedItem: setSelectedVideo,
    handleItemUpdated: handleVideoUpdated,
    handleStateChange,
  } = useEntityListState<Video>({
    onStateChange: () => {
      loadVideos()
    },
  })
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const [sortBy, setSortBy] = useState<'published_at' | 'added_to_playlist_at' | 'archived_at' | 'liked_at' | null>('liked_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [availableChannels, setAvailableChannels] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateField, setDateField] = useState<'added_to_playlist_at' | 'published_at' | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [shortsFilter, setShortsFilter] = useState<'all' | 'exclude' | 'only'>('all')
  const [stateFilter, setStateFilter] = useState<'feed' | 'inbox' | 'archive' | null>(null)

  // Preserve scroll position when navigating
  usePreserveScrollPosition(loading)

  useEffect(() => {
    loadChannels()
    loadVideos()
  }, [])

  const loadChannels = async () => {
    try {
      const channels = await videosAPI.getAllChannels()
      setAvailableChannels(channels)
    } catch (error) {
      console.error('Error loading channels:', error)
    }
  }

  const loadVideos = async () => {
    try {
      setLoading(true)
      const limit = 100
      const offset = (currentPage - 1) * limit
      
      const response = await videosAPI.getLikedVideos(
        stateFilter || undefined,
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        selectedChannels.length > 0 ? selectedChannels : undefined,
        limit,
        offset,
        dateField || undefined,
        startDate || undefined,
        endDate || undefined,
        shortsFilter
      )
      
      setVideos(response.videos || [])
      const total = response.total || 0
      setTotalPages(Math.ceil(total / limit))
    } catch (error) {
      console.error('Error loading liked videos:', error)
      toast.error('Failed to load liked videos')
    } finally {
      setLoading(false)
    }
  }

  const handleVideoClick = async (video: Video) => {
    try {
      // Fetch full video details
      const fullVideo = await videosAPI.getById(video.id)
      setSelectedVideo(fullVideo)
    } catch (error) {
      console.error('Error loading video details:', error)
      // Fallback to the video we already have
      setSelectedVideo(video)
    }
  }

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedChannels, dateField, startDate, endDate, shortsFilter, stateFilter])

  useEffect(() => {
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedChannels, currentPage, dateField, startDate, endDate, shortsFilter, stateFilter])

  return (
    <>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Liked Videos</h1>
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Filter by State</label>
              <select
                value={stateFilter || ''}
                onChange={(e) => setStateFilter(e.target.value ? e.target.value as 'feed' | 'inbox' | 'archive' : null)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="">All States</option>
                <option value="feed">Feed</option>
                <option value="inbox">Inbox</option>
                <option value="archive">Archive</option>
              </select>
            </div>
            <FiltersAndSort
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedChannels={selectedChannels}
              onSelectedChannelsChange={setSelectedChannels}
              availableChannels={availableChannels}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              dateField={dateField}
              onDateFieldChange={setDateField}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              shortsFilter={shortsFilter}
              onShortsFilterChange={setShortsFilter}
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
          <div className="text-lg text-muted-foreground">Loading liked videos...</div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-[60px] px-5 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            No liked videos
          </p>
          <p className="text-sm text-muted-foreground">
            Videos you like will appear here. Import liked videos from Settings or like videos from anywhere in the app.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {videos.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoClick(video)}
                  onStateChange={handleStateChange}
                />
              ))}
            </div>
          ) : (
            <VideoTable
              videos={videos}
              onVideoClick={handleVideoClick}
              onStateChange={handleStateChange}
            />
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

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
    </>
  )
}

export default LikedVideos
