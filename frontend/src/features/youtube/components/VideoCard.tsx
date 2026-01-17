import { Video } from '../types/video'
import { format } from 'date-fns'
import { Inbox, Archive, Rss, Play } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { videosAPI } from '../services/api'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router'

interface VideoCardProps {
  video: Video
  onClick: () => void
  onStateChange?: (updatedVideo: Video) => void
  showFeedDate?: boolean
  showAddedDate?: boolean
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
}

function VideoCard({ video, onClick, onStateChange, showFeedDate = false, showAddedDate = true, selectable = false, selected = false, onSelectChange }: VideoCardProps) {
  const navigate = useNavigate()
  
  const handleStateChange = (updatedVideo: Video) => {
    if (onStateChange) {
      onStateChange(updatedVideo)
    }
  }

  const handleOpenInPlayer = (e: React.MouseEvent) => {
    e.stopPropagation()
    const listType = video.state || 'inbox'
    navigate(`/youtube/player?id=${video.id}&list=${listType}`)
  }

  const handleMoveToInbox = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await videosAPI.updateState(video.id, 'inbox')
      const updatedVideo = { ...video, state: 'inbox' as const }
      handleStateChange(updatedVideo)
    } catch (error) {
      console.error('Error updating video state:', error)
      toast.error('Failed to update video state')
    }
  }

  const handleMoveToArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await videosAPI.updateState(video.id, 'archive')
      const updatedVideo = { ...video, state: 'archive' as const }
      handleStateChange(updatedVideo)
    } catch (error) {
      console.error('Error updating video state:', error)
      toast.error('Failed to update video state')
    }
  }

  const handleMoveToFeed = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await videosAPI.updateState(video.id, 'feed')
      const updatedVideo = { ...video, state: 'feed' as const }
      handleStateChange(updatedVideo)
    } catch (error) {
      console.error('Error updating video state:', error)
      toast.error('Failed to update video state')
    }
  }

  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg relative">
      {selectable && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation()
              if (onSelectChange) {
                onSelectChange(e.target.checked)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
      )}
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
          <div className="mb-2 text-xs text-muted-foreground">
            {video.youtube_channel_id ? (
              <Link
                to={`/youtube/channels/${video.youtube_channel_id}/watch-later`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary hover:underline transition-colors"
              >
                {video.channel_title}
              </Link>
            ) : (
              video.channel_title
            )}
          </div>
        )}
        {video.tags && video.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 bg-muted rounded text-[11px] text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{video.tags.length - 3}
              </span>
            )}
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted-foreground flex flex-col gap-1">
          {video.published_at && (
            <div>
              Published: {format(new Date(video.published_at), 'MMM d, yyyy')}
            </div>
          )}
          {showFeedDate && video.created_at && (
            <div>
              Added to feed: {format(new Date(video.created_at), 'MMM d, yyyy')}
            </div>
          )}
          {!showFeedDate && showAddedDate && video.added_to_playlist_at && (
            <div>
              Added: {format(new Date(video.added_to_playlist_at), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <Button
          onClick={handleOpenInPlayer}
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90 h-7 w-7 p-0"
          title="Open in Player"
        >
          <Play className="h-3 w-3" />
        </Button>
      </div>
      {onStateChange && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          {(video.state === 'inbox' || video.state === 'archive') && (
            <Button
              onClick={handleMoveToFeed}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-7 w-7 p-0"
              title="Move to Feed"
            >
              <Rss className="h-3 w-3" />
            </Button>
          )}
          {video.state !== 'inbox' && (
            <Button
              onClick={handleMoveToInbox}
              variant="default"
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 h-7 w-7 p-0"
              title="Move to Inbox"
            >
              <Inbox className="h-3 w-3" />
            </Button>
          )}
          {video.state !== 'archive' && (
            <Button
              onClick={handleMoveToArchive}
              variant="default"
              size="sm"
              className="bg-gray-600 hover:bg-gray-700 h-7 w-7 p-0"
              title="Move to Archive"
            >
              <Archive className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default VideoCard

