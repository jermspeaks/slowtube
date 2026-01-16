import { Button } from '@/shared/components/ui/button'
import { ChevronLeft, ChevronRight, Inbox, Archive, Rss } from 'lucide-react'
import { Video, VideoState } from '../types/video'

interface PlayerNavigationProps {
  video: Video
  hasPrevious: boolean
  hasNext: boolean
  currentIndex: number
  totalVideos: number
  onPrevious: () => void
  onNext: () => void
  onStateChange: (newState: VideoState) => void
  loading?: boolean
}

function PlayerNavigation({
  video,
  hasPrevious,
  hasNext,
  currentIndex,
  totalVideos,
  onPrevious,
  onNext,
  onStateChange,
  loading = false,
}: PlayerNavigationProps) {
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
      return [
        { label: 'Move to Feed', state: 'feed' as const, icon: Rss, color: 'bg-green-600 hover:bg-green-700' },
        { label: 'Move to Inbox', state: 'inbox' as const, icon: Inbox, color: 'bg-yellow-600 hover:bg-yellow-700' },
        { label: 'Move to Archive', state: 'archive' as const, icon: Archive, color: 'bg-gray-600 hover:bg-gray-700' },
      ]
    }
  }

  const availableTransitions = getAvailableStateTransitions()

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {availableTransitions.map(({ label, state, icon: Icon, color }) => (
          <Button key={state} onClick={() => onStateChange(state)} size="sm" className={`${color} text-white`}>
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Video {currentIndex + 1} of {totalVideos}
        </span>
        <div className="flex gap-2">
          <Button onClick={onPrevious} disabled={!hasPrevious || loading} variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button onClick={onNext} disabled={!hasNext || loading} variant="outline" size="sm">
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PlayerNavigation
