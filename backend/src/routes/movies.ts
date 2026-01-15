import express from 'express'
import { movieQueries, movieStateQueries } from '../services/database.js'
import { searchMovies, fetchMovieDetails } from '../services/tmdb.js'
import { validateIdParam, validateEntityExists, validatePagination, validateSortBy, validateSortOrder, validateBooleanParam, validateBodyField } from '../middleware/validation.js'
import { asyncHandler, ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler.js'
import { sendPaginatedResponse, sendSuccessResponse, sendErrorResponse } from '../utils/response.js'

const router = express.Router()

const ALLOWED_SORT_BY = ['title', 'release_date', 'created_at'] as const

// Search movies on TMDB
router.post('/search', asyncHandler(async (req, res) => {
  const { query } = req.body
  if (!query || typeof query !== 'string') {
    return sendErrorResponse(res, 'Query is required', 'Query must be a string', 'VALIDATION_ERROR', 400)
  }

  const results = await searchMovies(query)
  sendSuccessResponse(res, results)
}))

// Create a movie from TMDB ID
router.post('/', asyncHandler(async (req, res) => {
  const { tmdbId } = req.body
  if (!tmdbId || typeof tmdbId !== 'number') {
    return sendErrorResponse(res, 'tmdbId is required', 'tmdbId must be a number', 'VALIDATION_ERROR', 400)
  }

  // Check if movie already exists
  const existing = movieQueries.getByTmdbId(tmdbId)
  if (existing) {
    throw new ConflictError('Movie already exists', { movie: existing })
  }

  // Fetch movie details from TMDB
  const movieData = await fetchMovieDetails(tmdbId)

  // Create movie in database
  const movieId = movieQueries.create({
    ...movieData,
    saved_at: new Date().toISOString(),
  })

  const movie = movieQueries.getById(movieId)
  if (!movie) {
    throw new NotFoundError('Movie not found after creation')
  }

  sendSuccessResponse(res, movie, undefined, 201)
}))

// Get all movies
router.get('/', asyncHandler(async (req, res) => {
  const search = req.query.search as string | undefined
  const sortBy = validateSortBy(req.query.sortBy, ALLOWED_SORT_BY)
  const sortOrder = validateSortOrder(req.query.sortOrder) || 'asc'
  
  let pagination
  try {
    pagination = validatePagination(req.query.page as string, req.query.limit as string)
  } catch (error: any) {
    return sendErrorResponse(res, 'Invalid pagination', error.message, 'VALIDATION_ERROR', 400)
  }

  const archiveFilter = req.query.archiveFilter as 'all' | 'archived' | 'unarchived' | undefined
  const starredFilter = req.query.starredFilter as 'all' | 'starred' | 'unstarred' | undefined
  const watchedFilter = req.query.watchedFilter as 'all' | 'watched' | 'unwatched' | undefined
  const playlistFilter = req.query.playlistFilter as 'all' | 'in_playlist' | 'not_in_playlist' | undefined

  const movies = movieQueries.getAll(
    search,
    sortBy,
    sortBy ? sortOrder : undefined,
    pagination.limit,
    pagination.offset,
    archiveFilter,
    starredFilter,
    watchedFilter,
    playlistFilter
  )
  const total = movieQueries.getCount(search, archiveFilter, starredFilter, watchedFilter, playlistFilter)

  // For backward compatibility, return both old and new format
  res.json({
    movies, // Old format
    data: movies, // New format
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  })
}))

// Delete movie by ID
router.delete('/:id', validateIdParam(), validateEntityExists(movieQueries, 'Movie'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const deleted = movieQueries.delete(id)
  
  if (deleted > 0) {
    sendSuccessResponse(res, { message: 'Movie deleted successfully' })
  } else {
    sendErrorResponse(res, 'Failed to delete movie', 'No rows were deleted', 'DELETE_ERROR', 500)
  }
}))

// Get movie by ID
router.get('/:id', validateIdParam(), validateEntityExists(movieQueries, 'Movie'), asyncHandler(async (req, res) => {
  const movie = (req as any).validatedEntity
  sendSuccessResponse(res, movie)
}))

// Archive/unarchive movie
router.patch('/:id/archive', validateIdParam(), validateEntityExists(movieQueries, 'Movie'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const { isArchived } = req.body
  
  if (typeof isArchived !== 'boolean') {
    return sendErrorResponse(res, 'isArchived is required', 'isArchived must be a boolean', 'VALIDATION_ERROR', 400)
  }

  // Set archived state
  movieStateQueries.setArchived(id, isArchived)

  sendSuccessResponse(res, {
    message: `Movie ${isArchived ? 'archived' : 'unarchived'} successfully`,
    isArchived
  })
}))

// Star/unstar movie
router.patch('/:id/star', validateIdParam(), validateEntityExists(movieQueries, 'Movie'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const { isStarred } = req.body
  
  if (typeof isStarred !== 'boolean') {
    return sendErrorResponse(res, 'isStarred is required', 'isStarred must be a boolean', 'VALIDATION_ERROR', 400)
  }

  // Set starred state
  const changes = movieStateQueries.setStarred(id, isStarred)
  console.log(`[DEBUG] setStarred called for movie ${id}, isStarred=${isStarred}, changes=${changes}`)

  // Verify the update worked by querying the database directly
  const db = (await import('../config/db.js')).default
  const verify = db.prepare('SELECT is_starred, starred_at FROM movie_states WHERE movie_id = ?').get(id) as { is_starred: number, starred_at: string | null } | undefined
  console.log(`[DEBUG] Verification query result for movie ${id}:`, verify)

  sendSuccessResponse(res, {
    message: `Movie ${isStarred ? 'starred' : 'unstarred'} successfully`,
    isStarred
  })
}))

// Mark movie as watched/unwatched
router.patch('/:id/watched', validateIdParam(), validateEntityExists(movieQueries, 'Movie'), asyncHandler(async (req, res) => {
  const id = (req as any).validatedId as number
  const { isWatched } = req.body
  
  if (typeof isWatched !== 'boolean') {
    return sendErrorResponse(res, 'isWatched is required', 'isWatched must be a boolean', 'VALIDATION_ERROR', 400)
  }

  // Set watched state
  movieStateQueries.setWatched(id, isWatched)

  sendSuccessResponse(res, {
    message: `Movie marked as ${isWatched ? 'watched' : 'unwatched'} successfully`,
    isWatched
  })
}))

// Bulk mark movies as watched/unwatched
router.post('/bulk-watched', asyncHandler(async (req, res) => {
  const { movieIds, isWatched } = req.body

  if (!Array.isArray(movieIds) || movieIds.length === 0) {
    return sendErrorResponse(res, 'movieIds is required', 'movieIds must be a non-empty array', 'VALIDATION_ERROR', 400)
  }

  if (!movieIds.every(id => typeof id === 'number')) {
    return sendErrorResponse(res, 'Invalid movieIds', 'All movieIds must be numbers', 'VALIDATION_ERROR', 400)
  }

  if (typeof isWatched !== 'boolean') {
    return sendErrorResponse(res, 'isWatched is required', 'isWatched must be a boolean', 'VALIDATION_ERROR', 400)
  }

  // Filter movieIds to only include movies that need state changes
  const moviesToUpdate: number[] = []
  for (const movieId of movieIds) {
    const movie = movieQueries.getById(movieId)
    if (!movie) {
      continue // Skip invalid movie IDs
    }

    // For isWatched: true, only include movies that are not watched (false or null)
    // For isWatched: false, only include movies that are watched (true)
    if (isWatched && !movie.is_watched) {
      moviesToUpdate.push(movieId)
    } else if (!isWatched && movie.is_watched) {
      moviesToUpdate.push(movieId)
    }
  }

  // Update only the movies that need state changes
  let updatedCount = 0
  for (const movieId of moviesToUpdate) {
    movieStateQueries.setWatched(movieId, isWatched)
    updatedCount++
  }

  sendSuccessResponse(res, {
    message: `${updatedCount} movie(s) marked as ${isWatched ? 'watched' : 'unwatched'} successfully`,
    updatedCount,
    totalRequested: movieIds.length,
  })
}))

export default router
