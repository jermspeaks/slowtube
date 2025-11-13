import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Movie } from '../types/movie'
import { moviesAPI } from '../services/api'
import MovieTable from '../components/MovieTable'
import TMDBSearchModal from '../components/TMDBSearchModal'
import { toast } from 'sonner'

function MoviesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(searchParams.get('search') || '')
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'archived' | 'unarchived'>(
    (searchParams.get('archive') as 'all' | 'archived' | 'unarchived') || 'unarchived'
  )
  const [starredFilter, setStarredFilter] = useState<'all' | 'starred' | 'unstarred'>(
    (searchParams.get('starred') as 'all' | 'starred' | 'unstarred') || 'all'
  )
  const [sortBy, setSortBy] = useState<'title' | 'release_date' | 'created_at' | null>(
    (searchParams.get('sortBy') as 'title' | 'release_date' | 'created_at') || 'title'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
  )
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSyncingFromUrlRef = useRef(false)

  // Sync state from URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    const urlArchive = (searchParams.get('archive') as 'all' | 'archived' | 'unarchived') || 'unarchived'
    const urlStarred = (searchParams.get('starred') as 'all' | 'starred' | 'unstarred') || 'all'
    const urlSortBy = (searchParams.get('sortBy') as 'title' | 'release_date' | 'created_at') || 'title'
    const urlSortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
    const urlPage = parseInt(searchParams.get('page') || '1', 10)

    const needsUpdate = urlSearch !== debouncedSearchQuery ||
      urlArchive !== archiveFilter ||
      urlStarred !== starredFilter ||
      urlSortBy !== sortBy ||
      urlSortOrder !== sortOrder ||
      urlPage !== currentPage

    if (needsUpdate) {
      isSyncingFromUrlRef.current = true
    }

    if (urlSearch !== debouncedSearchQuery) {
      setSearchQuery(urlSearch)
      setDebouncedSearchQuery(urlSearch)
    }
    if (urlArchive !== archiveFilter) {
      setArchiveFilter(urlArchive)
    }
    if (urlStarred !== starredFilter) {
      setStarredFilter(urlStarred)
    }
    if (urlSortBy !== sortBy) {
      setSortBy(urlSortBy)
    }
    if (urlSortOrder !== sortOrder) {
      setSortOrder(urlSortOrder)
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage)
    }
    
    if (needsUpdate) {
      setTimeout(() => {
        isSyncingFromUrlRef.current = false
      }, 100)
    }
  }, [searchParams])

  useEffect(() => {
    loadMovies()
  }, [])

  const loadMovies = async () => {
    try {
      setLoading(true)
      const response = await moviesAPI.getAll(
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        currentPage,
        50,
        archiveFilter !== 'all' ? archiveFilter : undefined,
        starredFilter !== 'all' ? starredFilter : undefined
      )
      setMovies(response.movies || [])
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1)
        setTotal(response.pagination.total || 0)
      }
    } catch (error) {
      console.error('Error loading movies:', error)
      toast.error('Failed to load movies')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (movie: Movie) => {
    try {
      await moviesAPI.delete(movie.id)
      toast.success('Movie deleted successfully')
      loadMovies()
    } catch (error) {
      console.error('Error deleting movie:', error)
      toast.error('Failed to delete movie')
    }
  }

  const handleArchive = async (movie: Movie, isArchived: boolean) => {
    try {
      await moviesAPI.archive(movie.id, isArchived)
      loadMovies()
      toast.success(`Movie ${isArchived ? 'archived' : 'unarchived'} successfully`)
    } catch (error) {
      console.error('Error archiving movie:', error)
      toast.error('Failed to archive movie')
    }
  }

  const handleStar = async (movie: Movie, isStarred: boolean) => {
    try {
      await moviesAPI.star(movie.id, isStarred)
      loadMovies()
      toast.success(`Movie ${isStarred ? 'starred' : 'unstarred'} successfully`)
    } catch (error) {
      console.error('Error starring movie:', error)
      toast.error('Failed to star movie')
    }
  }

  const handleWatched = async (movie: Movie, isWatched: boolean) => {
    try {
      await moviesAPI.watched(movie.id, isWatched)
      loadMovies()
      toast.success(`Movie marked as ${isWatched ? 'watched' : 'unwatched'} successfully`)
    } catch (error) {
      console.error('Error marking movie as watched:', error)
      toast.error('Failed to mark movie as watched')
    }
  }

  const handleAdd = () => {
    // Reload movies after adding
    loadMovies()
  }

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Update URL params when state changes
  useEffect(() => {
    if (isSyncingFromUrlRef.current) {
      return
    }
    
    const params = new URLSearchParams()
    
    if (debouncedSearchQuery) {
      params.set('search', debouncedSearchQuery)
    }
    
    if (archiveFilter !== 'unarchived') {
      params.set('archive', archiveFilter)
    }
    
    if (starredFilter !== 'all') {
      params.set('starred', starredFilter)
    }
    
    if (sortBy && sortBy !== 'title') {
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
    } else if (sortBy === 'title' && sortOrder !== 'asc') {
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
    }
    
    if (currentPage > 1) {
      params.set('page', currentPage.toString())
    }
    
    const currentParams = searchParams.toString()
    const newParams = params.toString()
    
    if (currentParams !== newParams) {
      setSearchParams(params, { replace: true })
    }
  }, [debouncedSearchQuery, archiveFilter, starredFilter, sortBy, sortOrder, currentPage, searchParams, setSearchParams])

  useEffect(() => {
    if (!isSyncingFromUrlRef.current) {
      setCurrentPage(1)
    }
  }, [debouncedSearchQuery, sortBy, sortOrder, archiveFilter, starredFilter])

  useEffect(() => {
    loadMovies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy, sortOrder, currentPage, archiveFilter, starredFilter])

  const handleSortChange = (value: string) => {
    if (value === 'none') {
      setSortBy(null)
      setSortOrder('asc')
    } else {
      const lastUnderscoreIndex = value.lastIndexOf('_')
      if (lastUnderscoreIndex !== -1) {
        const by = value.substring(0, lastUnderscoreIndex) as 'title' | 'release_date' | 'created_at'
        const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
        if ((by === 'title' || by === 'release_date' || by === 'created_at') && (order === 'asc' || order === 'desc')) {
          setSortBy(by)
          setSortOrder(order)
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Movies</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Add Movie
          </button>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-6">
          {/* Always visible section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2 items-center w-full sm:w-auto sm:flex-1 sm:max-w-md">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or overview..."
                className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
              <select
                value={sortBy ? `${sortBy}_${sortOrder}` : 'none'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="none">None</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
                <option value="release_date_desc">Release Date (Newest)</option>
                <option value="release_date_asc">Release Date (Oldest)</option>
                <option value="created_at_desc">Created At (Newest)</option>
                <option value="created_at_asc">Created At (Oldest)</option>
              </select>
            </div>
          </div>

          {/* Collapsible "Show more" section */}
          <div className="mt-4">
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              aria-expanded={showMoreFilters}
              aria-label={showMoreFilters ? 'Show less filters' : 'Show more filters'}
            >
              <span>{showMoreFilters ? 'Show less' : 'Show more'}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMoreFilters && (
              <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Archive:</label>
                    <select
                      value={archiveFilter}
                      onChange={(e) => setArchiveFilter(e.target.value as 'all' | 'archived' | 'unarchived')}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="archived">Archived</option>
                      <option value="unarchived">Unarchived</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Starred:</label>
                    <select
                      value={starredFilter}
                      onChange={(e) => setStarredFilter(e.target.value as 'all' | 'starred' | 'unstarred')}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="starred">Starred</option>
                      <option value="unstarred">Unstarred</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading movies...</div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No movies found
            </p>
            <p className="text-sm text-muted-foreground">
              Click "Add Movie" to search and add movies from TMDB.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {movies.length} of {total} movies
            </div>
            <MovieTable 
              movies={movies} 
              onDelete={handleDelete}
              onArchive={handleArchive}
              onStar={handleStar}
              onWatched={handleWatched}
            />
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-4 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-border rounded text-sm bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Page</span>
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                    className="px-3 py-2 border border-border rounded text-sm bg-background"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-foreground">of {totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-border rounded text-sm bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <TMDBSearchModal
        type="movie"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  )
}

export default MoviesList

