import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Movie } from '../types/movie'
import { TVShow } from '../types/tv-show'
import { moviesAPI, tvShowsAPI } from '../services/api'
import MovieCard from '../components/MovieCard'
import TVShowCard from '../components/TVShowCard'
import { toast } from 'sonner'

function WatchNext() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState<Movie[]>([])
  const [tvShows, setTvShows] = useState<TVShow[]>([])
  const [moviesLoading, setMoviesLoading] = useState(true)
  const [tvShowsLoading, setTvShowsLoading] = useState(true)

  useEffect(() => {
    loadStarredMovies()
    loadStarredTVShows()
  }, [])

  const loadStarredMovies = async () => {
    try {
      setMoviesLoading(true)
      const response = await moviesAPI.getAll(
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        100,
        'unarchived',
        'starred',
        'unwatched'
      )
      const starredMovies = (response.movies || []).slice(0, 12)
      setMovies(starredMovies)
    } catch (error) {
      console.error('Error loading starred movies:', error)
      toast.error('Failed to load starred movies')
    } finally {
      setMoviesLoading(false)
    }
  }

  const loadStarredTVShows = async () => {
    try {
      setTvShowsLoading(true)
      // For now, just show recently updated TV shows
      // TODO: Add starring feature for TV shows
      const response = await tvShowsAPI.getAll(
        false,
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

  const handleMovieClick = (movie: Movie) => {
    navigate(`/media/movies/${movie.id}`)
  }

  const handleTVShowClick = (tvShow: TVShow) => {
    navigate(`/media/tv-shows/${tvShow.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-xl md:text-2xl font-bold">Watch Next</h1>
        </div>

        {/* Starred Movies Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Starred Movies</h2>
          {moviesLoading ? (
            <div className="flex justify-center items-center py-8 bg-card rounded-lg">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-8 px-4 bg-card rounded-lg">
              <p className="text-sm text-muted-foreground">
                No starred movies
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {movies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => handleMovieClick(movie)}
                />
              ))}
            </div>
          )}
        </div>

        {/* TV Shows Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">TV Shows</h2>
          {tvShowsLoading ? (
            <div className="flex justify-center items-center py-8 bg-card rounded-lg">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : tvShows.length === 0 ? (
            <div className="text-center py-8 px-4 bg-card rounded-lg">
              <p className="text-sm text-muted-foreground">
                No TV shows
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
      </main>
    </div>
  )
}

export default WatchNext
