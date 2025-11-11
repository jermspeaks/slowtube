import { useState, useEffect, useRef } from 'react'
import { moviesAPI, tvShowsAPI } from '../services/api'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

interface TMDBSearchResult {
  tmdb_id: number
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string | null
  first_air_date?: string | null
  popularity: number
}

interface TMDBSearchModalProps {
  type: 'movie' | 'tv'
  isOpen: boolean
  onClose: () => void
  onAdd: () => void
}

function TMDBSearchModal({ type, isOpen, onClose, onAdd }: TMDBSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<TMDBSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setDebouncedQuery('')
      setResults([])
      setError(null)
      return
    }
  }, [isOpen])

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const searchAPI = type === 'movie' ? moviesAPI : tvShowsAPI
        const searchResults = await searchAPI.search(debouncedQuery)
        setResults(searchResults)
      } catch (err: any) {
        console.error('Error searching TMDB:', err)
        setError(err.response?.data?.error || 'Failed to search TMDB')
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && debouncedQuery.trim()) {
      performSearch()
    }
  }, [debouncedQuery, type, isOpen])

  const handleAdd = async (tmdbId: number) => {
    setAddingId(tmdbId)
    setError(null)

    try {
      const createAPI = type === 'movie' ? moviesAPI : tvShowsAPI
      await createAPI.create(tmdbId)
      onAdd()
      onClose()
    } catch (err: any) {
      console.error('Error adding item:', err)
      if (err.response?.status === 409) {
        setError('This item already exists in your collection')
      } else {
        setError(err.response?.data?.error || 'Failed to add item')
      }
    } finally {
      setAddingId(null)
    }
  }

  const getImageUrl = (path: string | null) => {
    if (!path) return null
    return `${TMDB_IMAGE_BASE}/w185${path}`
  }

  const getDate = (result: TMDBSearchResult) => {
    return result.release_date || result.first_air_date || null
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-[800px] w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <h2 className="m-0 text-2xl font-bold">
              Add {type === 'movie' ? 'Movie' : 'TV Show'}
            </h2>
            <button
              onClick={onClose}
              className="border-none bg-transparent text-2xl cursor-pointer p-0 ml-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          <div className="mb-5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search for a ${type === 'movie' ? 'movie' : 'TV show'}...`}
              className="w-full px-4 py-2 border border-gray-300 rounded text-base"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              Searching...
            </div>
          )}

          {!loading && debouncedQuery && results.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">
              No results found
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => {
                const imageUrl = getImageUrl(result.poster_path)
                const date = getDate(result)
                const isAdding = addingId === result.tmdb_id

                return (
                  <div
                    key={result.tmdb_id}
                    className="flex gap-4 p-4 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={result.title}
                        className="w-20 h-30 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1">{result.title}</h3>
                      {date && (
                        <p className="text-sm text-gray-500 mb-2">
                          {new Date(date).getFullYear()}
                        </p>
                      )}
                      {result.overview && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {result.overview}
                        </p>
                      )}
                      <button
                        onClick={() => handleAdd(result.tmdb_id)}
                        disabled={isAdding}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isAdding ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TMDBSearchModal

