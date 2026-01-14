import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Movie } from '../types/movie'
import { TVShow } from '../types/tv-show'
import { moviesAPI, tvShowsAPI } from '../services/api'
import MovieCard from '../components/MovieCard'
import TVShowCard from '../components/TVShowCard'
import { toast } from 'sonner'

function Dashboard() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<Movie[]>([])
  const [tvShows, setTvShows] = useState<TVShow[]>([])
  const [moviesLoading, setMoviesLoading] = useState(true)
  const [tvShowsLoading, setTvShowsLoading] = useState(true)

  useEffect(() => {
    loadMovies()
    loadTVShows()
  }, [])

  const loadMovies = async () => {
    try {
      setMoviesLoading(true)
      // Fetch movies and sort by saved_at on frontend
      const response = await moviesAPI.getAll(
        undefined,
        'created_at',
        'desc',
        1,
        100 // Fetch more to ensure we have enough to sort by saved_at
      )
      const allMovies = response.movies || []
      // Sort by saved_at descending, then filter out nulls and take first 12
      const sortedMovies = allMovies
        .filter(movie => movie.saved_at !== null)
        .sort((a, b) => {
          if (!a.saved_at || !b.saved_at) return 0
          return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
        })
        .slice(0, 12)
      setMovies(sortedMovies)
    } catch (error) {
      console.error('Error loading movies:', error)
      toast.error('Failed to load movies')
    } finally {
      setMoviesLoading(false)
    }
  }

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

  const handleMovieClick = () => {
    // Could navigate to movie detail if needed
  }

  const handleTVShowClick = (tvShow: TVShow) => {
    navigate(`/media/tv-shows/${tvShow.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Movies Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Latest Movies</h2>
              <Link
                to="/media/movies"
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {moviesLoading ? (
              <div className="flex justify-center items-center py-8 bg-card rounded-lg">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : movies.length === 0 ? (
              <div className="text-center py-8 px-4 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No movies saved
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {movies.map(movie => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={handleMovieClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Latest TV Shows Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Latest TV Shows</h2>
              <Link
                to="/media/tv-shows/list"
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {tvShowsLoading ? (
              <div className="flex justify-center items-center py-8 bg-card rounded-lg">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : tvShows.length === 0 ? (
              <div className="text-center py-8 px-4 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No TV shows saved
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
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
      </main>
    </div>
  )
}

export default Dashboard
