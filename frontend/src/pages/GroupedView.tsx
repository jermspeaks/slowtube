import { useState, useEffect, useRef } from 'react'
import { Video, VideoState, ViewMode } from '../types/video'
import { videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ViewToggle from '../components/ViewToggle'
import FiltersAndSort from '../components/FiltersAndSort'

function GroupedView() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [stateFilter, setStateFilter] = useState<VideoState | 'all'>('feed')
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
        stateFilter === 'all' ? undefined : stateFilter,
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
      alert('Failed to load videos')
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

  const handleVideoUpdated = (updatedVideo: Video) => {
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v))
    if (selectedVideo?.id === updatedVideo.id) {
      setSelectedVideo(updatedVideo)
    }
  }

  const handleStateChange = (updatedVideo: Video) => {
    // Update the video in the list
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v))
    // If the video is selected, update it too
    if (selectedVideo?.id === updatedVideo.id) {
      setSelectedVideo(updatedVideo)
    }
    // Reload videos to ensure the list is up to date
    loadVideos()
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
  }, [stateFilter, debouncedSearchQuery, sortBy, sortOrder, selectedChannels, dateField, startDate, endDate])

  useEffect(() => {
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, debouncedSearchQuery, sortBy, sortOrder, selectedChannels, dateField, startDate, endDate])

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
              stateFilter={stateFilter}
              onStateFilterChange={setStateFilter}
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
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-4 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-border rounded text-sm bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Page</span>
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                    className="px-3 py-2 border border-border rounded text-sm bg-background"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-foreground">of {totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-border rounded text-sm bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
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

