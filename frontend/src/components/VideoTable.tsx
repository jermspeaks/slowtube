import { Video } from '../types/video'
import { format } from 'date-fns'

interface VideoTableProps {
  videos: Video[]
  onVideoClick: (video: Video) => void
}

function VideoTable({ videos, onVideoClick }: VideoTableProps) {
  const getStateColor = (state?: string | null) => {
    switch (state) {
      case 'feed': return '#28a745'
      case 'inbox': return '#ffc107'
      case 'archive': return '#6c757d'
      default: return '#6c757d'
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Thumbnail</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Title</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Channel</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>State</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Tags</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Duration</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Published</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Added</th>
          </tr>
        </thead>
        <tbody>
          {videos.map(video => (
            <tr
              key={video.id}
              onClick={() => onVideoClick(video)}
              style={{
                cursor: 'pointer',
                borderBottom: '1px solid #dee2e6'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              <td style={{ padding: '8px' }}>
                {video.thumbnail_url && (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    style={{
                      width: '120px',
                      height: '67px',
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                  />
                )}
              </td>
              <td style={{ padding: '12px', maxWidth: '400px' }}>
                <div style={{
                  fontWeight: 'bold',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {video.title}
                  {video.fetch_status === 'pending' && (
                    <span style={{
                      fontSize: '10px',
                      color: '#ffc107',
                      fontWeight: 'normal'
                    }}>(fetching...)</span>
                  )}
                  {video.fetch_status === 'unavailable' && (
                    <span style={{
                      fontSize: '10px',
                      color: '#dc3545',
                      fontWeight: 'normal'
                    }}>(unavailable)</span>
                  )}
                </div>
                {video.description && (
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {video.description}
                  </div>
                )}
              </td>
              <td style={{ padding: '12px', color: '#6c757d', fontSize: '12px' }}>
                {video.channel_title || '-'}
              </td>
              <td style={{ padding: '12px' }}>
                {video.state && (
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: getStateColor(video.state),
                    textTransform: 'uppercase'
                  }}>
                    {video.state}
                  </span>
                )}
              </td>
              <td style={{ padding: '12px' }}>
                {video.tags && video.tags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                    {video.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag.id}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#495057'
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {video.tags.length > 3 && (
                      <span style={{ fontSize: '11px', color: '#6c757d' }}>
                        +{video.tags.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#6c757d', fontSize: '12px' }}>-</span>
                )}
              </td>
              <td style={{ padding: '12px', color: '#6c757d', fontSize: '12px' }}>
                {video.duration || '-'}
              </td>
              <td style={{ padding: '12px', color: '#6c757d', fontSize: '12px' }}>
                {video.published_at ? format(new Date(video.published_at), 'MMM d, yyyy') : '-'}
              </td>
              <td style={{ padding: '12px', color: '#6c757d', fontSize: '12px' }}>
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

