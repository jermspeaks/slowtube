import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Video } from '../types/video'
import { videosAPI } from '../services/api'
import VideoCard from '../components/VideoCard'
import VideoDetailModal from '../components/VideoDetailModal'
import { toast } from 'sonner'
import { useEntityListState } from '@/shared/hooks/useEntityListState'

function Dashboard() {
  const [videosLoading, setVideosLoading] = useState(true)
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

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      setVideosLoading(true)
      const response = await videosAPI.getAll(
        'feed',
        undefined,
        'added_to_playlist_at',
        'desc',
        undefined,
        1,
        10
      )
      setVideos(response.videos || [])
    } catch (error) {
      console.error('Error loading videos:', error)
      toast.error('Failed to load videos')
    } finally {
      setVideosLoading(false)
    }
  }

  const handleVideoClick = async (video: Video) => {
    try {
      const fullVideo = await videosAPI.getById(video.id)
      setSelectedVideo(fullVideo)
    } catch (error) {
      console.error('Error loading video details:', error)
      setSelectedVideo(video)
    }
  }


  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Latest Videos</h2>
        <Link
          to="/youtube/watch-later"
          className="text-sm text-primary hover:underline"
        >
          View All
        </Link>
      </div>
      {videosLoading ? (
        <div className="flex justify-center items-center py-8 bg-card rounded-lg">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8 px-4 bg-card rounded-lg">
          <p className="text-sm text-muted-foreground">
            No videos in watch later
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => handleVideoClick(video)}
              onStateChange={handleStateChange}
            />
          ))}
        </div>
      )}

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdated={handleVideoUpdated}
        />
      )}
    </>
  )
}

export default Dashboard
