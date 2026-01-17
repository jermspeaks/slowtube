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

function WatchLater() {
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
  const [shortsFilter, setShortsFilter] = useState<'all' | 'exclude' | 'only'>('only')
  const [fetchStatus, setFetchStatus] = useState<{ remaining: number; status: string } | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  // Preserve scroll position when navigating
  usePreserveScrollPosition(loading)

  useEffect(() => {
    loadChannels()
    loadVideos()
    loadFetchStatus()
  }, [])

  const loadFetchStatus = async () => {
    try {
      const status = await videosAPI.getFetchStatus()
      setFetchStatus(status)
    } catch (error) {
      console.error('Error loading fetch status:', error)
    }
  }

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
      const response = await videosAPI.getAll(
        'feed', // Always fetch feed videos
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        selectedChannels.length > 0 ? selectedChannels : undefined,
        currentPage,
        100,
        dateField || undefined,
        startDate || undefined,
        endDate || undefined,
        shortsFilter
      )
      setVideos(response.videos || [])
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1)
      }
      // Update fetch status after loading videos
      await loadFetchStatus()
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

  const handleResumeFetching = async () => {
    try {
      setIsFetching(true)
      const result = await videosAPI.fetchDetails()
      
      // Update fetch status
      setFetchStatus({
        remaining: result.remaining,
        status: result.status,
      })
      
      // Show success message
      if (result.processed > 0) {
        if (result.remaining === 0) {
          toast.success(`Successfully fetched ${result.processed} video${result.processed !== 1 ? 's' : ''}! All videos are now up to date.`)
        } else {
          toast.success(`Fetched ${result.processed} video${result.processed !== 1 ? 's' : ''}. ${result.remaining} remaining.`)
        }
      } else if (result.remaining === 0) {
        toast.success('All videos have been fetched!')
      } else {
        toast.info(`No videos were processed. ${result.remaining} remaining.`)
      }
      
      // Reload videos to show updated data
      await loadVideos()
    } catch (error) {
      console.error('Error resuming fetch:', error)
      toast.error('Failed to resume fetching videos')
    } finally {
      setIsFetching(false)
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
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Feed</h1>
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
        {fetchStatus && fetchStatus.remaining > 0 && (
          <button
            onClick={handleResumeFetching}
            disabled={isFetching}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isFetching ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>Resume Fetching</span>
                <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded">
                  {fetchStatus.remaining} remaining
                </span>
              </>
            )}
          </button>
        )}
      </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <div className="text-base md:text-lg text-muted-foreground">Loading videos...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              No videos found
            </p>
            <p className="text-sm md:text-base text-muted-foreground">
              Import videos from the Settings page to get started.
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
                    showAddedDate={false}
                  />
                ))}
              </div>
            ) : (
              <VideoTable
                videos={videos}
                onVideoClick={handleVideoClick}
                onStateChange={handleStateChange}
                showAddedDate={false}
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

export default WatchLater

