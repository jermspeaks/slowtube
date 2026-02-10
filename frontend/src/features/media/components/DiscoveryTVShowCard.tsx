import { format } from 'date-fns'
import { Plus, Check } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import type { DiscoveryTVShow } from '../types/tv-show'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface DiscoveryTVShowCardProps {
  show: DiscoveryTVShow
  onAdd: (tmdbId: number) => void
  isAdding?: boolean
  alreadyInList?: boolean
}

function DiscoveryTVShowCard({ show, onAdd, isAdding, alreadyInList }: DiscoveryTVShowCardProps) {
  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w500${path}`
  }

  const posterUrl = getImageUrl(show.poster_path)

  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col">
      {posterUrl ? (
        <div className="relative w-full pt-[150%]">
          <img
            src={posterUrl}
            alt={show.title}
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full pt-[150%] bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">No poster</span>
        </div>
      )}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="m-0 mb-2 text-sm font-bold line-clamp-2">
          {show.title}
        </h3>
        {show.overview && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {show.overview}
          </p>
        )}
        {show.first_air_date && (
          <div className="text-[11px] text-muted-foreground mb-3">
            First aired: {format(new Date(show.first_air_date), 'MMM d, yyyy')}
          </div>
        )}
        {alreadyInList ? (
          <div className="mt-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="h-4 w-4 shrink-0" />
            In your list
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="mt-auto w-full gap-2"
            onClick={() => onAdd(show.tmdb_id)}
            disabled={isAdding}
          >
            {isAdding ? (
              'Adding...'
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add to my shows
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default DiscoveryTVShowCard
