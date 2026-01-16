import { useState, useEffect, useRef } from 'react'
import { Movie } from '../types/movie'
import { moviesAPI } from '../services/api'
import MovieTable from '../components/MovieTable'
import TMDBSearchModal from '../components/TMDBSearchModal'
import AddToPlaylistModal from '../components/AddToPlaylistModal'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import { ListPlus, X, Check } from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import { useURLParams } from '@/shared/hooks/useURLParams'
import {
  isArchiveFilter,
  isStarredFilter,
  isWatchedFilter,
  isPlaylistFilter,
  isSortOrder,
  isMovieSortBy,
  isValidPage,
} from '@/shared/utils/typeGuards'

type MoviesListFilters = {
  search: string
  archiveFilter: 'all' | 'archived' | 'unarchived'
  starredFilter: 'all' | 'starred' | 'unstarred'
  watchedFilter: 'all' | 'watched' | 'unwatched'
  playlistFilter: 'all' | 'in_playlist' | 'not_in_playlist'
  sortBy: 'title' | 'release_date' | null
  sortOrder: 'asc' | 'desc'
  currentPage: number
}

function MoviesList() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<number>>(new Set())
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaults: MoviesListFilters = {
    search: '',
    archiveFilter: 'unarchived',
    starredFilter: 'all',
    watchedFilter: 'unwatched',
    playlistFilter: 'all',
    sortBy: 'title',
    sortOrder: 'asc',
    currentPage: 1,
  }

  const [filters, updateFilters] = useURLParams<MoviesListFilters>({
    defaults,
    serialize: (state) => {
      const params = new URLSearchParams()
      if (state.search) {
        params.set('search', state.search)
      }
      if (state.archiveFilter !== 'unarchived') {
        params.set('archive', state.archiveFilter)
      }
      if (state.starredFilter !== 'all') {
        params.set('starred', state.starredFilter)
      }
      if (state.watchedFilter !== 'unwatched') {
        params.set('watched', state.watchedFilter)
      }
      if (state.playlistFilter !== 'all') {
        params.set('playlist', state.playlistFilter)
      }
      if (state.sortBy && state.sortBy !== 'title') {
        params.set('sortBy', state.sortBy)
        params.set('sortOrder', state.sortOrder)
      } else if (state.sortBy === 'title' && state.sortOrder !== 'asc') {
        params.set('sortBy', state.sortBy)
        params.set('sortOrder', state.sortOrder)
      }
      if (state.currentPage > 1) {
        params.set('page', state.currentPage.toString())
      }
      return params
    },
    deserialize: (params) => {
      const result: Partial<MoviesListFilters> = {}
      const search = params.get('search')
      if (search) result.search = search
      const archive = params.get('archive')
      if (isArchiveFilter(archive)) {
        result.archiveFilter = archive
      }
      const starred = params.get('starred')
      if (isStarredFilter(starred)) {
        result.starredFilter = starred
      }
      const watched = params.get('watched')
      if (isWatchedFilter(watched)) {
        result.watchedFilter = watched
      }
      const playlist = params.get('playlist')
      if (isPlaylistFilter(playlist)) {
        result.playlistFilter = playlist
      }
      const sortBy = params.get('sortBy')
      if (isMovieSortBy(sortBy)) {
        result.sortBy = sortBy
      }
      const sortOrder = params.get('sortOrder')
      if (isSortOrder(sortOrder)) {
        result.sortOrder = sortOrder
      }
      const page = params.get('page')
      if (isValidPage(page)) {
        result.currentPage = parseInt(page, 10)
      }
      return result
    },
  })

  // Sync searchQuery and debouncedSearchQuery with filters.search (when URL changes)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(filters.search)
  
  useEffect(() => {
    // When filters.search changes from URL, update both immediately (no debounce)
    setSearchQuery(filters.search)
    setDebouncedSearchQuery(filters.search)
  }, [filters.search])


  useEffect(() => {
    loadMovies()
  }, [])

  const loadMovies = async () => {
    try {
      setLoading(true)
      const response = await moviesAPI.getAll(
        debouncedSearchQuery || undefined,
        filters.sortBy || undefined,
        filters.sortBy ? filters.sortOrder : undefined,
        filters.currentPage,
        50,
        filters.archiveFilter !== 'all' ? filters.archiveFilter : undefined,
        filters.starredFilter !== 'all' ? filters.starredFilter : undefined,
        filters.watchedFilter !== 'all' ? filters.watchedFilter : undefined,
        filters.playlistFilter !== 'all' ? filters.playlistFilter : undefined
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

  const handleBulkWatched = async (isWatched: boolean) => {
    if (selectedMovieIds.size === 0) return

    try {
      // Filter selected movies to only include those that need state changes
      const moviesToUpdate = movies.filter(movie => {
        if (!selectedMovieIds.has(movie.id)) return false
        // For isWatched: true, only include unwatched movies
        // For isWatched: false, only include watched movies
        return isWatched ? !movie.is_watched : movie.is_watched
      })

      if (moviesToUpdate.length === 0) {
        toast.info(`No movies need to be marked as ${isWatched ? 'watched' : 'unwatched'}`)
        return
      }

      const movieIds = moviesToUpdate.map(m => m.id)
      const response = await moviesAPI.bulkWatched(movieIds, isWatched)
      
      loadMovies()
      setSelectedMovieIds(new Set())
      
      if (response.updatedCount > 0) {
        toast.success(response.message || `${response.updatedCount} movie(s) marked as ${isWatched ? 'watched' : 'unwatched'} successfully`)
      } else {
        toast.info(`No movies needed updating`)
      }
    } catch (error) {
      console.error('Error bulk marking movies as watched:', error)
      toast.error('Failed to bulk mark movies as watched')
    }
  }

  const handleAdd = () => {
    // Reload movies after adding
    loadMovies()
  }

  const handleAddToPlaylistSuccess = () => {
    setSelectedMovieIds(new Set())
    loadMovies()
  }

  // Debounce search query (only when user types, not when syncing from URL)
  useEffect(() => {
    // If searchQuery matches filters.search, we're syncing from URL - don't debounce
    if (searchQuery === filters.search) {
      return
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      updateFilters({ search: searchQuery })
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, filters.search, updateFilters])
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  // Reset page to 1 when filters change (except page itself)
  const prevFiltersRef = useRef({
    search: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    archiveFilter: filters.archiveFilter,
    starredFilter: filters.starredFilter,
    watchedFilter: filters.watchedFilter,
    playlistFilter: filters.playlistFilter,
  })
  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged = 
      prev.search !== filters.search ||
      prev.sortBy !== filters.sortBy ||
      prev.sortOrder !== filters.sortOrder ||
      prev.archiveFilter !== filters.archiveFilter ||
      prev.starredFilter !== filters.starredFilter ||
      prev.watchedFilter !== filters.watchedFilter ||
      prev.playlistFilter !== filters.playlistFilter
    
    if (filtersChanged) {
      updateFilters({ currentPage: 1 })
      prevFiltersRef.current = {
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        archiveFilter: filters.archiveFilter,
        starredFilter: filters.starredFilter,
        watchedFilter: filters.watchedFilter,
        playlistFilter: filters.playlistFilter,
      }
    }
  }, [filters.search, filters.sortBy, filters.sortOrder, filters.archiveFilter, filters.starredFilter, filters.watchedFilter, filters.playlistFilter, updateFilters])

  useEffect(() => {
    loadMovies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, filters.sortBy, filters.sortOrder, filters.currentPage, filters.archiveFilter, filters.starredFilter, filters.watchedFilter, filters.playlistFilter])

  const handleSortChange = (value: string) => {
    if (value === 'none') {
      updateFilters({ sortBy: null, sortOrder: 'asc' })
    } else {
      const lastUnderscoreIndex = value.lastIndexOf('_')
      if (lastUnderscoreIndex !== -1) {
        const by = value.substring(0, lastUnderscoreIndex) as 'title' | 'release_date'
        const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
        if ((by === 'title' || by === 'release_date') && (order === 'asc' || order === 'desc')) {
          updateFilters({ sortBy: by, sortOrder: order })
        }
      }
    }
  }

  return (
    <>
      <div className="flex justify-between items-start mb-4 md:mb-6 flex-wrap gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Movies</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm md:text-base"
          >
            Add Movie
          </button>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-4 md:mb-6">
          {/* Always visible section */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2 items-center w-full sm:w-auto sm:flex-1 sm:max-w-md">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by title or overview..."
                className="px-3 py-2 border border-border rounded text-sm bg-background flex-1"
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-semibold text-sm text-foreground whitespace-nowrap">Sort:</label>
              <select
                value={filters.sortBy ? `${filters.sortBy}_${filters.sortOrder}` : 'none'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-border rounded text-sm bg-background"
              >
                <option value="none">None</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
                <option value="release_date_desc">Release Date (Newest)</option>
                <option value="release_date_asc">Release Date (Oldest)</option>
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
                      value={filters.archiveFilter}
                      onChange={(e) => updateFilters({ archiveFilter: e.target.value as 'all' | 'archived' | 'unarchived' })}
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
                      value={filters.starredFilter}
                      onChange={(e) => updateFilters({ starredFilter: e.target.value as 'all' | 'starred' | 'unstarred' })}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="starred">Starred</option>
                      <option value="unstarred">Unstarred</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Watched:</label>
                    <select
                      value={filters.watchedFilter}
                      onChange={(e) => updateFilters({ watchedFilter: e.target.value as 'all' | 'watched' | 'unwatched' })}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="watched">Watched</option>
                      <option value="unwatched">Unwatched</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Playlist:</label>
                    <select
                      value={filters.playlistFilter}
                      onChange={(e) => updateFilters({ playlistFilter: e.target.value as 'all' | 'in_playlist' | 'not_in_playlist' })}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="all">All</option>
                      <option value="in_playlist">In Playlist</option>
                      <option value="not_in_playlist">Not in Playlist</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <div className="text-base md:text-lg text-muted-foreground">Loading movies...</div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12 md:py-[60px] px-5 bg-card rounded-lg">
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              No movies found
            </p>
            <p className="text-sm md:text-base text-muted-foreground">
              Click "Add Movie" to search and add movies from TMDB.
            </p>
          </div>
        ) : (
          <>
            {selectedMovieIds.size > 0 && (() => {
              // Calculate which movies need state changes
              const selectedMovies = movies.filter(m => selectedMovieIds.has(m.id))
              const hasUnwatched = selectedMovies.some(m => !m.is_watched)
              const hasWatched = selectedMovies.some(m => m.is_watched)
              
              return (
                <div className="mb-4 p-3 md:p-4 bg-card rounded-lg border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
                  <div className="text-sm text-foreground">
                    {selectedMovieIds.size} {selectedMovieIds.size === 1 ? 'movie' : 'movies'} selected
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkWatched(true)}
                      disabled={!hasUnwatched}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Mark as Watched</span>
                      <span className="sm:hidden">Watched</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkWatched(false)}
                      disabled={!hasWatched}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">Mark as Unwatched</span>
                      <span className="sm:hidden">Unwatched</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddToPlaylistModalOpen(true)}
                      className="gap-2"
                    >
                      <ListPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add to Playlist</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMovieIds(new Set())}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              )
            })()}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {movies.length} of {total} movies
            </div>
            <div className="overflow-x-auto">
              <MovieTable 
                movies={movies} 
                onDelete={handleDelete}
                onArchive={handleArchive}
                onStar={handleStar}
                onWatched={handleWatched}
                selectedMovieIds={selectedMovieIds}
                onSelectionChange={setSelectedMovieIds}
              />
            </div>
            <Pagination
              currentPage={filters.currentPage}
              totalPages={totalPages}
              onPageChange={(page) => updateFilters({ currentPage: page })}
            />
          </>
        )}

      <TMDBSearchModal
        type="movie"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />

      <AddToPlaylistModal
        isOpen={isAddToPlaylistModalOpen}
        onClose={() => setIsAddToPlaylistModalOpen(false)}
        movieIds={Array.from(selectedMovieIds)}
        onSuccess={handleAddToPlaylistSuccess}
      />
    </>
  )
}

export default MoviesList

