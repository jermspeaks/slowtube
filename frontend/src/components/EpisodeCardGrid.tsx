import { Episode } from '../types/episode'
import { format } from 'date-fns'
import { tvShowsAPI } from '../services/api'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Check, X } from 'lucide-react'
import SeasonAccordion from './SeasonAccordion'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface EpisodeCardGridProps {
  episodes: Episode[]
  tvShowId: number
  tvShowPoster?: string | null
  onUpdate?: () => void
  onEpisodeClick?: (episode: Episode) => void
}

function EpisodeCardGrid({ episodes, tvShowId, tvShowPoster, onUpdate, onEpisodeClick }: EpisodeCardGridProps) {
  // Group episodes by season
  const seasonsMap = new Map<number, Episode[]>()
  episodes.forEach(episode => {
    const season = episode.season_number
    if (!seasonsMap.has(season)) {
      seasonsMap.set(season, [])
    }
    seasonsMap.get(season)!.push(episode)
  })
  
  const seasons = Array.from(seasonsMap.entries())
    .map(([seasonNumber, seasonEpisodes]) => ({
      seasonNumber,
      episodes: seasonEpisodes.sort((a, b) => a.episode_number - b.episode_number),
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber)

  const handleMarkWatched = async (episode: Episode) => {
    try {
      await tvShowsAPI.markEpisodeWatched(episode.tv_show_id, episode.id)
      toast.success('Episode marked as watched')
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error marking episode as watched:', error)
      toast.error('Failed to mark episode as watched')
    }
  }

  const handleMarkUnwatched = async (episode: Episode) => {
    try {
      await tvShowsAPI.markEpisodeUnwatched(episode.tv_show_id, episode.id)
      toast.success('Episode marked as unwatched')
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error marking episode as unwatched:', error)
      toast.error('Failed to mark episode as unwatched')
    }
  }

  const getImageUrl = (episode: Episode) => {
    if (episode.still_path) {
      return `${TMDB_IMAGE_BASE}/w342${episode.still_path}`
    }
    if (tvShowPoster) {
      return `${TMDB_IMAGE_BASE}/w342${tvShowPoster}`
    }
    return null
  }

  return (
    <div className="space-y-2">
      {seasons.map(({ seasonNumber, episodes: seasonEpisodes }) => (
        <SeasonAccordion
          key={seasonNumber}
          seasonNumber={seasonNumber}
          episodes={seasonEpisodes}
          tvShowId={tvShowId}
          onUpdate={onUpdate}
          defaultOpen={seasonEpisodes.some(e => e.is_watched === 0)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {seasonEpisodes.map(episode => {
              const isWatched = episode.is_watched === 1
              const imageUrl = getImageUrl(episode)
              
              return (
                <div
                  key={episode.id}
                  className={`bg-card rounded-lg overflow-hidden shadow-md border-2 transition-all cursor-pointer ${
                    isWatched ? 'border-border opacity-60' : 'border-transparent hover:border-primary'
                  }`}
                  onClick={() => onEpisodeClick?.(episode)}
                >
                  {imageUrl && (
                    <div className="relative w-full pt-[56.25%]">
                      <img
                        src={imageUrl}
                        alt={episode.name || 'Episode'}
                        className="absolute top-0 left-0 w-full h-full object-cover"
                      />
                      {isWatched && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        S{episode.season_number.toString().padStart(2, '0')}E{episode.episode_number.toString().padStart(2, '0')}
                      </p>
                      <h3 className="text-sm font-bold line-clamp-2 mb-1">
                        {episode.name || 'Untitled Episode'}
                      </h3>
                      {episode.air_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(episode.air_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {isWatched ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkUnwatched(episode)}
                          className="flex-1 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Unwatch
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleMarkWatched(episode)}
                          className="flex-1 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </SeasonAccordion>
      ))}
    </div>
  )
}

export default EpisodeCardGrid

