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
  const [uploading, setUploading] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{ remaining: number; processed: number; unavailable: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Check authentication
    authAPI.checkSession().then((data) => {
      if (!data.authenticated) {
        navigate('/login')
      } else {
        loadVideos()
      }
    }).catch(() => {
      navigate('/login')
    })
  }, [navigate])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const fetchedVideos = await videosAPI.getAll(
        stateFilter === 'all' ? undefined : stateFilter,
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined
      )
      setVideos(fetchedVideos)
    } catch (error) {
      console.error('Error loading videos:', error)
      alert('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const isJson = file.name.endsWith('.json') || file.type === 'application/json'
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv'
    
    if (!isJson && !isCsv) {
      alert('Please upload a JSON or CSV file (Google Takeout watch-history.json or watch-history.csv)')
      return
    }

    try {
      setUploading(true)
      const result = await videosAPI.import(file)
      console.log('Import result:', result)
      
      // Ensure we're showing all videos or at least 'feed' videos to see newly imported ones
      if (stateFilter !== 'all' && stateFilter !== 'feed') {
        setStateFilter('feed')
      }
      
      await loadVideos()
      
      const message = result.imported > 0 || result.updated > 0
        ? `Videos imported successfully! ${result.imported} new, ${result.updated} updated.`
        : 'No new videos to import.'
      
      // Start fetching video details if there are videos queued
      if (result.fetchQueued > 0) {
        setFetchingDetails(true)
        setFetchProgress({ remaining: result.fetchQueued, processed: 0, unavailable: 0 })
        // Start fetching details in background
        fetchVideoDetailsInBackground()
      } else {
        alert(message)
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error importing videos:', error)
      const errorMessage = error.response?.data?.error || 'Failed to import videos'
      alert(errorMessage)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const fetchVideoDetailsInBackground = async () => {
    try {
      let totalProcessed = 0
      let totalUnavailable = 0
      
      while (true) {
        const result = await videosAPI.fetchDetails()
        
        totalProcessed += result.processed || 0
        totalUnavailable += result.unavailable || 0
        
        setFetchProgress({
          remaining: result.remaining || 0,
          processed: totalProcessed,
          unavailable: totalUnavailable,
        })
        
        // Reload videos to show updated details
        await loadVideos()
        
        if (result.status === 'completed' || result.remaining === 0) {
          // All videos processed
          setFetchingDetails(false)
          alert(`Video details fetched successfully! ${totalProcessed} processed, ${totalUnavailable} unavailable.`)
          setFetchProgress(null)
          break
        }
        
        // Wait a bit before next batch
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error: any) {
      console.error('Error fetching video details:', error)
      setFetchingDetails(false)
      const errorMessage = error.response?.data?.error || 'Failed to fetch video details'
      alert(errorMessage)
      setFetchProgress(null)
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

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all videos? This action cannot be undone.')) {
      return
    }

    try {
      await videosAPI.deleteAll()
      setVideos([])
      setSelectedVideo(null)
      alert('All videos have been deleted successfully.')
    } catch (error: any) {
      console.error('Error clearing videos:', error)
      const errorMessage = error.response?.data?.error || 'Failed to clear videos'
      alert(errorMessage)
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
  }, [stateFilter, debouncedSearchQuery, sortBy, sortOrder])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white px-6 py-4 shadow-md mb-6">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <h1 className="m-0">YouTube Watch Later</h1>
          <div className="flex gap-3 items-center flex-wrap">
            {fetchingDetails && fetchProgress && (
              <div className="px-4 py-2 bg-blue-500 text-white rounded text-sm">
                Fetching details... {fetchProgress.remaining} remaining
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-500 text-white border-none rounded cursor-pointer"
            >
              Clear All Videos
            </button>
            <button
              onClick={handleImportClick}
              disabled={uploading || fetchingDetails}
              className="px-4 py-2 bg-green-500 text-white border-none rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Import Google Takeout File'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 pb-6">
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
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={handleImportClick}
                disabled={uploading}
                className="px-6 py-3 bg-blue-500 text-white border-none rounded disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {uploading ? 'Uploading...' : 'Import Google Takeout File'}
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Upload your watch-history.json or watch-history.csv file from Google Takeout
              </p>
            </div>
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

