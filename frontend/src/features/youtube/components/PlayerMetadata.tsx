import { useState, useRef, useEffect } from 'react'
import { Video } from '../types/video'
import { format } from 'date-fns'
import TagInput from './TagInput'
import CommentSection from './CommentSection'
import LikeButton from './LikeButton'

interface PlayerMetadataProps {
  video: Video
  onTagAdded: (tag: { id: number; name: string }) => void
  onTagRemoved: (tagId: number) => void
  onCommentAdded: (comment: any) => void
  onCommentUpdated: (comment: any) => void
  onCommentRemoved: (commentId: number) => void
  onVideoUpdated?: (video: Video) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function PlayerMetadata({
  video,
  onTagAdded,
  onTagRemoved,
  onCommentAdded,
  onCommentUpdated,
  onCommentRemoved,
  onVideoUpdated,
  collapsed = false,
  onToggleCollapse,
}: PlayerMetadataProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)
  const descriptionRef = useRef<HTMLParagraphElement>(null)

  // Reset expanded state when video changes
  useEffect(() => {
    setIsDescriptionExpanded(false)
  }, [video?.id])

  // Detect if description exceeds 3 lines
  useEffect(() => {
    if (!video?.description || !descriptionRef.current) {
      setShowExpandButton(false)
      return
    }

    const checkOverflow = () => {
      const element = descriptionRef.current
      if (!element) return

      const hasLineClamp = element.classList.contains('line-clamp-3')

      if (hasLineClamp) {
        element.classList.remove('line-clamp-3')
        const fullHeight = element.scrollHeight
        element.classList.add('line-clamp-3')
        const clampedHeight = element.clientHeight

        setShowExpandButton(fullHeight > clampedHeight)
      } else {
        element.classList.add('line-clamp-3')
        const clampedHeight = element.clientHeight
        element.classList.remove('line-clamp-3')
        const fullHeight = element.scrollHeight

        setShowExpandButton(fullHeight > clampedHeight)
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(checkOverflow)
    })
  }, [video?.description, isDescriptionExpanded])

  if (collapsed) {
    return (
      <div className="p-4 bg-card rounded-lg border">
        <button
          onClick={onToggleCollapse}
          className="w-full text-left font-bold text-lg mb-2 hover:text-primary transition-colors"
        >
          {video.title} ▼
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="w-full text-left font-bold text-lg mb-2 hover:text-primary transition-colors"
        >
          {video.title} ▲
        </button>
      )}
      {!onToggleCollapse && (
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold flex-1">{video.title}</h2>
          {onVideoUpdated && (
            <LikeButton
              video={video}
              onToggle={(isLiked) => {
                onVideoUpdated({ ...video, is_liked: isLiked })
              }}
              size="md"
              variant="ghost"
            />
          )}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        {video.channel_title && <span>Channel: {video.channel_title}</span>}
        {video.duration && <span>Duration: {video.duration}</span>}
        {video.published_at && (
          <span>Published: {format(new Date(video.published_at), 'MMM d, yyyy')}</span>
        )}
        <a
          href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 no-underline hover:underline"
        >
          Watch on YouTube →
        </a>
      </div>

      {video.description && (
        <div>
          <h3 className="mb-2 text-sm font-bold">Description</h3>
          <p
            ref={descriptionRef}
            className={`text-foreground whitespace-pre-wrap leading-relaxed text-sm ${
              !isDescriptionExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {video.description}
          </p>
          {showExpandButton && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {isDescriptionExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      <div>
        <TagInput
          videoId={video.id}
          existingTags={video.tags || []}
          onTagAdded={onTagAdded}
          onTagRemoved={onTagRemoved}
        />
      </div>

      <div>
        <CommentSection
          videoId={video.id}
          comments={video.comments || []}
          onCommentAdded={onCommentAdded}
          onCommentUpdated={onCommentUpdated}
          onCommentRemoved={onCommentRemoved}
        />
      </div>
    </div>
  )
}

export default PlayerMetadata
