import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, VideoState, ViewMode } from '../types/video'
import { authAPI, videosAPI } from '../services/api'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
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
  const [refreshing, setRefreshing] = useState(false)

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

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await videosAPI.refresh()
      await loadVideos()
    } catch (error: any) {
      console.error('Error refreshing videos:', error)
      if (error.response?.status === 401) {
        alert('Not authenticated. Please connect with YouTube.')
        navigate('/login')
      } else {
        alert('Failed to refresh videos')
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleImport = async () => {
    try {
      setRefreshing(true)
      const result = await videosAPI.import()
      console.log('Import result:', result)
      
      // Ensure we're showing all videos or at least 'feed' videos to see newly imported ones
      if (stateFilter !== 'all' && stateFilter !== 'feed') {
        setStateFilter('feed')
      }
      
      await loadVideos()
      
      const message = result.imported > 0 || result.updated > 0
        ? `Videos imported successfully! ${result.imported} new, ${result.updated} updated.`
        : 'No new videos to import.'
      alert(message)
    } catch (error: any) {
      console.error('Error importing videos:', error)
      if (error.response?.status === 401) {
        alert('Not authenticated. Please connect with YouTube.')
        navigate('/login')
      } else {
        alert('Failed to import videos')
      }
    } finally {
      setRefreshing(false)
    }
  }

  const { manualRefresh } = useAutoRefresh({
    onRefresh: handleRefresh,
    intervalHours: 24
  })

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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleImport}
              disabled={refreshing}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.5 : 1
              }}
            >
              Import Videos
            </button>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.5 : 1
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
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
            <button
              onClick={handleImport}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Import Your Watch Later Playlist
            </button>
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

