import { Video } from '../types/video'
import { format } from 'date-fns'
import { Inbox, Archive, Rss, Play } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { videosAPI } from '../services/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'

interface VideoTableProps {
  videos: Video[]
  onVideoClick: (video: Video) => void
  onStateChange?: (updatedVideo: Video) => void
  selectable?: boolean
  selectedVideoIds?: Set<number>
  onSelectionChange?: (videoId: number, selected: boolean) => void
  onSelectAll?: () => void
  showFeedDate?: boolean
  showAddedDate?: boolean
}

function VideoTable({ 
  videos, 
  onVideoClick, 
  onStateChange,
  selectable = false,
  selectedVideoIds = new Set(),
  onSelectionChange,
  onSelectAll,
  showFeedDate = false,
  showAddedDate = true
}: VideoTableProps) {
  const navigate = useNavigate()
  
  const handleStateChange = (updatedVideo: Video) => {
    if (onStateChange) {
      onStateChange(updatedVideo)
    }
  }

  const handleOpenInPlayer = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation()
    const listType = video.state || 'inbox'
    navigate(`/youtube/player?id=${video.id}&list=${listType}`)
  }

  const handleMoveToInbox = async (video: Video, e: React.MouseEvent) => {
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

  const handleMoveToArchive = async (video: Video, e: React.MouseEvent) => {
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

  const handleMoveToFeed = async (video: Video, e: React.MouseEvent) => {
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

  const allSelected = selectable && videos.length > 0 && selectedVideoIds.size === videos.length
  const someSelected = selectable && selectedVideoIds.size > 0 && selectedVideoIds.size < videos.length

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll()
    }
  }

  const handleRowSelect = (videoId: number, selected: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(videoId, selected)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted">
            {selectable && (
              <th className="p-2 md:p-3 text-left border-b-2 border-border w-10 md:w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected && !allSelected
                  }}
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                />
              </th>
            )}
            <th className="p-2 md:p-3 text-left border-b-2 border-border">Thumbnail</th>
            <th className="p-2 md:p-3 text-left border-b-2 border-border">Title</th>
            <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Channel</th>
            <th className="p-2 md:p-3 text-left border-b-2 border-border hidden lg:table-cell">Duration</th>
            <th className="p-2 md:p-3 text-left border-b-2 border-border hidden lg:table-cell">Published</th>
            {showAddedDate && (
              showFeedDate ? (
                <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Added to Latest</th>
              ) : (
                <th className="p-2 md:p-3 text-left border-b-2 border-border hidden md:table-cell">Added</th>
              )
            )}
            <th className="p-2 md:p-3 text-left border-b-2 border-border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {videos.map(video => (
            <tr
              key={video.id}
              className="border-b border-border hover:bg-accent transition-colors"
            >
              {selectable && (
                <td className="p-2 md:p-3">
                  <input
                    type="checkbox"
                    checked={selectedVideoIds.has(video.id)}
                    onChange={(e) => handleRowSelect(video.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer"
                  />
                </td>
              )}
              <td
                className="p-2 cursor-pointer"
                onClick={() => onVideoClick(video)}
              >
                {video.thumbnail_url && (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-20 h-11 md:w-[120px] md:h-[67px] object-cover rounded"
                  />
                )}
              </td>
              <td className="p-2 md:p-3 max-w-[200px] md:max-w-[400px]">
                <div className="font-bold mb-1 overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2 text-xs md:text-sm">
                  {video.title}
                  {video.fetch_status === 'pending' && (
                    <span className="text-[10px] text-yellow-500 font-normal">(fetching...)</span>
                  )}
                  {video.fetch_status === 'unavailable' && (
                    <span className="text-[10px] text-red-500 font-normal">(unavailable)</span>
                  )}
                </div>
                {video.description && (
                  <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap hidden md:block">
                    {video.description}
                  </div>
                )}
                {video.channel_title && (
                  <div className="text-xs text-muted-foreground md:hidden mt-1">
                    {video.channel_title}
                  </div>
                )}
              </td>
              <td className="p-2 md:p-3 text-muted-foreground text-xs hidden md:table-cell">
                {video.channel_title || '-'}
              </td>
              <td className="p-2 md:p-3 text-muted-foreground text-xs hidden lg:table-cell">
                {video.duration || '-'}
              </td>
              <td className="p-2 md:p-3 text-muted-foreground text-xs hidden lg:table-cell">
                {video.published_at ? format(new Date(video.published_at), 'MMM d, yyyy') : '-'}
              </td>
              {showAddedDate && (
                <td className="p-2 md:p-3 text-muted-foreground text-xs hidden md:table-cell">
                  {showFeedDate && video.added_to_latest_at
                    ? format(new Date(video.added_to_latest_at), 'MMM d, yyyy')
                    : !showFeedDate && video.added_to_playlist_at
                    ? format(new Date(video.added_to_playlist_at), 'MMM d, yyyy')
                    : '-'}
                </td>
              )}
              <td className="p-2 md:p-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={(e) => handleOpenInPlayer(video, e)}
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 h-7 w-7 p-0"
                    title="Open in Player"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  {onStateChange && (
                    <>
                      {(video.state === 'inbox' || video.state === 'archive') && (
                      <Button
                        onClick={(e) => handleMoveToFeed(video, e)}
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
                        onClick={(e) => handleMoveToInbox(video, e)}
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
                        onClick={(e) => handleMoveToArchive(video, e)}
                        variant="default"
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-700 h-7 w-7 p-0"
                        title="Move to Archive"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default VideoTable

