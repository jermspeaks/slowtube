import { useState, useEffect, useRef } from 'react'
import { TVShow } from '../types/tv-show'
import { tvShowsAPI } from '../services/api'
import TVShowTable from '../components/TVShowTable'
import TMDBSearchModal from '../components/TMDBSearchModal'
import { toast } from 'sonner'

function TVShowsList() {
  const [tvShows, setTvShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'archived' | 'unarchived'>('unarchived')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'title' | 'first_air_date' | 'created_at' | 'next_episode_date' | 'last_episode_date' | null>('last_episode_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadStatuses()
    loadTVShows()
  }, [])

  const loadStatuses = async () => {
    try {
      const statusList = await tvShowsAPI.getStatuses()
      setStatuses(statusList || [])
    } catch (error) {
      console.error('Error loading statuses:', error)
    }
  }

  const loadTVShows = async () => {
    try {
      setLoading(true)
      // Convert archiveFilter to includeArchived boolean for backward compatibility
      const includeArchived = archiveFilter === 'all' || archiveFilter === 'archived'
      
      const response = await tvShowsAPI.getAll(
        includeArchived,
        debouncedSearchQuery || undefined,
        sortBy || undefined,
        sortBy ? sortOrder : undefined,
        currentPage,
        50,
        statusFilter || undefined,
        archiveFilter
      )
      
      setTvShows(response.tvShows || [])
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1)
        setTotal(response.pagination.total || 0)
      }
    } catch (error) {
      console.error('Error loading TV shows:', error)
      toast.error('Failed to load TV shows')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (tvShow: TVShow) => {
    try {
      await tvShowsAPI.delete(tvShow.id)
      // Reload TV shows after deletion
      loadTVShows()
    } catch (error) {
      console.error('Error deleting TV show:', error)
      toast.error('Failed to delete TV show')
    }
  }

  const handleAdd = () => {
    // Reload TV shows after adding
    loadTVShows()
  }

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      const includeArchived = archiveFilter === 'all' || archiveFilter === 'archived'
      const result = await tvShowsAPI.refreshAll(includeArchived)
      
      const newEpisodes = result.results.reduce((sum: number, r: { newEpisodes?: number }) => sum + (r.newEpisodes || 0), 0)
      const updatedEpisodes = result.results.reduce((sum: number, r: { updatedEpisodes?: number }) => sum + (r.updatedEpisodes || 0), 0)
      
      if (result.successful > 0) {
        toast.success(
          `Refresh complete: ${result.successful} successful, ${result.failed} failed. ${newEpisodes} new episodes, ${updatedEpisodes} updated.`
        )
      } else if (result.failed > 0) {
        toast.error(`Refresh failed for ${result.failed} TV show(s)`)
      } else {
        toast.info('No TV shows to refresh')
      }
      
      // Reload TV shows to show any new episodes
      loadTVShows()
    } catch (error) {
      console.error('Error refreshing TV show episodes:', error)
      toast.error('Failed to refresh TV show episodes')
    } finally {
      setIsRefreshing(false)
    }
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

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
  }, [debouncedSearchQuery, sortBy, sortOrder, archiveFilter, statusFilter])

  useEffect(() => {
    loadTVShows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy, sortOrder, currentPage, archiveFilter, statusFilter])

  const handleSortChange = (value: string) => {
    if (value === 'none') {
      setSortBy(null)
      setSortOrder('asc')
    } else {
      const lastUnderscoreIndex = value.lastIndexOf('_')
      if (lastUnderscoreIndex !== -1) {
        const by = value.substring(0, lastUnderscoreIndex) as 'title' | 'first_air_date' | 'created_at' | 'next_episode_date' | 'last_episode_date'
        const order = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc'
        if ((by === 'title' || by === 'first_air_date' || by === 'created_at' || by === 'next_episode_date' || by === 'last_episode_date') && (order === 'asc' || order === 'desc')) {
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
          <h1 className="text-3xl font-bold">TV Shows</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 border border-border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Episodes'}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Add TV Show
            </button>
          </div>
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
                <option value="first_air_date_desc">First Air Date (Newest)</option>
                <option value="first_air_date_asc">First Air Date (Oldest)</option>
                <option value="next_episode_date_asc">Next Episode Date (Ascending)</option>
                <option value="next_episode_date_desc">Next Episode Date (Descending)</option>
                <option value="last_episode_date_desc">Last Aired (Newest)</option>
                <option value="last_episode_date_asc">Last Aired (Oldest)</option>
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
                    <label className="font-semibold text-sm text-foreground whitespace-nowrap">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-border rounded text-sm bg-background"
                    >
                      <option value="">All</option>
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">Loading TV shows...</div>
          </div>
        ) : tvShows.length === 0 ? (
          <div className="text-center py-[60px] px-5 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground mb-4">
              No TV shows found
            </p>
            <p className="text-sm text-muted-foreground">
              Click "Add TV Show" to search and add TV shows from TMDB.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {tvShows.length} of {total} TV shows
            </div>
            <TVShowTable tvShows={tvShows} onDelete={handleDelete} onArchive={async (tvShow, isArchived) => {
              try {
                await tvShowsAPI.archive(tvShow.id, isArchived)
                loadTVShows()
                toast.success(`TV show ${isArchived ? 'archived' : 'unarchived'} successfully`)
              } catch (error) {
                console.error('Error archiving TV show:', error)
                toast.error('Failed to archive TV show')
              }
            }} />
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
        type="tv"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  )
}

export default TVShowsList

