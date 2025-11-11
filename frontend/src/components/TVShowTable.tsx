import { TVShow } from '../types/tv-show'
import { format } from 'date-fns'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface TVShowTableProps {
  tvShows: TVShow[]
  onDelete: (tvShow: TVShow) => void
}

function TVShowTable({ tvShows, onDelete }: TVShowTableProps) {
  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w185${path}`
  }

  const handleDelete = (tvShow: TVShow) => {
    if (window.confirm(`Are you sure you want to delete "${tvShow.title}"? This will also delete all episodes.`)) {
      onDelete(tvShow)
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
            <th className="p-3 text-left border-b-2 border-gray-300">First Air Date</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Status</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Archived</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Created At</th>
            <th className="p-3 text-left border-b-2 border-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tvShows.map(tvShow => {
            const posterUrl = getImageUrl(tvShow.poster_path)
            return (
              <tr
                key={tvShow.id}
                className="border-b border-gray-300 hover:bg-gray-100"
              >
                <td className="p-2">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={tvShow.title}
                      className="w-20 h-30 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-30 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                      No poster
                    </div>
                  )}
                </td>
                <td className="p-3 max-w-[300px]">
                  <div className="font-bold mb-1">{tvShow.title}</div>
                  {tvShow.tmdb_id && (
                    <div className="text-xs text-gray-500">TMDB: {tvShow.tmdb_id}</div>
                  )}
                </td>
                <td className="p-3 max-w-[400px]">
                  {tvShow.overview ? (
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {tvShow.overview}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="p-3 text-gray-500 text-sm">
                  {tvShow.first_air_date ? (
                    format(new Date(tvShow.first_air_date), 'MMM d, yyyy')
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-3">
                  {tvShow.status ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {tvShow.status}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="p-3">
                  {tvShow.is_archived ? (
                    <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">
                      Archived
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="p-3 text-gray-500 text-sm">
                  {tvShow.created_at ? (
                    format(new Date(tvShow.created_at), 'MMM d, yyyy')
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(tvShow)}
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

export default TVShowTable

