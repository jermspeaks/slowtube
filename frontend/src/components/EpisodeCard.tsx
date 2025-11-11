import { Episode } from '../types/episode'
import { Check, Archive } from 'lucide-react'
import { tvShowsAPI } from '../services/api'
import { Button } from './ui/button'

interface EpisodeCardProps {
  episode: Episode
  onUpdate?: () => void
}

function EpisodeCard({ episode, onUpdate }: EpisodeCardProps) {
  const isWatched = episode.is_watched === 1
  const imageUrl = episode.still_path 
    ? `https://image.tmdb.org/t/p/w342${episode.still_path}`
    : episode.tv_show_poster
    ? `https://image.tmdb.org/t/p/w342${episode.tv_show_poster}`
    : null

  const handleMarkWatched = async () => {
    try {
      await tvShowsAPI.markEpisodeWatched(episode.tv_show_id, episode.id)
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error marking episode as watched:', error)
      alert('Failed to mark episode as watched')
    }
  }

  const handleArchiveShow = async () => {
    try {
      if (confirm(`Archive "${episode.tv_show_title}"? This will mark all episodes as watched.`)) {
        await tvShowsAPI.markAllEpisodesWatched(episode.tv_show_id)
        await tvShowsAPI.archive(episode.tv_show_id, true)
        if (onUpdate) {
          onUpdate()
        }
      }
    } catch (error) {
      console.error('Error archiving show:', error)
      alert('Failed to archive show')
    }
  }

  return (
    <div className={`bg-card rounded-lg overflow-hidden shadow-md border-2 transition-all ${
      isWatched ? 'border-border opacity-60' : 'border-transparent hover:border-primary'
    }`}>
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
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold line-clamp-2 mb-1">
              {episode.tv_show_title}
            </h3>
            <p className="text-xs text-muted-foreground mb-1">
              S{episode.season_number.toString().padStart(2, '0')}E{episode.episode_number.toString().padStart(2, '0')}
              {episode.name && ` - ${episode.name}`}
            </p>
            {episode.air_date && (
              <p className="text-xs text-muted-foreground">
                {new Date(episode.air_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isWatched ? "outline" : "default"}
            size="sm"
            onClick={handleMarkWatched}
            className="flex-1 text-xs"
            disabled={isWatched}
          >
            {isWatched ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Watched
              </>
            ) : (
              'Mark Watched'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchiveShow}
            className="text-xs"
            title="Archive show (mark all episodes as watched)"
          >
            <Archive className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EpisodeCard

