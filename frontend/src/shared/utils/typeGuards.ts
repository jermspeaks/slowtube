/**
 * Type guard functions for URL parameter validation
 */

export function isArchiveFilter(
  value: string | null
): value is 'all' | 'archived' | 'unarchived' {
  return value === 'all' || value === 'archived' || value === 'unarchived'
}

export function isStarredFilter(
  value: string | null
): value is 'all' | 'starred' | 'unstarred' {
  return value === 'all' || value === 'starred' || value === 'unstarred'
}

export function isWatchedFilter(
  value: string | null
): value is 'all' | 'watched' | 'unwatched' {
  return value === 'all' || value === 'watched' || value === 'unwatched'
}

export function isPlaylistFilter(
  value: string | null
): value is 'all' | 'in_playlist' | 'not_in_playlist' {
  return value === 'all' || value === 'in_playlist' || value === 'not_in_playlist'
}

export function isCompletionFilter(
  value: string | null
): value is 'all' | 'hideCompleted' | 'startedOnly' | 'newOnly' {
  return (
    value === 'all' ||
    value === 'hideCompleted' ||
    value === 'startedOnly' ||
    value === 'newOnly'
  )
}

export function isSortOrder(value: string | null): value is 'asc' | 'desc' {
  return value === 'asc' || value === 'desc'
}

export function isMovieSortBy(
  value: string | null
): value is 'title' | 'release_date' | 'created_at' {
  return value === 'title' || value === 'release_date' || value === 'created_at'
}

export function isTVShowSortBy(
  value: string | null
): value is 'title' | 'first_air_date' | 'created_at' | 'next_episode_date' | 'last_episode_date' {
  return (
    value === 'title' ||
    value === 'first_air_date' ||
    value === 'created_at' ||
    value === 'next_episode_date' ||
    value === 'last_episode_date'
  )
}

export function isValidPage(value: string | null): value is string {
  if (!value) return false
  const pageNum = parseInt(value, 10)
  return !isNaN(pageNum) && pageNum > 0
}
