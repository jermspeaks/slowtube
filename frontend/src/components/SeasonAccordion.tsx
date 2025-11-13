import { useState } from 'react'
import { Episode } from '../types/episode'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Button } from './ui/button'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { tvShowsAPI } from '../services/api'
import { toast } from 'sonner'

interface SeasonAccordionProps {
  seasonNumber: number
  episodes: Episode[]
  tvShowId: number
  onUpdate?: () => void
  defaultOpen?: boolean
  children: React.ReactNode
}

function SeasonAccordion({ 
  seasonNumber, 
  episodes, 
  tvShowId, 
  onUpdate,
  defaultOpen = false,
  children 
}: SeasonAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  const watchedCount = episodes.filter(e => e.is_watched === 1).length
  const totalCount = episodes.length
  const progressPercentage = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0
  const allWatched = watchedCount === totalCount && totalCount > 0

  const handleMarkAllWatched = async () => {
    try {
      await tvShowsAPI.markSeasonWatched(tvShowId, seasonNumber)
      toast.success(`All episodes in season ${seasonNumber} marked as watched`)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error marking season as watched:', error)
      toast.error('Failed to mark season as watched')
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg mb-2">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3 flex-1">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <h3 className="font-semibold">Season {seasonNumber}</h3>
                <p className="text-sm text-muted-foreground">
                  {watchedCount} / {totalCount} episodes watched
                </p>
              </div>
              <div className="flex-1 max-w-[200px]">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            {!allWatched && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkAllWatched()
                }}
                className="ml-2"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark All Watched
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export default SeasonAccordion

