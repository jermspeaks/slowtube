import { useState, useEffect, useRef } from 'react'
import { Video, ViewMode } from '../types/video'
import { videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import FiltersAndSort from '../components/FiltersAndSort'
import { toast } from 'sonner'
import { usePreserveScrollPosition } from '@/shared/hooks/usePreserveScrollPosition'
import { Pagination } from '@/shared/components/Pagination'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useEntityListState } from '@/shared/hooks/useEntityListState'
import { useURLParams } from '@/shared/hooks/useURLParams'
import {
  isVideoSortBy,
  isSortOrder,
  isDateField,
  isShortsFilter,
  isViewMode,
  isValidPage,
} from '@/shared/utils/typeGuards'

type FeedFilters = {
  search: string
  sortBy: 'published_at' | 'added_to_playlist_at' | null
  sortOrder: 'asc' | 'desc'
  channels: string[]
  dateField: 'added_to_playlist_at' | 'published_at' | null
  startDate: string | null
  endDate: string | null
  shortsFilter: 'all' | 'exclude' | 'only'
  viewMode: ViewMode
  currentPage: number
}

function WatchLater() {
  const [loading, setLoading] = useState(true)
  const isInitialLoad = useRef(true)
  const {
    items: videos,
    setItems: setVideos,
    selectedItem: selectedVideo,
    setSelectedItem: setSelectedVideo,
    handleItemUpdated: handleVideoUpdated,
    handleStateChange,
  } = useEntityListState<Video>({
    onStateChange: () => {
      loadVideos(false)
    },
  })
  const [availableChannels, setAvailableChannels] = useState<string[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [fetchStatus, setFetchStatus] = useState<{ remaining: number; status: string } | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const defaults: FeedFilters = {
    search: '',
    sortBy: 'published_at',
    sortOrder: 'desc',
    channels: [],
    dateField: null,
    startDate: null,
    endDate: null,
    shortsFilter: 'all',
    viewMode: 'card',
    currentPage: 1,
  }

  const [filters, updateFilters] = useURLParams<FeedFilters>({
    defaults,
    serialize: (state) => {
      const params = new URLSearchParams()
      if (state.search) {
        params.set('search', state.search)
      }
      if (state.sortBy && state.sortBy !== 'published_at') {
        params.set('sortBy', state.sortBy)
        params.set('sortOrder', state.sortOrder)
      } else if (state.sortBy === 'published_at' && state.sortOrder !== 'desc') {
        params.set('sortBy', state.sortBy)
        params.set('sortOrder', state.sortOrder)
      }
      if (state.channels.length > 0) {
        params.set('channels', state.channels.join(','))
      }
      if (state.dateField) {
        params.set('dateField', state.dateField)
      }
      if (state.startDate) {
        params.set('startDate', state.startDate)
      }
      if (state.endDate) {
        params.set('endDate', state.endDate)
      }
      if (state.shortsFilter !== 'all') {
        params.set('shortsFilter', state.shortsFilter)
      }
      if (state.viewMode !== 'card') {
        params.set('viewMode', state.viewMode)
      }
      if (state.currentPage > 1) {
        params.set('page', state.currentPage.toString())
      }
      return params
    },
    deserialize: (params) => {
      const result: Partial<FeedFilters> = {}
      const search = params.get('search')
      if (search) result.search = search
      const sortBy = params.get('sortBy')
      if (isVideoSortBy(sortBy) && sortBy !== 'archived_at') {
        result.sortBy = sortBy
      }
      const sortOrder = params.get('sortOrder')
      if (isSortOrder(sortOrder)) {
        result.sortOrder = sortOrder
      }
      const channels = params.get('channels')
      if (channels) {
        result.channels = channels.split(',').filter(Boolean)
      }
      const dateField = params.get('dateField')
      if (isDateField(dateField)) {
        result.dateField = dateField
      }
      const startDate = params.get('startDate')
      if (startDate) result.startDate = startDate
      const endDate = params.get('endDate')
      if (endDate) result.endDate = endDate
      const shortsFilter = params.get('shortsFilter')
      if (isShortsFilter(shortsFilter)) {
        result.shortsFilter = shortsFilter
      }
      const viewMode = params.get('viewMode')
      if (isViewMode(viewMode)) {
        result.viewMode = viewMode
      }
      const page = params.get('page')
      if (isValidPage(page)) {
        result.currentPage = parseInt(page, 10)
      }
      return result
    },
  })

  const [searchQuery, setSearchQuery] = useState<string>(filters.search)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Sync searchQuery with filters.search when URL changes
  useEffect(() => {
    setSearchQuery(filters.search)
  }, [filters.search])

  // Preserve scroll position when navigating
  usePreserveScrollPosition(loading)

  useEffect(() => {
    loadChannels()
    loadVideos(true)
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

  const loadVideos = async (showLoading: boolean = true) => {
    try {
      if (showLoading && isInitialLoad.current) {
        setLoading(true)
      }
      const response = await videosAPI.getAll(
        'feed', // Always fetch feed videos
        debouncedSearchQuery || undefined,
        filters.sortBy || undefined,
        filters.sortBy ? filters.sortOrder : undefined,
        filters.channels.length > 0 ? filters.channels : undefined,
        filters.currentPage,
        100,
        filters.dateField || undefined,
        filters.startDate || undefined,
        filters.endDate || undefined,
        filters.shortsFilter
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
      if (showLoading && isInitialLoad.current) {
        setLoading(false)
        isInitialLoad.current = false
      }
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
      await loadVideos(false)
    } catch (error) {
      console.error('Error resuming fetch:', error)
      toast.error('Failed to resume fetching videos')
    } finally {
      setIsFetching(false)
    }
  }


  // Reset to page 1 when filters change (except page itself)
  const prevFiltersRef = useRef<Partial<FeedFilters>>({})
  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged =
      prev.search !== filters.search ||
      prev.sortBy !== filters.sortBy ||
      prev.sortOrder !== filters.sortOrder ||
      prev.channels?.length !== filters.channels.length ||
      prev.dateField !== filters.dateField ||
      prev.startDate !== filters.startDate ||
      prev.endDate !== filters.endDate ||
      prev.shortsFilter !== filters.shortsFilter

    if (filtersChanged) {
      updateFilters({ currentPage: 1 })
      prevFiltersRef.current = {
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        channels: filters.channels,
        dateField: filters.dateField,
        startDate: filters.startDate,
        endDate: filters.endDate,
        shortsFilter: filters.shortsFilter,
      }
    }
  }, [filters.search, filters.sortBy, filters.sortOrder, filters.channels, filters.dateField, filters.startDate, filters.endDate, filters.shortsFilter, updateFilters])

  useEffect(() => {
    // Only show loading on initial load, not for filter changes
    loadVideos(isInitialLoad.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, filters.sortBy, filters.sortOrder, filters.channels, filters.currentPage, filters.dateField, filters.startDate, filters.endDate, filters.shortsFilter])

  return (
    <>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Feed</h1>
      <div className="mb-6 space-y-4">
        <FiltersAndSort
          searchQuery={searchQuery}
          onSearchQueryChange={(value) => {
            setSearchQuery(value)
            updateFilters({ search: value })
          }}
          selectedChannels={filters.channels}
          onSelectedChannelsChange={(channels) => updateFilters({ channels })}
          availableChannels={availableChannels}
          sortBy={filters.sortBy}
          onSortByChange={(value) => updateFilters({ sortBy: value })}
          sortOrder={filters.sortOrder}
          onSortOrderChange={(value) => updateFilters({ sortOrder: value })}
          dateField={filters.dateField}
          onDateFieldChange={(value) => updateFilters({ dateField: value })}
          startDate={filters.startDate}
          onStartDateChange={(value) => updateFilters({ startDate: value })}
          endDate={filters.endDate}
          onEndDateChange={(value) => updateFilters({ endDate: value })}
          shortsFilter={filters.shortsFilter}
          onShortsFilterChange={(value) => updateFilters({ shortsFilter: value })}
          viewMode={filters.viewMode}
          onViewModeChange={(mode) => updateFilters({ viewMode: mode })}
        />
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
            {filters.viewMode === 'card' ? (
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
              currentPage={filters.currentPage}
              totalPages={totalPages}
              onPageChange={(page) => updateFilters({ currentPage: page })}
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

