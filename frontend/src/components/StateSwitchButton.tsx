import { Video } from '../types/video'
import { videosAPI } from '../services/api'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

interface StateSwitchButtonProps {
  video: Video
  onStateChange: (updatedVideo: Video) => void
}

function StateSwitchButton({ video, onStateChange }: StateSwitchButtonProps) {
  const handleStateChange = async (newState: 'feed' | 'inbox' | 'archive') => {
    try {
      await videosAPI.updateState(video.id, newState)
      // Update local video state
      const updatedVideo = { ...video, state: newState }
      onStateChange(updatedVideo)
    } catch (error) {
      console.error('Error updating video state:', error)
      toast.error('Failed to update video state')
    }
  }

  const getAvailableOptions = () => {
    const currentState = video.state

    if (currentState === 'feed') {
      return [
        { label: 'Move to Inbox', state: 'inbox' as const },
        { label: 'Move to Archive', state: 'archive' as const },
      ]
    } else if (currentState === 'inbox') {
      return [{ label: 'Move to Archive', state: 'archive' as const }]
    } else if (currentState === 'archive') {
      return [{ label: 'Move to Inbox', state: 'inbox' as const }]
    } else {
      // null state - show all options
      return [
        { label: 'Move to Feed', state: 'feed' as const },
        { label: 'Move to Inbox', state: 'inbox' as const },
        { label: 'Move to Archive', state: 'archive' as const },
      ]
    }
  }

  const options = getAvailableOptions()

  if (options.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className="h-7 px-2 text-xs"
        >
          Move
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.state}
            onClick={(e) => {
              e.stopPropagation()
              handleStateChange(option.state)
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default StateSwitchButton

