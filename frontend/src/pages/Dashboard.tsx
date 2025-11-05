import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, VideoState, ViewMode } from '../types/video'
import { authAPI, videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoTable from '../components/VideoTable'
import VideoDetailModal from '../components/VideoDetailModal'
import ViewToggle from '../components/ViewToggle'

function Dashboard() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [stateFilter, setStateFilter] = useState<VideoState | 'all'>('all')
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

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="font-bold mr-2">Filter:</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as VideoState | 'all')}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="all">All</option>
                <option value="feed">Feed</option>
                <option value="inbox">Inbox</option>
                <option value="archive">Archive</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-bold mr-2">Channels:</label>
              <select
                multiple
                value={selectedChannels}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setSelectedChannels(selected)
                }}
                className="px-3 py-2 border border-gray-300 rounded text-sm min-w-[200px] max-h-[120px]"
                size={Math.min(availableChannels.length, 5)}
              >
                {availableChannels.map(channel => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
              {selectedChannels.length > 0 && (
                <button
                  onClick={() => setSelectedChannels([])}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-bold mr-2">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or description..."
                className="px-3 py-2 border border-gray-300 rounded text-sm min-w-[200px]"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-bold mr-2">Sort:</label>
              <select
                value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'none') {
                    setSortBy(null)
                    setSortOrder('asc')
                  } else {
                    // Split from the end - last part is order, rest is sortBy
                    const lastUnderscoreIndex = value.lastIndexOf('_')
                    if (lastUnderscoreIndex !== -1) {
                      const by = value.substring(0, lastUnderscoreIndex) as 'published_at' | 'added_to_playlist_at'
                      const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
                      if ((by === 'published_at' || by === 'added_to_playlist_at') && (order === 'asc' || order === 'desc')) {
                        setSortBy(by)
                        setSortOrder(order)
                      }
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="none">None</option>
                <option value="published_at_desc">Date Published (Newest)</option>
                <option value="published_at_asc">Date Published (Oldest)</option>
                <option value="added_to_playlist_at_desc">Date Added (Newest)</option>
                <option value="added_to_playlist_at_asc">Date Added (Oldest)</option>
              </select>
            </div>
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {videos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onClick={() => handleVideoClick(video)}
                  />
                ))}
              </div>
            ) : (
              <VideoTable
                videos={videos}
                onVideoClick={handleVideoClick}
              />
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

export default Dashboard

