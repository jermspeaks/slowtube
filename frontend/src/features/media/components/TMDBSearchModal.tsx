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
  const [mode, setMode] = useState<'search' | 'id'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [tmdbIdInput, setTmdbIdInput] = useState('')
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
      setTmdbIdInput('')
      setResults([])
      setError(null)
      setMode('search')
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
        const details = err.response?.data?.details
        if (type === 'tv' && details?.tvShow?.title) {
          setError(`${details.tvShow.title} is already in your collection.`)
        } else if (type === 'movie' && details?.movie?.title) {
          setError(`${details.movie.title} is already in your collection.`)
        } else if (type === 'tv') {
          setError('This TV show is already in your collection (same TMDB ID).')
        } else {
          setError('This movie is already in your collection (same TMDB ID).')
        }
      } else {
        setError(err.response?.data?.error || 'Failed to add item')
      }
    } finally {
      setAddingId(null)
    }
  }

  const handleAddById = async () => {
    const id = parseInt(tmdbIdInput.trim(), 10)
    if (isNaN(id) || id <= 0) {
      setError('Please enter a valid TMDB ID (positive number)')
      return
    }

    await handleAdd(id)
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
        className="bg-card rounded-lg max-w-[800px] w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <h2 className="m-0 text-2xl font-bold">
              Add {type === 'movie' ? 'Movie' : 'TV Show'}
            </h2>
            <button
              onClick={onClose}
              className="border-none bg-transparent text-2xl cursor-pointer p-0 ml-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              ×
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="mb-5 flex gap-2 border-b border-border">
            <button
              onClick={() => {
                setMode('search')
                setError(null)
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                mode === 'search'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Search by Title
            </button>
            <button
              onClick={() => {
                setMode('id')
                setError(null)
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                mode === 'id'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Add by TMDB ID
            </button>
          </div>

          {/* Search Mode */}
          {mode === 'search' && (
            <div className="mb-5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for a ${type === 'movie' ? 'movie' : 'TV show'}...`}
                className="w-full px-4 py-2 border border-border rounded text-base bg-background"
                autoFocus
              />
            </div>
          )}

          {/* ID Mode */}
          {mode === 'id' && (
            <div className="mb-5">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={tmdbIdInput}
                  onChange={(e) => setTmdbIdInput(e.target.value)}
                  placeholder="Enter TMDB ID (e.g., 550)"
                  className="flex-1 px-4 py-2 border border-border rounded text-base bg-background"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddById()
                    }
                  }}
                />
                <button
                  onClick={handleAddById}
                  disabled={!tmdbIdInput.trim() || addingId !== null}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingId ? 'Adding...' : 'Add'}
                </button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                You can find the TMDB ID in the URL of a movie or TV show page on themoviedb.org
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/20 border border-destructive/50 text-destructive rounded">
              {error}
            </div>
          )}

          {mode === 'search' && loading && (
            <div className="text-center py-8 text-muted-foreground">
              Searching...
            </div>
          )}

          {mode === 'search' && !loading && debouncedQuery && results.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              No results found
            </div>
          )}

          {mode === 'search' && !loading && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, index) => {
                const imageUrl = getImageUrl(result.poster_path)
                const date = getDate(result)
                const isAdding = addingId === result.tmdb_id

                return (
                  <div
                    key={`${result.tmdb_id}-${index}`}
                    className="flex gap-4 p-4 border border-border rounded hover:bg-accent transition-colors"
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
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(date).getFullYear()}
                        </p>
                      )}
                      {result.overview && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
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

