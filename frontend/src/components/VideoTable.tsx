import { Video } from '../types/video'
import { format } from 'date-fns'

interface VideoTableProps {
  videos: Video[]
  onVideoClick: (video: Video) => void
}

function VideoTable({ videos, onVideoClick }: VideoTableProps) {
  const getStateColorClasses = (state?: string | null) => {
    switch (state) {
      case 'feed': return 'bg-green-500'
      case 'inbox': return 'bg-yellow-500'
      case 'archive': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left border-b-2 border-gray-300">Thumbnail</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Title</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Channel</th>
            <th className="p-3 text-left border-b-2 border-gray-300">State</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Tags</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Duration</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Published</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Added</th>
          </tr>
        </thead>
        <tbody>
          {videos.map(video => (
            <tr
              key={video.id}
              onClick={() => onVideoClick(video)}
              className="cursor-pointer border-b border-gray-300 hover:bg-gray-100"
            >
              <td className="p-2">
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
                  <div className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {video.description}
                  </div>
                )}
              </td>
              <td className="p-3 text-gray-500 text-xs">
                {video.channel_title || '-'}
              </td>
              <td className="p-3">
                {video.state && (
                  <span className={`inline-block px-2 py-1 rounded-full text-[11px] font-bold text-white uppercase ${getStateColorClasses(video.state)}`}>
                    {video.state}
                  </span>
                )}
              </td>
              <td className="p-3">
                {video.tags && video.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
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
                ) : (
                  <span className="text-gray-500 text-xs">-</span>
                )}
              </td>
              <td className="p-3 text-gray-500 text-xs">
                {video.duration || '-'}
              </td>
              <td className="p-3 text-gray-500 text-xs">
                {video.published_at ? format(new Date(video.published_at), 'MMM d, yyyy') : '-'}
              </td>
              <td className="p-3 text-gray-500 text-xs">
                {video.added_to_playlist_at ? format(new Date(video.added_to_playlist_at), 'MMM d, yyyy') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default VideoTable

