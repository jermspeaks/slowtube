import { Video } from '../types/video'
import { format } from 'date-fns'
import StateSwitchButton from './StateSwitchButton'

interface VideoTableProps {
  videos: Video[]
  onVideoClick: (video: Video) => void
  onStateChange?: (updatedVideo: Video) => void
  selectable?: boolean
  selectedVideoIds?: Set<number>
  onSelectionChange?: (videoId: number, selected: boolean) => void
  onSelectAll?: () => void
  showFeedDate?: boolean
}

function VideoTable({ 
  videos, 
  onVideoClick, 
  onStateChange,
  selectable = false,
  selectedVideoIds = new Set(),
  onSelectionChange,
  onSelectAll,
  showFeedDate = false
}: VideoTableProps) {
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
              <th className="p-3 text-left border-b-2 border-border w-12">
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
            <th className="p-3 text-left border-b-2 border-border">Thumbnail</th>
            <th className="p-3 text-left border-b-2 border-border">Title</th>
            <th className="p-3 text-left border-b-2 border-border">Channel</th>
            <th className="p-3 text-left border-b-2 border-border">State</th>
            <th className="p-3 text-left border-b-2 border-border">Tags</th>
            <th className="p-3 text-left border-b-2 border-border">Duration</th>
            <th className="p-3 text-left border-b-2 border-border">Published</th>
            {showFeedDate ? (
              <th className="p-3 text-left border-b-2 border-border">Added to Latest</th>
            ) : (
              <th className="p-3 text-left border-b-2 border-border">Added</th>
            )}
          </tr>
        </thead>
        <tbody>
          {videos.map(video => (
            <tr
              key={video.id}
              className="border-b border-border hover:bg-accent transition-colors"
            >
              {selectable && (
                <td className="p-3">
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
                    className="w-[120px] h-[67px] object-cover rounded"
                  />
                )}
              </td>
              <td className="p-3 max-w-[400px]">
                <div className="font-bold mb-1 overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2">
                  {video.title}
                  {video.fetch_status === 'pending' && (
                    <span className="text-[10px] text-yellow-500 font-normal">(fetching...)</span>
                  )}
                  {video.fetch_status === 'unavailable' && (
                    <span className="text-[10px] text-red-500 font-normal">(unavailable)</span>
                  )}
                </div>
                {video.description && (
                  <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                    {video.description}
                  </div>
                )}
              </td>
              <td className="p-3 text-muted-foreground text-xs">
                {video.channel_title || '-'}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {video.state && (
                    <span className={`inline-block px-2 py-1 rounded-full text-[11px] font-bold text-white uppercase ${getStateColorClasses(video.state)}`}>
                      {video.state}
                    </span>
                  )}
                  {onStateChange && (
                    <StateSwitchButton video={video} onStateChange={handleStateChange} />
                  )}
                </div>
              </td>
              <td className="p-3">
                {video.tags && video.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
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
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </td>
              <td className="p-3 text-muted-foreground text-xs">
                {video.duration || '-'}
              </td>
              <td className="p-3 text-muted-foreground text-xs">
                {video.published_at ? format(new Date(video.published_at), 'MMM d, yyyy') : '-'}
              </td>
              <td className="p-3 text-muted-foreground text-xs">
                {showFeedDate && video.added_to_latest_at
                  ? format(new Date(video.added_to_latest_at), 'MMM d, yyyy')
                  : !showFeedDate && video.added_to_playlist_at
                  ? format(new Date(video.added_to_playlist_at), 'MMM d, yyyy')
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default VideoTable

