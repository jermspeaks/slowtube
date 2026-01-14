import { Episode } from '../types/episode'
import { format } from 'date-fns'
import { tvShowsAPI } from '../services/api'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Check, X } from 'lucide-react'
import SeasonAccordion from './SeasonAccordion'

interface EpisodeTableProps {
  episodes: Episode[]
  tvShowId: number
  onUpdate?: () => void
  onEpisodeClick?: (episode: Episode) => void
}

function EpisodeTable({ episodes, tvShowId, onUpdate, onEpisodeClick }: EpisodeTableProps) {
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-3 text-left border-b border-border text-sm font-semibold">Episode</th>
                  <th className="p-3 text-left border-b border-border text-sm font-semibold">Name</th>
                  <th className="p-3 text-left border-b border-border text-sm font-semibold">Air Date</th>
                  <th className="p-3 text-left border-b border-border text-sm font-semibold">Runtime</th>
                  <th className="p-3 text-left border-b border-border text-sm font-semibold">Status</th>
                  <th className="p-3 text-left border-b border-border text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasonEpisodes.map(episode => {
                  const isWatched = episode.is_watched === 1
                  return (
                    <tr
                      key={episode.id}
                      className={`border-b border-border hover:bg-accent transition-colors cursor-pointer ${
                        isWatched ? 'opacity-60' : ''
                      }`}
                      onClick={() => onEpisodeClick?.(episode)}
                    >
                      <td className="p-3 text-sm">
                        E{episode.episode_number.toString().padStart(2, '0')}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        {episode.name || 'Untitled Episode'}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {episode.air_date ? format(new Date(episode.air_date), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {episode.runtime ? `${episode.runtime} min` : '-'}
                      </td>
                      <td className="p-3">
                        {isWatched ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <Check className="h-4 w-4" />
                            Watched
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unwatched</span>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {isWatched ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkUnwatched(episode)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Unwatch
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleMarkWatched(episode)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Watch
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SeasonAccordion>
      ))}
    </div>
  )
}

export default EpisodeTable

