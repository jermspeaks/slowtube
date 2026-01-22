import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Video } from '../types/video'
import { videosAPI } from '../services/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  video: Video
  onToggle?: (isLiked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
}

function LikeButton({ video, onToggle, size = 'md', variant = 'ghost', className }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(video.is_liked || false)
  const [loading, setLoading] = useState(false)

  // Sync with video prop when it changes
  useEffect(() => {
    setIsLiked(video.is_liked || false)
  }, [video.is_liked])

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const newLikedState = !isLiked
    setIsLiked(newLikedState) // Optimistic update
    setLoading(true)

    try {
      const likedAt = newLikedState ? new Date().toISOString() : undefined
      await videosAPI.toggleLike(video.id, newLikedState, likedAt)
      
      if (onToggle) {
        onToggle(newLikedState)
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setIsLiked(!newLikedState)
      console.error('Error toggling like:', error)
      toast.error('Failed to update like status')
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        sizeClasses[size],
        className,
        isLiked && 'text-red-500 hover:text-red-600'
      )}
      title={isLiked ? 'Unlike' : 'Like'}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          isLiked ? 'fill-current' : 'stroke-current'
        )}
      />
    </Button>
  )
}

export default LikeButton
