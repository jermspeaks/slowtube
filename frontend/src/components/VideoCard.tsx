import { Video } from '../types/video'
import { format } from 'date-fns'
import StateSwitchButton from './StateSwitchButton'

interface VideoCardProps {
  video: Video
  onClick: () => void
  onStateChange?: (updatedVideo: Video) => void
}

function VideoCard({ video, onClick, onStateChange }: VideoCardProps) {
  const getStateColorClasses = (state?: string | null) => {
    switch (state) {
      case 'feed': return 'bg-green-500'
      case 'inbox': return 'bg-yellow-500'
      case 'archive': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const handleStateChange = (updatedVideo: Video) => {
    if (onStateChange) {
      onStateChange(updatedVideo)
    }
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      {video.thumbnail_url && (
        <div
          onClick={onClick}
          className="relative w-full pt-[56.25%] cursor-pointer"
        >
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white px-1.5 py-0.5 rounded text-xs">
              {video.duration}
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <h3
          onClick={!video.thumbnail_url ? onClick : undefined}
          className={`m-0 mb-2 text-sm font-bold line-clamp-2 ${!video.thumbnail_url ? 'cursor-pointer hover:text-blue-600' : ''}`}
        >
          {video.title}
          {video.fetch_status === 'pending' && (
            <span className="text-[10px] text-yellow-500 font-normal ml-1">(fetching...)</span>
          )}
          {video.fetch_status === 'unavailable' && (
            <span className="text-[10px] text-red-500 font-normal ml-1">(unavailable)</span>
          )}
        </h3>
        {video.channel_title && (
          <div className="mb-2 text-xs text-gray-500">
            {video.channel_title}
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          {video.state && (
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold text-white uppercase ${getStateColorClasses(video.state)}`}>
              {video.state}
            </span>
          )}
          {onStateChange && (
            <StateSwitchButton video={video} onStateChange={handleStateChange} />
          )}
        </div>
        {video.tags && video.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 bg-gray-200 rounded text-[11px] text-gray-700"
              >
                {tag.name}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="text-[11px] text-gray-500">
                +{video.tags.length - 3}
              </span>
            )}
          </div>
        )}
        <div className="mt-2 text-[11px] text-gray-500 flex flex-col gap-1">
          {video.published_at && (
            <div>
              Published: {format(new Date(video.published_at), 'MMM d, yyyy')}
            </div>
          )}
          {video.added_to_playlist_at && (
            <div>
              Added: {format(new Date(video.added_to_playlist_at), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoCard

