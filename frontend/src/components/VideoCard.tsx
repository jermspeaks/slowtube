import { Video } from '../types/video'
import { format } from 'date-fns'

interface VideoCardProps {
  video: Video
  onClick: () => void
}

function VideoCard({ video, onClick }: VideoCardProps) {
  const getStateColor = (state?: string | null) => {
    switch (state) {
      case 'feed': return '#28a745'
      case 'inbox': return '#ffc107'
      case 'archive': return '#6c757d'
      default: return '#6c757d'
    }
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {video.thumbnail_url && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <img
            src={video.thumbnail_url}
            alt={video.title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          {video.duration && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {video.duration}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: '12px' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {video.title}
        </h3>
        {video.state && (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: getStateColor(video.state),
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            {video.state}
          </span>
        )}
        {video.tags && video.tags.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
        )}
        {video.published_at && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#6c757d' }}>
            {format(new Date(video.published_at), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCard

