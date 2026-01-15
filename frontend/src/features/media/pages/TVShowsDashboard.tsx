import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TVShow } from '../types/tv-show'
import { tvShowsAPI } from '../services/api'
import TVShowCard from '../components/TVShowCard'
import { toast } from 'sonner'

function TVShowsDashboard() {
  const navigate = useNavigate()
  const [tvShows, setTvShows] = useState<TVShow[]>([])
  const [tvShowsLoading, setTvShowsLoading] = useState(true)

  useEffect(() => {
    loadTVShows()
  }, [])

  const loadTVShows = async () => {
    try {
      setTvShowsLoading(true)
      const response = await tvShowsAPI.getAll(
        undefined,
        undefined,
        'last_episode_date',
        'desc',
        1,
        12
      )
      setTvShows(response.tvShows || [])
    } catch (error) {
      console.error('Error loading TV shows:', error)
      toast.error('Failed to load TV shows')
    } finally {
      setTvShowsLoading(false)
    }
  }

  const handleTVShowClick = (tvShow: TVShow) => {
    navigate(`/media/tv-shows/${tvShow.id}`)
  }

  return (
    <div>
      {/* Latest TV Shows Section */}
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-2">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Latest TV Shows</h2>
          <Link
            to="/media/tv-shows/list"
            className="text-sm md:text-base text-primary hover:underline"
          >
            View All
          </Link>
        </div>
        {tvShowsLoading ? (
          <div className="flex justify-center items-center py-8 md:py-12 bg-card rounded-lg">
            <div className="text-sm md:text-base text-muted-foreground">Loading...</div>
          </div>
        ) : tvShows.length === 0 ? (
          <div className="text-center py-8 md:py-12 px-4 bg-card rounded-lg">
            <p className="text-sm md:text-base text-muted-foreground">
              No TV shows saved
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4 md:gap-6">
            {tvShows.map(tvShow => (
              <TVShowCard
                key={tvShow.id}
                tvShow={tvShow}
                onClick={() => handleTVShowClick(tvShow)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TVShowsDashboard
