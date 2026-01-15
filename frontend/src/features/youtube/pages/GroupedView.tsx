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

function GroupedView() {
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'published_at' | 'added_to_playlist_at' | null>('added_to_playlist_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [availableChannels, setAvailableChannels] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [dateField, setDateField] = useState<'added_to_playlist_at' | 'published_at' | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      const response = await videosAPI.getAll(
        undefined, // Fetch all videos regardless of state
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        selectedChannels.length > 0 ? selectedChannels : undefined,
        1, // page - start at page 1
        100000, // limit - use a very large number to fetch all videos for grouping
        dateField || undefined,
        startDate || undefined,
        endDate || undefined
      )
      // Extract videos array from response (response has { videos: [...], pagination: {... } })
      setVideos(response.videos || response || [])
    } catch (error) {
      console.error('Error loading videos:', error)
      toast.error('Failed to load videos')
    } finally {
      setLoading(false)
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
    }, 500) // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedChannels, dateField, startDate, endDate])

  useEffect(() => {
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedChannels, dateField, startDate, endDate])

  const groupedVideos = groupVideosByChannel(videos)
  const allChannelNames = Object.keys(groupedVideos).sort()
  const totalPages = Math.ceil(allChannelNames.length / 10)
  const paginatedChannelNames = allChannelNames.slice((currentPage - 1) * 10, currentPage * 10)

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
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
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading videos...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No videos found
            </p>
            <p className="text-sm text-muted-foreground">
              Import videos from the Settings page to get started.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="space-y-8">
                {paginatedChannelNames.map(channelName => (
                  <div key={channelName}>
                    <div className="mb-4 pb-2 border-b-2 border-border">
                      <h2 className="text-xl font-bold text-foreground">
                        {channelName}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({groupedVideos[channelName].length} {groupedVideos[channelName].length === 1 ? 'video' : 'videos'})
                        </span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
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
              <div className="space-y-8">
                {paginatedChannelNames.map(channelName => (
                  <div key={channelName}>
                    <div className="mb-4 pb-2 border-b-2 border-border">
                      <h2 className="text-xl font-bold text-foreground">
                        {channelName}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({groupedVideos[channelName].length} {groupedVideos[channelName].length === 1 ? 'video' : 'videos'})
                        </span>
                      </h2>
                    </div>
                    <VideoTable
                      videos={groupedVideos[channelName]}
                      onVideoClick={handleVideoClick}
                      onStateChange={handleStateChange}
                    />
                  </div>
                ))}
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
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

export default GroupedView

