import { useState, useRef, useEffect } from 'react'
import { Video, VideoState, Comment } from '../types/video'
import { videosAPI } from '../services/api'
import TagInput from './TagInput'
import CommentSection from './CommentSection'
import VideoPlayer from './VideoPlayer'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { ChevronLeft, ChevronRight, Inbox, Archive, Rss } from 'lucide-react'

interface VideoDetailModalProps {
  video: Video | null
  videos?: Video[]
  onClose: () => void
  onVideoUpdated: (video: Video) => void
  onVideoChange?: (video: Video) => void
}

function VideoDetailModal({ video, videos = [], onClose, onVideoUpdated, onVideoChange }: VideoDetailModalProps) {
  const [loading, setLoading] = useState(false)
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

    // Use requestAnimationFrame to ensure DOM is ready
    const checkOverflow = () => {
      const element = descriptionRef.current
      if (!element) return

      // Temporarily remove line-clamp to measure full height
      const hasLineClamp = element.classList.contains('line-clamp-3')
      
      if (hasLineClamp) {
        element.classList.remove('line-clamp-3')
        const fullHeight = element.scrollHeight
        element.classList.add('line-clamp-3')
        const clampedHeight = element.clientHeight
        
        setShowExpandButton(fullHeight > clampedHeight)
      } else {
        // If expanded, check if it would overflow when collapsed
        element.classList.add('line-clamp-3')
        const clampedHeight = element.clientHeight
        element.classList.remove('line-clamp-3')
        const fullHeight = element.scrollHeight
        
        setShowExpandButton(fullHeight > clampedHeight)
      }
    }

    // Wait for next frame to ensure DOM is updated
    requestAnimationFrame(() => {
      requestAnimationFrame(checkOverflow)
    })
  }, [video?.description, isDescriptionExpanded])
  
  if (!video) return null

  const handleStateChange = async (newState: VideoState) => {
    try {
      await videosAPI.updateState(video.id, newState)
      onVideoUpdated({ ...video, state: newState })
    } catch (error) {
      console.error('Error updating state:', error)
      toast.error('Failed to update video state')
    }
  }

  const getAvailableStateTransitions = () => {
    const currentState = video.state

    if (currentState === 'feed') {
      return [
        { label: 'Move to Inbox', state: 'inbox' as const, icon: Inbox, color: 'bg-yellow-600 hover:bg-yellow-700' },
        { label: 'Move to Archive', state: 'archive' as const, icon: Archive, color: 'bg-gray-600 hover:bg-gray-700' },
      ]
    } else if (currentState === 'inbox') {
      return [
        { label: 'Move to Feed', state: 'feed' as const, icon: Rss, color: 'bg-green-600 hover:bg-green-700' },
        { label: 'Move to Archive', state: 'archive' as const, icon: Archive, color: 'bg-gray-600 hover:bg-gray-700' },
      ]
    } else if (currentState === 'archive') {
      return [
        { label: 'Move to Feed', state: 'feed' as const, icon: Rss, color: 'bg-green-600 hover:bg-green-700' },
        { label: 'Move to Inbox', state: 'inbox' as const, icon: Inbox, color: 'bg-yellow-600 hover:bg-yellow-700' },
      ]
    } else {
      // null state - show all options
      return [
        { label: 'Move to Feed', state: 'feed' as const, icon: Rss, color: 'bg-green-600 hover:bg-green-700' },
        { label: 'Move to Inbox', state: 'inbox' as const, icon: Inbox, color: 'bg-yellow-600 hover:bg-yellow-700' },
        { label: 'Move to Archive', state: 'archive' as const, icon: Archive, color: 'bg-gray-600 hover:bg-gray-700' },
      ]
    }
  }

  const currentIndex = videos.length > 0 ? videos.findIndex(v => v.id === video.id) : -1
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < videos.length - 1

  const handlePrevious = async () => {
    if (!hasPrevious || currentIndex <= 0) return
    
    setLoading(true)
    try {
      const previousVideo = videos[currentIndex - 1]
      const fullVideo = await videosAPI.getById(previousVideo.id)
      if (onVideoChange) {
        onVideoChange(fullVideo)
      } else {
        onVideoUpdated(fullVideo)
      }
    } catch (error) {
      console.error('Error loading previous video:', error)
      toast.error('Failed to load previous video')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (!hasNext || currentIndex < 0 || currentIndex >= videos.length - 1) return
    
    setLoading(true)
    try {
      const nextVideo = videos[currentIndex + 1]
      const fullVideo = await videosAPI.getById(nextVideo.id)
      if (onVideoChange) {
        onVideoChange(fullVideo)
      } else {
        onVideoUpdated(fullVideo)
      }
    } catch (error) {
      console.error('Error loading next video:', error)
      toast.error('Failed to load next video')
    } finally {
      setLoading(false)
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


  const availableTransitions = getAvailableStateTransitions()

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-2"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg max-w-[95vw] w-full max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <div className="flex justify-between items-start mb-3">
            <h2 className="m-0 flex-1 text-lg">{video.title}</h2>
            <button
              onClick={onClose}
              className="border-none bg-transparent text-2xl cursor-pointer p-0 ml-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>

          <div className="mb-3">
            <VideoPlayer video={video} />
          </div>

          {video.description && (
            <div className="mb-3">
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

          <div className="mb-3">
            <TagInput
              videoId={video.id}
              existingTags={video.tags || []}
              onTagAdded={handleTagAdded}
              onTagRemoved={handleTagRemoved}
            />
          </div>

          <div className="mb-3">
            <CommentSection
              videoId={video.id}
              comments={video.comments || []}
              onCommentAdded={handleCommentAdded}
              onCommentUpdated={handleCommentUpdated}
              onCommentRemoved={handleCommentRemoved}
            />
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground flex-wrap mb-3">
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

          {/* Bottom action bar with state buttons and navigation */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex gap-2 flex-wrap">
              {availableTransitions.map(({ label, state, icon: Icon, color }) => (
                <Button
                  key={state}
                  onClick={() => handleStateChange(state)}
                  size="sm"
                  className={`${color} text-white`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {videos.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handlePrevious}
                  disabled={!hasPrevious || loading}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!hasNext || loading}
                  variant="outline"
                  size="sm"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoDetailModal

