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
  const [uploading, setUploading] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{ remaining: number; processed: number; unavailable: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const fetchedVideos = await videosAPI.getAll(stateFilter === 'all' ? undefined : stateFilter)
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

  useEffect(() => {
    loadVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        backgroundColor: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h1 style={{ margin: 0 }}>YouTube Watch Later</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {fetchingDetails && fetchProgress && (
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                Fetching details... {fetchProgress.remaining} remaining
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleImportClick}
              disabled={uploading || fetchingDetails}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (uploading || fetchingDetails) ? 'not-allowed' : 'pointer',
                opacity: (uploading || fetchingDetails) ? 0.5 : 1
              }}
            >
              {uploading ? 'Uploading...' : 'Import Google Takeout File'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Filter:</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as VideoState | 'all')}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="all">All</option>
              <option value="feed">Feed</option>
              <option value="inbox">Inbox</option>
              <option value="archive">Archive</option>
            </select>
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {videos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '18px', color: '#6c757d', marginBottom: '16px' }}>
              No videos found
            </p>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleImportClick}
                disabled={uploading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: uploading ? 0.5 : 1
                }}
              >
                {uploading ? 'Uploading...' : 'Import Google Takeout File'}
              </button>
              <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '12px' }}>
                Upload your watch-history.json or watch-history.csv file from Google Takeout
              </p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px'
              }}>
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

