import { Episode } from '../types/episode'
import { TVShow } from '../types/tv-show'
import { format } from 'date-fns'
import { tvShowsAPI } from '../services/api'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Check, ExternalLink } from 'lucide-react'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface EpisodeDetailModalProps {
  episode: Episode | null
  tvShow: TVShow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

function EpisodeDetailModal({ episode, tvShow, open, onOpenChange, onUpdate }: EpisodeDetailModalProps) {
  if (!episode || !tvShow) return null

  const isWatched = episode.is_watched === 1
  const stillUrl = episode.still_path 
    ? `${TMDB_IMAGE_BASE}/w780${episode.still_path}`
    : null
  const tmdbUrl = `https://www.themoviedb.org/tv/${tvShow.tmdb_id}/season/${episode.season_number}/episode/${episode.episode_number}`

  const handleMarkWatched = async () => {
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

  const handleMarkUnwatched = async () => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            S{episode.season_number.toString().padStart(2, '0')}E{episode.episode_number.toString().padStart(2, '0')}
            {episode.name && ` - ${episode.name}`}
          </DialogTitle>
          <DialogDescription>
            {tvShow.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {stillUrl && (
            <div className="w-full">
              <img
                src={stillUrl}
                alt={episode.name || 'Episode'}
                className="w-full h-auto rounded-lg object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {episode.air_date && (
              <div>
                <span className="font-semibold">Air Date:</span>{' '}
                {format(new Date(episode.air_date), 'MMM d, yyyy')}
              </div>
            )}
            {episode.runtime && (
              <div>
                <span className="font-semibold">Runtime:</span> {episode.runtime} min
              </div>
            )}
            <div>
              <span className="font-semibold">Status:</span>{' '}
              {isWatched ? (
                <span className="text-green-600">Watched</span>
              ) : (
                <span className="text-muted-foreground">Unwatched</span>
              )}
            </div>
          </div>

          {episode.overview && (
            <div>
              <h3 className="font-semibold mb-2">Overview</h3>
              <p className="text-muted-foreground leading-relaxed">{episode.overview}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {isWatched ? (
              <Button
                variant="outline"
                onClick={handleMarkUnwatched}
                className="flex-1"
              >
                Mark Unwatched
              </Button>
            ) : (
              <Button
                onClick={handleMarkWatched}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Watched
              </Button>
            )}
            <Button
              variant="outline"
              asChild
            >
              <a
                href={tmdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                View on TMDB
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EpisodeDetailModal

