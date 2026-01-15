import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { calendarAPI, tvShowsAPI } from '../services/api'
import { Episode } from '../types/episode'
import { startOfDay, endOfDay, format, startOfToday, subDays } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Check, X, Table2, Grid3x3 } from 'lucide-react'
import EpisodeCard from '../components/EpisodeCard'

type ViewMode = 'table' | 'cards'

function RecentlyAired() {
  const navigate = useNavigate()
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [hideArchived, setHideArchived] = useState(false)
  const [hideWatched, setHideWatched] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  useEffect(() => {
    loadEpisodes()
  }, [hideArchived])

  const loadEpisodes = async () => {
    try {
      setLoading(true)
      
      // Get episodes from the past week
      const today = startOfToday()
      const weekAgo = startOfDay(subDays(today, 7))
      const endDate = endOfDay(today)

      const response = await calendarAPI.getEpisodes(
        format(weekAgo, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        hideArchived
      )

      // Backend now returns flat array of episodes
      // Filter to only past episodes using timezone-aware comparison
      const allEpisodes: Episode[] = (response.episodes || []).filter(ep => {
        if (!ep.air_date) return false
        // Parse as UTC midnight and compare with today
        const dateStr = ep.air_date.includes('T') ? ep.air_date : `${ep.air_date}T00:00:00Z`
        const airDate = new Date(dateStr)
        return airDate <= today
      })

      // Sort by air date (most recent first)
      allEpisodes.sort((a, b) => {
        if (!a.air_date || !b.air_date) return 0
        const dateStrA = a.air_date.includes('T') ? a.air_date : `${a.air_date}T00:00:00Z`
        const dateStrB = b.air_date.includes('T') ? b.air_date : `${b.air_date}T00:00:00Z`
        return new Date(dateStrB).getTime() - new Date(dateStrA).getTime()
      })

      setEpisodes(allEpisodes)
    } catch (error) {
      console.error('Error loading recently aired episodes:', error)
      toast.error('Failed to load recently aired episodes')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => {
    loadEpisodes()
  }

  const handleMarkWatched = async (episode: Episode) => {
    try {
      await tvShowsAPI.markEpisodeWatched(episode.tv_show_id, episode.id)
      toast.success('Episode marked as watched')
      handleUpdate()
    } catch (error) {
      console.error('Error marking episode as watched:', error)
      toast.error('Failed to mark episode as watched')
    }
  }

  const handleMarkUnwatched = async (episode: Episode) => {
    try {
      await tvShowsAPI.markEpisodeUnwatched(episode.tv_show_id, episode.id)
      toast.success('Episode marked as unwatched')
      handleUpdate()
    } catch (error) {
      console.error('Error marking episode as unwatched:', error)
      toast.error('Failed to mark episode as unwatched')
    }
  }

  const handleTVShowClick = (tvShowId: number) => {
    navigate(`/tv-shows/${tvShowId}`)
  }

  // Filter episodes based on hideWatched
  const filteredEpisodes = hideWatched
    ? episodes.filter(ep => ep.is_watched !== 1)
    : episodes

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Recently Aired</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Episodes from the past week
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View mode toggle */}
            <div className="flex border border-border rounded overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-accent'
                }`}
              >
                <Table2 className="h-4 w-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 text-sm font-medium border-l border-border transition-colors flex items-center gap-2 ${
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-accent'
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
                Cards
              </button>
            </div>

            {/* Hide archived toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideArchived}
                onChange={(e) => setHideArchived(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Hide archived</span>
            </label>

            {/* Hide watched toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideWatched}
                onChange={(e) => setHideWatched(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Hide watched</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading recently aired episodes...</div>
          </div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">
              {episodes.length === 0 
                ? 'No episodes aired in the past week'
                : 'No episodes match the current filters'}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">TV Show</th>
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">Episode</th>
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">Name</th>
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">Air Date</th>
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">Runtime</th>
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">Status</th>
                    <th className="p-3 text-left border-b border-border text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEpisodes.map(episode => {
                    const isWatched = episode.is_watched === 1
                    return (
                      <tr
                        key={episode.id}
                        className={`border-b border-border hover:bg-accent transition-colors ${
                          isWatched ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="p-3 text-sm">
                          <button
                            onClick={() => handleTVShowClick(episode.tv_show_id)}
                            className="font-medium text-primary hover:underline"
                          >
                            {episode.tv_show_title || 'Unknown Show'}
                          </button>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          S{episode.season_number.toString().padStart(2, '0')}E{episode.episode_number.toString().padStart(2, '0')}
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
                        <td className="p-3">
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
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEpisodes.map(episode => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default RecentlyAired

