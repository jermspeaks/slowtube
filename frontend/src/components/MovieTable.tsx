import { Movie } from '../types/movie'
import { format } from 'date-fns'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface MovieTableProps {
  movies: Movie[]
  onDelete: (movie: Movie) => void
}

function MovieTable({ movies, onDelete }: MovieTableProps) {
  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w185${path}`
  }

  const handleDelete = (movie: Movie) => {
    if (window.confirm(`Are you sure you want to delete "${movie.title}"?`)) {
      onDelete(movie)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted">
            <th className="p-3 text-left border-b-2 border-border">Poster</th>
            <th className="p-3 text-left border-b-2 border-border">Title</th>
            <th className="p-3 text-left border-b-2 border-border">Overview</th>
            <th className="p-3 text-left border-b-2 border-border">Release Date</th>
            <th className="p-3 text-left border-b-2 border-border">Created At</th>
            <th className="p-3 text-left border-b-2 border-border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {movies.map(movie => {
            const posterUrl = getImageUrl(movie.poster_path)
            return (
              <tr
                key={movie.id}
                className="border-b border-border hover:bg-accent transition-colors"
              >
                <td className="p-2">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie.title}
                      className="w-20 h-30 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-30 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      No poster
                    </div>
                  )}
                </td>
                <td className="p-3 max-w-[300px]">
                  <div className="font-bold mb-1">{movie.title}</div>
                  {movie.tmdb_id && (
                    <div className="text-xs text-muted-foreground">TMDB: {movie.tmdb_id}</div>
                  )}
                </td>
                <td className="p-3 max-w-[400px]">
                  {movie.overview ? (
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {movie.overview}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-sm">
                  {movie.release_date ? (
                    format(new Date(movie.release_date), 'MMM d, yyyy')
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-sm">
                  {movie.created_at ? (
                    format(new Date(movie.created_at), 'MMM d, yyyy')
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(movie)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default MovieTable

