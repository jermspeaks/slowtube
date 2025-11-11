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
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left border-b-2 border-gray-300">Poster</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Title</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Overview</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Release Date</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Created At</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {movies.map(movie => {
            const posterUrl = getImageUrl(movie.poster_path)
            return (
              <tr
                key={movie.id}
                className="border-b border-gray-300 hover:bg-gray-100"
              >
                <td className="p-2">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie.title}
                      className="w-20 h-30 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-30 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                      No poster
                    </div>
                  )}
                </td>
                <td className="p-3 max-w-[300px]">
                  <div className="font-bold mb-1">{movie.title}</div>
                  {movie.tmdb_id && (
                    <div className="text-xs text-gray-500">TMDB: {movie.tmdb_id}</div>
                  )}
                </td>
                <td className="p-3 max-w-[400px]">
                  {movie.overview ? (
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {movie.overview}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="p-3 text-gray-500 text-sm">
                  {movie.release_date ? (
                    format(new Date(movie.release_date), 'MMM d, yyyy')
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-3 text-gray-500 text-sm">
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

