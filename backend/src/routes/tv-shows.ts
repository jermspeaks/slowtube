import express from 'express'
import { tvShowQueries, episodeQueries, tvShowStateQueries, movieQueries } from '../services/database.js'
import { searchTVShows, fetchTVShowDetails, fetchTVShowEpisodes, getTrendingTV, getPopularTV, getOnTheAirTV } from '../services/tmdb.js'
import { refreshTVShowEpisodes, refreshAllTVShowEpisodes } from '../services/tv-episode-refresh.js'
import { normalizeAirDate } from '../utils/date.js'
import { validateIdParam, validateEntityExists, validatePagination, validateSortBy, validateSortOrder, validateBooleanParam } from '../middleware/validation.js'
import { asyncHandler, ConflictError, NotFoundError } from '../middleware/errorHandler.js'
import { sendSuccessResponse, sendErrorResponse } from '../utils/response.js'

const router = express.Router()

const ALLOWED_SORT_BY = ['title', 'first_air_date', 'created_at', 'next_episode_date', 'last_episode_date'] as const

// Search TV shows on TMDB
router.post('/search', asyncHandler(async (req, res) => {
  const { query } = req.body
  if (!query || typeof query !== 'string') {
    return sendErrorResponse(res, 'Query is required', 'Query must be a string', 'VALIDATION_ERROR', 400)
  }

  const results = await searchTVShows(query)
  sendSuccessResponse(res, results)
}))

// Create a TV show from TMDB ID
router.post('/', asyncHandler(async (req, res) => {
  const { tmdbId } = req.body
  if (!tmdbId || typeof tmdbId !== 'number') {
    return sendErrorResponse(res, 'tmdbId is required', 'tmdbId must be a number', 'VALIDATION_ERROR', 400)
  }

  // Check if TV show already exists (uniqueness by tmdb_id only)
  const existing = tvShowQueries.getByTmdbId(tmdbId)
  if (existing) {
    throw new ConflictError('A TV show with this TMDB ID already exists', { tvShow: existing })
  }

  // Fetch TV show details from TMDB
  const tvShowData = await fetchTVShowDetails(tmdbId)

  // Create TV show in database (catch UNIQUE constraint in case of race)
  let tvShowId: number
  try {
    tvShowId = tvShowQueries.create({
      ...tvShowData,
      saved_at: new Date().toISOString(),
    })
  } catch (createError: any) {
    if (createError?.code === 'SQLITE_CONSTRAINT_UNIQUE' || createError?.message?.includes('UNIQUE constraint')) {
      const existingShow = tvShowQueries.getByTmdbId(tmdbId)
      if (existingShow) {
        throw new ConflictError('A TV show with this TMDB ID already exists', { tvShow: existingShow })
      }
    }
    throw createError
  }

  // Fetch and create episodes
  try {
    const episodes = await fetchTVShowEpisodes(tmdbId)
    let episodeCount = 0

    for (const episodeData of episodes) {
      try {
        episodeQueries.create({
          tv_show_id: tvShowId,
          season_number: episodeData.season_number,
          episode_number: episodeData.episode_number,
          name: episodeData.name,
          overview: episodeData.overview,
          air_date: normalizeAirDate(episodeData.air_date),
          runtime: episodeData.runtime,
          still_path: episodeData.still_path,
          is_watched: 0,
          watched_at: null,
        })
        episodeCount++
      } catch (epError: any) {
        // Skip duplicate episodes (already handled by ON CONFLICT in create)
        if (!epError.message?.includes('UNIQUE constraint')) {
          console.warn(`Error creating episode S${episodeData.season_number}E${episodeData.episode_number}:`, epError.message)
        }
      }
    }

    console.log(`Created ${episodeCount} episodes for TV show ${tvShowData.title}`)
  } catch (episodesError: any) {
    console.warn(`Error fetching episodes for TV show ${tmdbId}:`, episodesError.message)
    // Continue even if episodes fail
  }

  // Initialize tv_show_states with is_started = false
  tvShowStateQueries.setStarted(tvShowId, false)

  const tvShow = tvShowQueries.getById(tvShowId)
  if (!tvShow) {
    throw new NotFoundError('TV show not found after creation')
  }
  
  const state = tvShowStateQueries.getByTVShowId(tvShowId)
  sendSuccessResponse(res, {
    ...tvShow,
    is_archived: state?.is_archived === 1 || false,
    is_started: state?.is_started === 1 || false,
  }, undefined, 201)
}))

// Refresh episodes for all TV shows
router.post('/refresh', asyncHandler(async (req, res) => {
  const includeArchived = validateBooleanParam(req.body.includeArchived, 'includeArchived') || false
  const result = await refreshAllTVShowEpisodes(includeArchived)
  sendSuccessResponse(res, result)
}))

// Mark all TV episodes as watched (across all TV shows)
router.post('/episodes/watched-all', asyncHandler(async (req, res) => {
  const updatedCount = episodeQueries.markAllEpisodesAsWatched()
  sendSuccessResponse(res, { message: 'All TV episodes marked as watched', updatedCount })
}))

// Get all TV shows
router.get('/', asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === '1'
  const search = req.query.search as string | undefined
  const sortBy = validateSortBy(req.query.sortBy, ALLOWED_SORT_BY)
  const sortOrder = validateSortOrder(req.query.sortOrder) || 'desc'
  const status = req.query.status as string | undefined
  const archiveFilter = req.query.archiveFilter as 'all' | 'archived' | 'unarchived' | undefined
  const completionFilter = (req.query.completionFilter as 'all' | 'hideCompleted' | 'startedOnly' | 'newOnly') || 'hideCompleted'
  
  let pagination
  try {
    pagination = validatePagination(req.query.page as string, req.query.limit as string)
  } catch (error: any) {
    return sendErrorResponse(res, 'Invalid pagination', error.message, 'VALIDATION_ERROR', 400)
  }

  const tvShows = tvShowQueries.getAll(
    includeArchived,
    search,
    sortBy,
    sortBy ? sortOrder : undefined,
    pagination.limit,
    pagination.offset,
    status,
    archiveFilter,
    completionFilter
  )
  const total = tvShowQueries.getCount(includeArchived, search, status, archiveFilter, completionFilter)
  
  // Add archived and started status to each TV show
  const tvShowsWithState = tvShows.map(tvShow => {
    const state = tvShowStateQueries.getByTVShowId(tvShow.id)
    return {
      ...tvShow,
      is_archived: state?.is_archived === 1 || false,
      is_started: state?.is_started === 1 || false,
    }
  })
  
  // For backward compatibility, return both old and new format
  res.json({
    tvShows: tvShowsWithState, // Old format
    data: tvShowsWithState, // New format
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  })
}))

// Get unique statuses for filtering
router.get('/statuses', asyncHandler(async (req, res) => {
  const statuses = tvShowQueries.getUniqueStatuses()
  sendSuccessResponse(res, statuses.map(s => s.status))
}))

// Discovery: trending, popular, on the air (TMDB)
router.get('/discover', asyncHandler(async (req, res) => {
  const [trending, popular, onTheAir] = await Promise.all([
    getTrendingTV(),
    getPopularTV(),
    getOnTheAirTV(),
  ])
  sendSuccessResponse(res, { trending, popular, onTheAir })
}))

// Delete all TV shows, episodes, and movies (for reset)
// Must come before /:id routes to avoid route conflicts
router.delete('/all', asyncHandler(async (req, res) => {
  const tvShowsDeleted = tvShowQueries.deleteAll()
  const moviesDeleted = movieQueries.deleteAll()
  
  sendSuccessResponse(res, {
    message: 'All TV shows, episodes, and movies deleted successfully',
    tvShowsDeleted,
    moviesDeleted
  })
}))

// Delete TV show by ID (cascades to episodes)
router.delete('/:id', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const deleted = tvShowQueries.delete(id)
  
  if (deleted > 0) {
    sendSuccessResponse(res, { message: 'TV show deleted successfully' })
  } else {
    sendErrorResponse(res, 'Failed to delete TV show', 'No rows were deleted', 'DELETE_ERROR', 500)
  }
}))

// Get TV show by ID
router.get('/:id', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const tvShow = (req as any).validatedEntity
  const state = tvShowStateQueries.getByTVShowId(id)
  
  sendSuccessResponse(res, {
    ...tvShow,
    is_archived: state?.is_archived === 1 || false,
    is_started: state?.is_started === 1 || false,
  })
}))

// Refresh episodes for a specific TV show
router.post('/:id/refresh', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const result = await refreshTVShowEpisodes(id)
  sendSuccessResponse(res, result)
}))

// Get episodes for a TV show
router.get('/:id/episodes', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const episodes = episodeQueries.getByTVShowId(id)
  sendSuccessResponse(res, episodes)
}))

// Archive/unarchive TV show
router.patch('/:id/archive', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const { isArchived } = req.body
  
  if (typeof isArchived !== 'boolean') {
    return sendErrorResponse(res, 'isArchived is required', 'isArchived must be a boolean', 'VALIDATION_ERROR', 400)
  }

  // Set archived state
  tvShowStateQueries.setArchived(id, isArchived)

  // If archiving, mark all episodes as watched
  if (isArchived) {
    episodeQueries.markAllAsWatched(id)
  }

  sendSuccessResponse(res, {
    message: `TV show ${isArchived ? 'archived' : 'unarchived'} successfully`,
    isArchived
  })
}))

// Set/unset started status for TV show
router.patch('/:id/started', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const { isStarted } = req.body
  
  if (typeof isStarted !== 'boolean') {
    return sendErrorResponse(res, 'isStarted is required', 'isStarted must be a boolean', 'VALIDATION_ERROR', 400)
  }

  // Set started state
  tvShowStateQueries.setStarted(id, isStarted)

  sendSuccessResponse(res, {
    message: `TV show ${isStarted ? 'marked as started' : 'marked as not started'} successfully`,
    isStarted
  })
}))

const ALLOWED_STATUSES = ['Returning Series', 'Ended', 'Cancelled'] as const

// Update TV show status (override TMDB)
router.patch('/:id/status', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const { status } = req.body

  if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    return sendErrorResponse(res, 'status is required', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 'VALIDATION_ERROR', 400)
  }

  tvShowQueries.update(id, { status })
  const tvShow = tvShowQueries.getById(id)
  if (!tvShow) {
    throw new NotFoundError('TV show not found after update')
  }
  const state = tvShowStateQueries.getByTVShowId(id)
  sendSuccessResponse(res, {
    ...tvShow,
    is_archived: state?.is_archived === 1 || false,
    is_started: state?.is_started === 1 || false,
  })
}))

// Mark episode as watched
router.post('/:id/episodes/:episodeId/watched', validateIdParam('id'), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const tvShowId = (req as any).validatedId as number
  const episodeId = parseInt(req.params.episodeId, 10)
  
  if (isNaN(episodeId) || episodeId < 1) {
    return sendErrorResponse(res, 'Invalid episode ID', 'Episode ID must be a valid positive integer', 'VALIDATION_ERROR', 400)
  }
  
  const episode = episodeQueries.getById(episodeId)
  if (!episode || episode.tv_show_id !== tvShowId) {
    throw new NotFoundError('Episode not found')
  }

  // Check if this is the first episode being watched
  const watchedCountBefore = episodeQueries.getWatchedCount(tvShowId)
  const wasUnwatched = episode.is_watched === 0

  episodeQueries.markAsWatched(episodeId)
  
  // If this was the first episode watched, set is_started = true
  if (wasUnwatched && watchedCountBefore === 0) {
    tvShowStateQueries.setStarted(tvShowId, true)
  }
  
  const updatedEpisode = episodeQueries.getById(episodeId)
  if (!updatedEpisode) {
    throw new NotFoundError('Episode not found after update')
  }
  
  sendSuccessResponse(res, updatedEpisode)
}))

// Mark all episodes of a TV show as watched
router.post('/:id/episodes/watched-all', validateIdParam(), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const updatedCount = episodeQueries.markAllAsWatched(id)
  
  // Set is_started = true if any episodes were marked as watched
  if (updatedCount > 0) {
    tvShowStateQueries.setStarted(id, true)
  }
  
  sendSuccessResponse(res, {
    message: 'All episodes marked as watched',
    updatedCount
  })
}))

// Mark episode as unwatched
router.post('/:id/episodes/:episodeId/unwatched', validateIdParam('id'), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const tvShowId = (req as any).validatedId as number
  const episodeId = parseInt(req.params.episodeId, 10)
  
  if (isNaN(episodeId) || episodeId < 1) {
    return sendErrorResponse(res, 'Invalid episode ID', 'Episode ID must be a valid positive integer', 'VALIDATION_ERROR', 400)
  }
  
  const episode = episodeQueries.getById(episodeId)
  if (!episode || episode.tv_show_id !== tvShowId) {
    throw new NotFoundError('Episode not found')
  }

  episodeQueries.markAsUnwatched(episodeId)
  const updatedEpisode = episodeQueries.getById(episodeId)
  if (!updatedEpisode) {
    throw new NotFoundError('Episode not found after update')
  }
  
  sendSuccessResponse(res, updatedEpisode)
}))

// Mark all episodes in a season as watched
router.post('/:id/seasons/:seasonNumber/watched', validateIdParam('id'), validateEntityExists(tvShowQueries, 'TV show'), asyncHandler(async (req, res) => {
  const tvShowId = (req as any).validatedId as number
  const seasonNumber = parseInt(req.params.seasonNumber, 10)
  
  if (isNaN(seasonNumber) || seasonNumber < 1) {
    return sendErrorResponse(res, 'Invalid season number', 'Season number must be a positive integer', 'VALIDATION_ERROR', 400)
  }

  // Check if this is the first episode being watched
  const watchedCountBefore = episodeQueries.getWatchedCount(tvShowId)
  
  const updatedCount = episodeQueries.markSeasonAsWatched(tvShowId, seasonNumber)
  
  // If this was the first episode watched, set is_started = true
  if (updatedCount > 0 && watchedCountBefore === 0) {
    tvShowStateQueries.setStarted(tvShowId, true)
  }
  
  sendSuccessResponse(res, {
    message: `All episodes in season ${seasonNumber} marked as watched`,
    updatedCount
  })
}))

export default router
