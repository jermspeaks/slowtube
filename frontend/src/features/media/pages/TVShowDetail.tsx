import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TVShow } from '../types/tv-show'
import { Episode } from '../types/episode'
import { ViewMode } from '../../youtube/types/video'
import { tvShowsAPI } from '../services/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import EpisodeTable from '../components/EpisodeTable'
import EpisodeCardGrid from '../components/EpisodeCardGrid'
import EpisodeDetailModal from '../components/EpisodeDetailModal'
import ViewToggle from '../../youtube/components/ViewToggle'
import { Check, Play, PlayCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

function TVShowDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [tvShow, setTvShow] = useState<TVShow | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMarkAllDialogOpen, setIsMarkAllDialogOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate('/tv-shows')
      return
    }

    loadTVShow()
    loadEpisodes()
  }, [navigate, id])

  const loadTVShow = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await tvShowsAPI.getById(parseInt(id, 10))
      setTvShow(data)
    } catch (error) {
      console.error('Error loading TV show:', error)
      toast.error('Failed to load TV show')
      navigate('/tv-shows')
    } finally {
      setLoading(false)
    }
  }

  const loadEpisodes = async () => {
    if (!id) return

    try {
      const data = await tvShowsAPI.getEpisodes(parseInt(id, 10))
      setEpisodes(data || [])
    } catch (error) {
      console.error('Error loading episodes:', error)
      toast.error('Failed to load episodes')
    }
  }

  const handleArchive = async () => {
    if (!id || !tvShow) return

    try {
      await tvShowsAPI.archive(parseInt(id, 10), !tvShow.is_archived)
      await loadTVShow()
      await loadEpisodes()
      toast.success(`TV show ${tvShow.is_archived ? 'unarchived' : 'archived'} successfully`)
    } catch (error) {
      console.error('Error archiving TV show:', error)
      toast.error('Failed to archive TV show')
    }
  }

  const handleStarted = async () => {
    if (!id || !tvShow) return

    try {
      await tvShowsAPI.setStarted(parseInt(id, 10), !tvShow.is_started)
      await loadTVShow()
      toast.success(`TV show ${!tvShow.is_started ? 'marked as started' : 'marked as not started'}`)
    } catch (error) {
      console.error('Error setting started status:', error)
      toast.error('Failed to update started status')
    }
  }

  const handleRefresh = async () => {
    if (!id) return

    try {
      setIsRefreshing(true)
      const result = await tvShowsAPI.refresh(parseInt(id, 10))
      await loadTVShow()
      await loadEpisodes()
      
      if (result.newEpisodes > 0 || result.updatedEpisodes > 0) {
        toast.success(
          `Refresh complete: ${result.newEpisodes} new episodes, ${result.updatedEpisodes} updated.`
        )
      } else {
        toast.info('No new episodes found')
      }
    } catch (error) {
      console.error('Error refreshing episodes:', error)
      toast.error('Failed to refresh episodes')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMarkAllWatched = () => {
    if (!id || !tvShow) return
    setIsMarkAllDialogOpen(true)
  }

  const handleMarkAllWatchedConfirm = async () => {
    if (!id) return

    try {
      const result = await tvShowsAPI.markAllEpisodesWatched(parseInt(id, 10))
      await loadEpisodes()
      setIsMarkAllDialogOpen(false)
      toast.success(`All episodes marked as watched (${result.updatedCount || 0} episodes updated)`)
    } catch (error) {
      console.error('Error marking all episodes as watched:', error)
      toast.error('Failed to mark all episodes as watched')
    }
  }

  // Calculate statistics
  // Ensure episodes is always an array
  const episodesArray = Array.isArray(episodes) ? episodes : []
  const totalEpisodes = episodesArray.length
  const watchedCount = episodesArray.filter(e => e.is_watched === 1).length
  const unwatchedCount = totalEpisodes - watchedCount
  const progressPercentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0

  // Calculate first episode (earliest air_date)
  const firstEpisode = episodesArray
    .filter(e => e.air_date)
    .sort((a, b) => {
      const dateA = new Date(a.air_date!).getTime()
      const dateB = new Date(b.air_date!).getTime()
      return dateA - dateB
    })[0] || null

  // Calculate latest episode (latest air_date)
  const latestEpisode = episodesArray
    .filter(e => e.air_date)
    .sort((a, b) => {
      const dateA = new Date(a.air_date!).getTime()
      const dateB = new Date(b.air_date!).getTime()
      return dateB - dateA
    })[0] || null

  // Calculate next episode (first unwatched with future air_date)
  const now = new Date()
  const nextEpisode = episodesArray
    .filter(e => e.is_watched === 0 && e.air_date)
    .filter(e => {
      const airDate = new Date(e.air_date!)
      return airDate > now
    })
    .sort((a, b) => {
      const dateA = new Date(a.air_date!).getTime()
      const dateB = new Date(b.air_date!).getTime()
      return dateA - dateB
    })[0] || null

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode(episode)
    setIsModalOpen(true)
  }

  const handleEpisodeUpdate = () => {
    loadEpisodes()
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setSelectedEpisode(null)
    }
  }

  const getImageUrl = (path: string | null, size: string = 'w500') => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/${size}${path}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading TV show...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!tvShow) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">TV show not found</p>
            <button
              onClick={() => navigate('/tv-shows')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Back to TV Shows
            </button>
          </div>
        </main>
      </div>
    )
  }

  const backdropUrl = getImageUrl(tvShow.backdrop_path, 'w1280')
  const posterUrl = getImageUrl(tvShow.poster_path, 'w500')

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header Section with Backdrop */}
        <div className="relative rounded-lg overflow-hidden mb-6 shadow-lg">
          {backdropUrl && (
            <div className="absolute inset-0">
              <img
                src={backdropUrl}
                alt={tvShow.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          )}
          <div className={`relative p-6 ${backdropUrl ? 'text-white' : 'bg-card'}`}>
            <div className="flex items-start gap-6">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt={tvShow.title}
                  className="w-32 h-48 object-cover rounded flex-shrink-0 shadow-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold mb-3">{tvShow.title}</h1>
                
                <div className="flex flex-wrap gap-3 items-center mb-4">
                  {tvShow.status && (
                    <span className="px-3 py-1 bg-blue-500/80 text-white rounded text-sm font-medium">
                      {tvShow.status}
                    </span>
                  )}
                  {tvShow.first_air_date && (
                    <span className="text-sm opacity-90">
                      First aired: {format(new Date(tvShow.first_air_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {tvShow.last_air_date && (
                    <span className="text-sm opacity-90">
                      Last aired: {format(new Date(tvShow.last_air_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/tv-shows')}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm"
                  >
                    Back to TV Shows
                  </button>
                  <button
                    onClick={handleArchive}
                    className={`px-4 py-2 rounded transition-colors backdrop-blur-sm ${
                      tvShow.is_archived
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {tvShow.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={handleStarted}
                    className={`px-4 py-2 rounded transition-colors backdrop-blur-sm flex items-center gap-2 ${
                      tvShow.is_started
                        ? 'bg-green-500/80 hover:bg-green-500/90 text-white'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {tvShow.is_started ? (
                      <>
                        <PlayCircle className="h-4 w-4" />
                        Mark as New
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Mark as Started
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh Episodes'}
                  </button>
                  <button
                    onClick={handleMarkAllWatched}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark All Episodes Watched
                  </button>
                  <a
                    href={`https://www.themoviedb.org/tv/${tvShow.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-colors backdrop-blur-sm inline-block"
                  >
                    View on TMDB →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        {tvShow.overview && (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">{tvShow.overview}</p>
          </div>
        )}

        {/* Episode Statistics Section */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Episode Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xl md:text-2xl font-bold">{totalEpisodes}</div>
              <div className="text-sm text-muted-foreground">Total Episodes</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-green-600">{watchedCount}</div>
              <div className="text-sm text-muted-foreground">Watched</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-blue-600">{unwatchedCount}</div>
              <div className="text-sm text-muted-foreground">Unwatched</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold">{progressPercentage}%</div>
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Episodes Section */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Key Episodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {firstEpisode && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">First Episode</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  S{firstEpisode.season_number.toString().padStart(2, '0')}E{firstEpisode.episode_number.toString().padStart(2, '0')}
                  {firstEpisode.name && ` - ${firstEpisode.name}`}
                </p>
                {firstEpisode.air_date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(firstEpisode.air_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
            {latestEpisode && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Latest Episode</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  S{latestEpisode.season_number.toString().padStart(2, '0')}E{latestEpisode.episode_number.toString().padStart(2, '0')}
                  {latestEpisode.name && ` - ${latestEpisode.name}`}
                </p>
                {latestEpisode.air_date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(latestEpisode.air_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
            {nextEpisode ? (
              <div className="border border-border rounded-lg p-4 border-primary">
                <h3 className="font-semibold mb-2 text-primary">Next Episode</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  S{nextEpisode.season_number.toString().padStart(2, '0')}E{nextEpisode.episode_number.toString().padStart(2, '0')}
                  {nextEpisode.name && ` - ${nextEpisode.name}`}
                </p>
                {nextEpisode.air_date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(nextEpisode.air_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Next Episode</h3>
                <p className="text-sm text-muted-foreground">No upcoming episodes</p>
              </div>
            )}
          </div>
        </div>

        {/* Episodes Section */}
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Episodes</h2>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          {episodesArray.length === 0 ? (
            <p className="text-muted-foreground">No episodes available</p>
          ) : (
            <>
              {viewMode === 'table' ? (
                <EpisodeTable
                  episodes={episodesArray}
                  tvShowId={tvShow.id}
                  onUpdate={handleEpisodeUpdate}
                  onEpisodeClick={handleEpisodeClick}
                />
              ) : (
                <EpisodeCardGrid
                  episodes={episodesArray}
                  tvShowId={tvShow.id}
                  tvShowPoster={tvShow.poster_path}
                  onUpdate={handleEpisodeUpdate}
                  onEpisodeClick={handleEpisodeClick}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Episode Detail Modal */}
      <EpisodeDetailModal
        episode={selectedEpisode}
        tvShow={tvShow}
        open={isModalOpen}
        onOpenChange={handleModalClose}
        onUpdate={handleEpisodeUpdate}
      />

      {/* Mark All Episodes Watched Dialog */}
      <Dialog open={isMarkAllDialogOpen} onOpenChange={setIsMarkAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark All Episodes as Watched</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark all episodes of "{tvShow?.title}" as watched? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMarkAllDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAllWatchedConfirm}
            >
              Mark All Watched
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TVShowDetail

