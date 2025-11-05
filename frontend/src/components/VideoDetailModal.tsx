import { Video, VideoState, Comment } from '../types/video'
import { videosAPI } from '../services/api'
import TagInput from './TagInput'
import CommentSection from './CommentSection'
import { format } from 'date-fns'

interface VideoDetailModalProps {
  video: Video | null
  onClose: () => void
  onVideoUpdated: (video: Video) => void
}

function VideoDetailModal({ video, onClose, onVideoUpdated }: VideoDetailModalProps) {
  if (!video) return null

  const handleStateChange = async (newState: VideoState) => {
    try {
      await videosAPI.updateState(video.id, newState)
      onVideoUpdated({ ...video, state: newState })
    } catch (error) {
      console.error('Error updating state:', error)
      alert('Failed to update video state')
    }
  }

  const handleTagAdded = (tag: { id: number; name: string }) => {
    onVideoUpdated({
      ...video,
      tags: [...(video.tags || []), tag]
    })
  }

  const handleTagRemoved = (tagId: number) => {
    onVideoUpdated({
      ...video,
      tags: video.tags?.filter(t => t.id !== tagId) || []
    })
  }

  const handleCommentAdded = (comment: Comment) => {
    onVideoUpdated({
      ...video,
      comments: [...(video.comments || []), comment]
    })
  }

  const handleCommentUpdated = (comment: Comment) => {
    onVideoUpdated({
      ...video,
      comments: video.comments?.map(c => c.id === comment.id ? comment : c) || []
    })
  }

  const handleCommentRemoved = (commentId: number) => {
    onVideoUpdated({
      ...video,
      comments: video.comments?.filter(c => c.id !== commentId) || []
    })
  }

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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, flex: 1 }}>{video.title}</h2>
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '16px',
                color: '#6c757d'
              }}
            >
              ×
            </button>
          </div>

          {video.thumbnail_url && (
            <div style={{ marginBottom: '20px' }}>
              <img
                src={video.thumbnail_url}
                alt={video.title}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>State</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['feed', 'inbox', 'archive'] as VideoState[]).map(state => (
                <button
                  key={state}
                  onClick={() => handleStateChange(state)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: video.state === state ? 'bold' : 'normal',
                    backgroundColor: video.state === state ? getStateColor(state) : '#e9ecef',
                    color: video.state === state ? 'white' : '#333',
                    textTransform: 'capitalize'
                  }}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          {video.description && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Description</h3>
              <p style={{ color: '#495057', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {video.description}
              </p>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <TagInput
              videoId={video.id}
              existingTags={video.tags || []}
              onTagAdded={handleTagAdded}
              onTagRemoved={handleTagRemoved}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <CommentSection
              videoId={video.id}
              comments={video.comments || []}
              onCommentAdded={handleCommentAdded}
              onCommentUpdated={handleCommentUpdated}
              onCommentRemoved={handleCommentRemoved}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6c757d', flexWrap: 'wrap' }}>
            {video.duration && <span>Duration: {video.duration}</span>}
            {video.published_at && (
              <span>Published: {format(new Date(video.published_at), 'MMM d, yyyy')}</span>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#007bff', textDecoration: 'none' }}
            >
              Watch on YouTube →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoDetailModal

