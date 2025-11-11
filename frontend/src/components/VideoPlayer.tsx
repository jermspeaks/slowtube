import ReactPlayer from 'react-player'
import { Video } from '../types/video'

interface VideoPlayerProps {
  video: Video
}

function VideoPlayer({ video }: VideoPlayerProps) {
  // Skip player for unavailable or failed videos
  if (video.fetch_status === 'unavailable' || video.fetch_status === 'failed') {
    return (
      <div className="w-full pt-[56.25%] relative bg-muted rounded flex items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          {video.thumbnail_url && (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover rounded opacity-50"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
            <p className="text-white text-sm font-medium">
              Video unavailable
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Handle missing youtube_id
  if (!video.youtube_id) {
    return (
      <div className="w-full pt-[56.25%] relative bg-muted rounded flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Video ID not available</p>
        </div>
      </div>
    )
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`

  return (
    <div className="w-full pt-[56.25%] relative bg-black rounded overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
        <ReactPlayer
          url={youtubeUrl}
          controls={true}
          width="100%"
          height="100%"
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1,
                rel: 0,
              },
            },
          }}
        />
      </div>
    </div>
  )
}

export default VideoPlayer

