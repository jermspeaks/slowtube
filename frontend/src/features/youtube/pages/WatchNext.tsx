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
import { useDebounce } from '@/shared/hooks/useDebounce'
import { Pagination } from '@/shared/components/Pagination'
import { useEntityListState } from '@/shared/hooks/useEntityListState'

function WatchNext() {
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
  const [sortBy, setSortBy] = useState<'published_at' | 'added_to_playlist_at' | null>('published_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [availableChannels, setAvailableChannels] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateField, setDateField] = useState<'added_to_playlist_at' | 'published_at' | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [shortsFilter, setShortsFilter] = useState<'all' | 'exclude' | 'only'>('all')

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
      // Load videos with state='inbox' (watch later inbox)
      const response = await videosAPI.getAll(
        'inbox', // Only inbox videos
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        selectedChannels.length > 0 ? selectedChannels : undefined,
        currentPage,
        100, // Limit
        dateField || undefined,
        startDate || undefined,
        endDate || undefined,
        shortsFilter
      )
      setVideos(response.videos || [])
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1)
      }
    } catch (error) {
      console.error('Error loading videos:', error)
      toast.error('Failed to load videos')
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
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedChannels, dateField, startDate, endDate, shortsFilter])

  useEffect(() => {
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedChannels, currentPage, dateField, startDate, endDate, shortsFilter])

  return (
    <>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Inbox</h1>
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex-1 min-w-0">
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
          <div className="text-lg text-muted-foreground">Loading videos...</div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-[60px] px-5 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            No videos in your inbox
          </p>
          <p className="text-sm text-muted-foreground">
            Videos you mark as "inbox" will appear here.
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

export default WatchNext
