import { Video, VideoState, Comment } from '../types/video'
import { videosAPI } from '../services/api'
import TagInput from './TagInput'
import CommentSection from './CommentSection'
import VideoPlayer from './VideoPlayer'
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

  const getStateColorClasses = (state?: string | null) => {
    switch (state) {
      case 'feed': return 'bg-green-500'
      case 'inbox': return 'bg-yellow-500'
      case 'archive': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-[800px] w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <h2 className="m-0 flex-1">{video.title}</h2>
            <button
              onClick={onClose}
              className="border-none bg-transparent text-2xl cursor-pointer p-0 ml-4 text-gray-500"
            >
              ×
            </button>
          </div>

          <div className="mb-5">
            <VideoPlayer video={video} />
          </div>

          <div className="mb-5">
            <h3 className="mb-2 text-sm font-bold">State</h3>
            <div className="flex gap-2">
              {(['feed', 'inbox', 'archive'] as VideoState[]).map(state => (
                <button
                  key={state}
                  onClick={() => handleStateChange(state)}
                  className={`px-4 py-2 border-none rounded cursor-pointer capitalize ${
                    video.state === state
                      ? `${getStateColorClasses(state)} text-white font-bold`
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          {video.description && (
            <div className="mb-5">
              <h3 className="mb-2 text-sm font-bold">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {video.description}
              </p>
            </div>
          )}

          <div className="mb-5">
            <TagInput
              videoId={video.id}
              existingTags={video.tags || []}
              onTagAdded={handleTagAdded}
              onTagRemoved={handleTagRemoved}
            />
          </div>

          <div className="mb-5">
            <CommentSection
              videoId={video.id}
              comments={video.comments || []}
              onCommentAdded={handleCommentAdded}
              onCommentUpdated={handleCommentUpdated}
              onCommentRemoved={handleCommentRemoved}
            />
          </div>

          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
            {video.duration && <span>Duration: {video.duration}</span>}
            {video.published_at && (
              <span>Published: {format(new Date(video.published_at), 'MMM d, yyyy')}</span>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 no-underline"
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

