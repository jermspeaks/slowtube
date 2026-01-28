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

type ArchiveFilters = {
  search: string
  sortBy: 'published_at' | 'added_to_playlist_at' | 'archived_at' | null
  sortOrder: 'asc' | 'desc'
  channels: string[]
  dateField: 'added_to_playlist_at' | 'published_at' | null
  startDate: string | null
  endDate: string | null
  shortsFilter: 'all' | 'exclude' | 'only'
  viewMode: ViewMode
  currentPage: number
}

function Archive() {
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

  const defaults: ArchiveFilters = {
    search: '',
    sortBy: 'archived_at',
    sortOrder: 'desc',
    channels: [],
    dateField: null,
    startDate: null,
    endDate: null,
    shortsFilter: 'all',
    viewMode: 'card',
    currentPage: 1,
  }

  const [filters, updateFilters] = useURLParams<ArchiveFilters>({
    defaults,
    serialize: (state) => {
      const params = new URLSearchParams()
      if (state.search) {
        params.set('search', state.search)
      }
      if (state.sortBy && state.sortBy !== 'archived_at') {
        params.set('sortBy', state.sortBy)
        params.set('sortOrder', state.sortOrder)
      } else if (state.sortBy === 'archived_at' && state.sortOrder !== 'desc') {
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
      const result: Partial<ArchiveFilters> = {}
      const search = params.get('search')
      if (search) result.search = search
      const sortBy = params.get('sortBy')
      if (isVideoSortBy(sortBy)) {
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
  }, [])

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
      // Load videos with state='archive'
      const response = await videosAPI.getAll(
        'archive', // Only archived videos
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


  // Reset to page 1 when filters change (except page itself)
  const prevFiltersRef = useRef<Partial<ArchiveFilters>>({})
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
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Archive</h1>
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
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
          <div className="text-lg text-muted-foreground">Loading videos...</div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-[60px] px-5 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">
            No archived videos
          </p>
          <p className="text-sm text-muted-foreground">
            Videos you archive will appear here.
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

export default Archive
