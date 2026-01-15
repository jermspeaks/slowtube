import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { Movie } from '../types/movie'
import { moviesAPI } from '../services/api'
import MovieCard from '../components/MovieCard'
import { toast } from 'sonner'

function Starred() {
  const navigate = useNavigate()
  const location = useLocation()
  const [movies, setMovies] = useState<Movie[]>([])
  const [moviesLoading, setMoviesLoading] = useState(true)

  useEffect(() => {
    loadStarredMovies()
  }, [location.pathname])

  const loadStarredMovies = async () => {
    try {
      setMoviesLoading(true)
      const response = await moviesAPI.getAll(
        undefined,        // search
        undefined,        // sortBy
        undefined,        // sortOrder
        1,                // page
        100,              // limit
        undefined,        // archiveFilter
        'starred',        // starredFilter
        undefined,        // watchedFilter
        undefined         // playlistFilter
      )
      setMovies(response.movies || [])
    } catch (error) {
      console.error('Error loading starred movies:', error)
      toast.error('Failed to load starred movies')
    } finally {
      setMoviesLoading(false)
    }
  }

  const handleMovieClick = (movie: Movie) => {
    navigate(`/media/movies/${movie.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-xl md:text-2xl font-bold">Starred</h1>
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
      </main>
    </div>
  )
}

export default Starred
