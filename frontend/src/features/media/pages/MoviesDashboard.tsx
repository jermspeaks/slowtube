import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Movie } from '../types/movie'
import { moviesAPI } from '../services/api'
import MovieCard from '../components/MovieCard'
import { toast } from 'sonner'

function MoviesDashboard() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [moviesLoading, setMoviesLoading] = useState(true)

  useEffect(() => {
    loadMovies()
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

  const handleMovieClick = () => {
    // Could navigate to movie detail if needed
  }

  return (
    <div>
      {/* Latest Movies Section */}
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-2">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Latest Movies</h2>
          <Link
            to="/media/movies/all"
            className="text-sm md:text-base text-primary hover:underline"
          >
            View All
          </Link>
        </div>
        {moviesLoading ? (
          <div className="flex justify-center items-center py-8 md:py-12 bg-card rounded-lg">
            <div className="text-sm md:text-base text-muted-foreground">Loading...</div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-8 md:py-12 px-4 bg-card rounded-lg">
            <p className="text-sm md:text-base text-muted-foreground">
              No movies saved
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4 md:gap-6">
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
    </div>
  )
}

export default MoviesDashboard
