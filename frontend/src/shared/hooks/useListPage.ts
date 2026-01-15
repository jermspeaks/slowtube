import { useState, useEffect, useCallback, useRef } from 'react'
import { useURLParams } from './useURLParams'
import { useDebounce } from './useDebounce'

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UseListPageOptions<T, Filters extends Record<string, any>> {
  // Default filter values
  defaultFilters: Filters
  // Serialize filters to URL params
  serializeFilters: (filters: Filters) => URLSearchParams
  // Deserialize URL params to filters
  deserializeFilters: (params: URLSearchParams) => Partial<Filters>
  // Function to load data
  loadData: (filters: Filters, debouncedSearch: string, page: number, limit: number) => Promise<{
    data: T[]
    pagination?: PaginationInfo
    total?: number
    totalPages?: number
  }>
  // Default page size
  defaultPageSize?: number
  // Search debounce delay (default: 500ms)
  searchDebounceDelay?: number
  // Whether to reset to page 1 when filters change
  resetPageOnFilterChange?: boolean
}

export interface UseListPageReturn<T, Filters extends Record<string, any>> {
  // Data
  items: T[]
  loading: boolean
  // Pagination
  currentPage: number
  totalPages: number
  total: number
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  debouncedSearchQuery: string
  // Filters
  filters: Filters
  updateFilters: (updates: Partial<Filters>) => void
  // Actions
  loadData: () => Promise<void>
  setCurrentPage: (page: number) => void
  refresh: () => Promise<void>
}

/**
 * Generic hook for list pages with pagination, filtering, and search
 * @param options - Configuration options
 * @returns List page state and handlers
 */
export function useListPage<T, Filters extends Record<string, any>>(
  options: UseListPageOptions<T, Filters>
): UseListPageReturn<T, Filters> {
  const {
    defaultFilters,
    serializeFilters,
    deserializeFilters,
    loadData: loadDataFn,
    defaultPageSize = 50,
    searchDebounceDelay = 500,
    resetPageOnFilterChange = true,
  } = options

  // URL params synchronization
  const [filters, updateFilters] = useURLParams<Filters>({
    defaults: defaultFilters,
    serialize: serializeFilters,
    deserialize: deserializeFilters,
  })

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>(filters.search || '')
  const debouncedSearchQuery = useDebounce(searchQuery, searchDebounceDelay)

  // Sync searchQuery with filters.search when URL changes
  useEffect(() => {
    if (filters.search !== undefined) {
      setSearchQuery(filters.search)
    }
  }, [filters.search])

  // Data state
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(filters.currentPage || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Track if we should reset page on filter changes
  const previousFiltersRef = useRef<Partial<Filters>>({})
  const previousSearchRef = useRef<string>('')

  // Reset to page 1 when filters or search change (if enabled)
  useEffect(() => {
    if (!resetPageOnFilterChange) return

    const filtersChanged = Object.keys(filters).some(key => {
      const currentValue = filters[key as keyof Filters]
      const previousValue = previousFiltersRef.current[key as keyof Filters]
      return currentValue !== previousValue && key !== 'currentPage'
    })

    const searchChanged = debouncedSearchQuery !== previousSearchRef.current

    if (filtersChanged || searchChanged) {
      setCurrentPage(1)
      updateFilters({ currentPage: 1 } as Partial<Filters>)
    }

    previousFiltersRef.current = { ...filters }
    previousSearchRef.current = debouncedSearchQuery
  }, [filters, debouncedSearchQuery, resetPageOnFilterChange, updateFilters])

  // Sync currentPage with filters.currentPage when URL changes
  useEffect(() => {
    if (filters.currentPage && filters.currentPage !== currentPage) {
      setCurrentPage(filters.currentPage)
    }
  }, [filters.currentPage, currentPage])

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await loadDataFn(
        filters,
        debouncedSearchQuery,
        currentPage,
        defaultPageSize
      )

      // Handle both old and new response formats
      const data = response.data || (response as any).movies || (response as any).tvShows || (response as any).videos || []
      const pagination = response.pagination || {
        page: currentPage,
        limit: defaultPageSize,
        total: response.total || 0,
        totalPages: response.totalPages || 1,
      }

      setItems(data)
      setTotalPages(pagination.totalPages)
      setTotal(pagination.total)
    } catch (error) {
      console.error('Error loading data:', error)
      setItems([])
      setTotalPages(1)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filters, debouncedSearchQuery, currentPage, defaultPageSize, loadDataFn])

  // Load data when dependencies change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh function
  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  // Update current page handler
  const handleSetCurrentPage = useCallback((page: number) => {
    setCurrentPage(page)
    updateFilters({ currentPage: page } as Partial<Filters>)
  }, [updateFilters])

  return {
    items,
    loading,
    currentPage,
    totalPages,
    total,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filters,
    updateFilters,
    loadData,
    setCurrentPage: handleSetCurrentPage,
    refresh,
  }
}
