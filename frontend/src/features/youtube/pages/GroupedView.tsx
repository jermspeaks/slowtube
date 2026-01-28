import { useState, useEffect, useRef } from 'react'
import { Video, ViewMode } from '../types/video'
import { videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ViewToggle from '../components/ViewToggle'
import FiltersAndSort from '../components/FiltersAndSort'
import { toast } from 'sonner'
import { Pagination } from '@/shared/components/Pagination'
import { useEntityListState } from '@/shared/hooks/useEntityListState'
import { useURLParams } from '@/shared/hooks/useURLParams'
import {
  isVideoSortBy,
  isSortOrder,
  isDateField,
  isShortsFilter,
  isValidPage,
} from '@/shared/utils/typeGuards'

type GroupedViewFilters = {
  search: string
  sortBy: 'published_at' | 'added_to_playlist_at' | null
  sortOrder: 'asc' | 'desc'
  channels: string[]
  dateField: 'added_to_playlist_at' | 'published_at' | null
  startDate: string | null
  endDate: string | null
  shortsFilter: 'all' | 'exclude' | 'only'
  currentPage: number
}

function GroupedView() {
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
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [availableChannels, setAvailableChannels] = useState<string[]>([])
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaults: GroupedViewFilters = {
    search: '',
    sortBy: 'added_to_playlist_at',
    sortOrder: 'asc',
    channels: [],
    dateField: null,
    startDate: null,
    endDate: null,
    shortsFilter: 'all',
    currentPage: 1,
  }

  const [filters, updateFilters] = useURLParams<GroupedViewFilters>({
    defaults,
    serialize: (state) => {
      const params = new URLSearchParams()
      if (state.search) {
        params.set('search', state.search)
      }
      if (state.sortBy && state.sortBy !== 'added_to_playlist_at') {
        params.set('sortBy', state.sortBy)
        params.set('sortOrder', state.sortOrder)
      } else if (state.sortBy === 'added_to_playlist_at' && state.sortOrder !== 'asc') {
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
      if (state.currentPage > 1) {
        params.set('page', state.currentPage.toString())
      }
      return params
    },
    deserialize: (params) => {
      const result: Partial<GroupedViewFilters> = {}
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
      const page = params.get('page')
      if (isValidPage(page)) {
        result.currentPage = parseInt(page, 10)
      }
      return result
    },
  })

  const [searchQuery, setSearchQuery] = useState<string>(filters.search)

  // Sync searchQuery with filters.search when URL changes
  useEffect(() => {
    setSearchQuery(filters.search)
  }, [filters.search])

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
      const response = await videosAPI.getAll(
        undefined, // Fetch all videos regardless of state
        debouncedSearchQuery || undefined,
        filters.sortBy || undefined,
        filters.sortBy ? filters.sortOrder : undefined,
        filters.channels.length > 0 ? filters.channels : undefined,
        1, // page - start at page 1
        100000, // limit - use a very large number to fetch all videos for grouping
        filters.dateField || undefined,
        filters.startDate || undefined,
        filters.endDate || undefined,
        filters.shortsFilter
      )
      // Extract videos array from response (response has { videos: [...], pagination: {... } })
      setVideos(response.videos || response || [])
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

  const groupVideosByChannel = (videos: Video[]): Record<string, Video[]> => {
    const grouped: Record<string, Video[]> = {}
    videos.forEach(video => {
      const channelTitle = video.channel_title || 'Unknown Channel'
      if (!grouped[channelTitle]) {
        grouped[channelTitle] = []
      }
      grouped[channelTitle].push(video)
    })
    return grouped
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

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      updateFilters({ search: searchQuery })
    }, 500) // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, updateFilters])

  // Reset to page 1 when filters change (except page itself)
  const prevFiltersRef = useRef<Partial<GroupedViewFilters>>({})
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
  }, [debouncedSearchQuery, filters.sortBy, filters.sortOrder, filters.channels, filters.dateField, filters.startDate, filters.endDate, filters.shortsFilter])

  const groupedVideos = groupVideosByChannel(videos)
  const allChannelNames = Object.keys(groupedVideos).sort()
  const totalPages = Math.ceil(allChannelNames.length / 10)
  const paginatedChannelNames = allChannelNames.slice((filters.currentPage - 1) * 10, filters.currentPage * 10)

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-start mb-4 md:mb-6 flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <FiltersAndSort
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
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
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
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
              <div className="space-y-6 md:space-y-8">
                {paginatedChannelNames.map(channelName => (
                  <div key={channelName}>
                    <div className="mb-4 pb-2 border-b-2 border-border">
                      <h2 className="text-lg md:text-xl font-bold text-foreground">
                        {channelName}
                        <span className="ml-2 text-xs md:text-sm font-normal text-muted-foreground">
                          ({groupedVideos[channelName].length} {groupedVideos[channelName].length === 1 ? 'video' : 'videos'})
                        </span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {groupedVideos[channelName].map(video => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          onClick={() => handleVideoClick(video)}
                          onStateChange={handleStateChange}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8">
                {paginatedChannelNames.map(channelName => (
                  <div key={channelName}>
                    <div className="mb-4 pb-2 border-b-2 border-border">
                      <h2 className="text-lg md:text-xl font-bold text-foreground">
                        {channelName}
                        <span className="ml-2 text-xs md:text-sm font-normal text-muted-foreground">
                          ({groupedVideos[channelName].length} {groupedVideos[channelName].length === 1 ? 'video' : 'videos'})
                        </span>
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <VideoTable
                        videos={groupedVideos[channelName]}
                        onVideoClick={handleVideoClick}
                        onStateChange={handleStateChange}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination
              currentPage={filters.currentPage}
              totalPages={totalPages}
              onPageChange={(page) => updateFilters({ currentPage: page })}
            />
          </>
        )}
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
    </div>
  )
}

export default GroupedView

