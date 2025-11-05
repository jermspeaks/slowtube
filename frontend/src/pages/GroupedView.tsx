import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, VideoState, ViewMode } from '../types/video'
import { authAPI, videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ViewToggle from '../components/ViewToggle'
import FiltersAndSort from '../components/FiltersAndSort'

function GroupedView() {
  const navigate = useNavigate()
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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Check authentication
    authAPI.checkSession().then((data) => {
      if (!data.authenticated) {
        navigate('/login')
      } else {
        loadChannels()
        loadVideos()
      }
    }).catch(() => {
      navigate('/login')
    })
  }, [navigate])

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
      const fetchedVideos = await videosAPI.getAll(
        stateFilter === 'all' ? undefined : stateFilter,
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        selectedChannels.length > 0 ? selectedChannels : undefined
      )
      setVideos(fetchedVideos)
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
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, debouncedSearchQuery, sortBy, sortOrder, selectedChannels])

  const groupedVideos = groupVideosByChannel(videos)
  const channelNames = Object.keys(groupedVideos).sort()

  return (
    <div className="min-h-screen bg-gray-100">
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
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-white rounded-lg">
            <div className="text-lg text-gray-500">Loading videos...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-white rounded-lg">
            <p className="text-lg text-gray-500 mb-4">
              No videos found
            </p>
            <p className="text-sm text-gray-500">
              Import videos from the Settings page to get started.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="space-y-8">
                {channelNames.map(channelName => (
                  <div key={channelName}>
                    <div className="mb-4 pb-2 border-b-2 border-gray-300">
                      <h2 className="text-xl font-bold text-gray-800">
                        {channelName}
                        <span className="ml-2 text-sm font-normal text-gray-500">
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
                {channelNames.map(channelName => (
                  <div key={channelName}>
                    <div className="mb-4 pb-2 border-b-2 border-gray-300">
                      <h2 className="text-xl font-bold text-gray-800">
                        {channelName}
                        <span className="ml-2 text-sm font-normal text-gray-500">
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

