import express from 'express'
import { movieQueries, movieStateQueries } from '../services/database.js'
import { searchMovies, fetchMovieDetails } from '../services/tmdb.js'

const router = express.Router()

// Search movies on TMDB
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' })
    }

    const results = await searchMovies(query)
    res.json(results)
  } catch (error: any) {
    console.error('Error searching movies:', error)
    res.status(500).json({ error: error.message || 'Failed to search movies' })
  }
})

// Create a movie from TMDB ID
router.post('/', async (req, res) => {
  try {
    const { tmdbId } = req.body
    if (!tmdbId || typeof tmdbId !== 'number') {
      return res.status(400).json({ error: 'tmdbId is required and must be a number' })
    }

    // Check if movie already exists
    const existing = movieQueries.getByTmdbId(tmdbId)
    if (existing) {
      return res.status(409).json({ error: 'Movie already exists', movie: existing })
    }

    // Fetch movie details from TMDB
    const movieData = await fetchMovieDetails(tmdbId)

    // Create movie in database
    const movieId = movieQueries.create({
      ...movieData,
      saved_at: new Date().toISOString(),
    })

    const movie = movieQueries.getById(movieId)
    res.status(201).json(movie)
  } catch (error: any) {
    console.error('Error creating movie:', error)
    res.status(500).json({ error: error.message || 'Failed to create movie' })
  }
})

// Get all movies
router.get('/', (req, res) => {
  try {
    const search = req.query.search as string | undefined
    const sortBy = req.query.sortBy as 'title' | 'release_date' | 'created_at' | undefined
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
    const archiveFilter = req.query.archiveFilter as 'all' | 'archived' | 'unarchived' | undefined
    const starredFilter = req.query.starredFilter as 'all' | 'starred' | 'unstarred' | undefined
    const watchedFilter = req.query.watchedFilter as 'all' | 'watched' | 'unwatched' | undefined

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: 'Invalid page number' })
    }
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: 'Invalid limit' })
    }

    const offset = (page - 1) * limit
    const movies = movieQueries.getAll(search, sortBy, sortOrder, limit, offset, archiveFilter, starredFilter, watchedFilter)
    const total = movieQueries.getCount(search, archiveFilter, starredFilter, watchedFilter)
    const totalPages = Math.ceil(total / limit)

    res.json({
      movies,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching movies:', error)
    res.status(500).json({ error: 'Failed to fetch movies' })
  }
})

// Delete movie by ID
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid movie ID' })
    }

    const movie = movieQueries.getById(id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    const deleted = movieQueries.delete(id)
    if (deleted > 0) {
      res.json({ message: 'Movie deleted successfully' })
    } else {
      res.status(500).json({ error: 'Failed to delete movie' })
    }
  } catch (error) {
    console.error('Error deleting movie:', error)
    res.status(500).json({ error: 'Failed to delete movie' })
  }
})

// Get movie by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid movie ID' })
    }

    const movie = movieQueries.getById(id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    res.json(movie)
  } catch (error) {
    console.error('Error fetching movie:', error)
    res.status(500).json({ error: 'Failed to fetch movie' })
  }
})

// Archive/unarchive movie
router.patch('/:id/archive', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid movie ID' })
    }

    const movie = movieQueries.getById(id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    const { isArchived } = req.body
    if (typeof isArchived !== 'boolean') {
      return res.status(400).json({ error: 'isArchived must be a boolean' })
    }

    // Set archived state
    movieStateQueries.setArchived(id, isArchived)

    res.json({ message: `Movie ${isArchived ? 'archived' : 'unarchived'} successfully`, isArchived })
  } catch (error) {
    console.error('Error archiving movie:', error)
    res.status(500).json({ error: 'Failed to archive movie' })
  }
})

// Star/unstar movie
router.patch('/:id/star', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid movie ID' })
    }

    const movie = movieQueries.getById(id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    const { isStarred } = req.body
    if (typeof isStarred !== 'boolean') {
      return res.status(400).json({ error: 'isStarred must be a boolean' })
    }

    // Set starred state
    movieStateQueries.setStarred(id, isStarred)

    res.json({ message: `Movie ${isStarred ? 'starred' : 'unstarred'} successfully`, isStarred })
  } catch (error) {
    console.error('Error starring movie:', error)
    res.status(500).json({ error: 'Failed to star movie' })
  }
})

// Mark movie as watched/unwatched
router.patch('/:id/watched', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid movie ID' })
    }

    const movie = movieQueries.getById(id)
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    const { isWatched } = req.body
    if (typeof isWatched !== 'boolean') {
      return res.status(400).json({ error: 'isWatched must be a boolean' })
    }

    // Set watched state
    movieStateQueries.setWatched(id, isWatched)

    res.json({ message: `Movie marked as ${isWatched ? 'watched' : 'unwatched'} successfully`, isWatched })
  } catch (error) {
    console.error('Error marking movie as watched:', error)
    res.status(500).json({ error: 'Failed to mark movie as watched' })
  }
})

// Bulk mark movies as watched/unwatched
router.post('/bulk-watched', (req, res) => {
  try {
    const { movieIds, isWatched } = req.body

    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({ error: 'movieIds must be a non-empty array' })
    }

    if (!movieIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ error: 'All movieIds must be numbers' })
    }

    if (typeof isWatched !== 'boolean') {
      return res.status(400).json({ error: 'isWatched must be a boolean' })
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

    res.json({
      message: `${updatedCount} movie(s) marked as ${isWatched ? 'watched' : 'unwatched'} successfully`,
      updatedCount,
      totalRequested: movieIds.length,
    })
  } catch (error) {
    console.error('Error bulk marking movies as watched:', error)
    res.status(500).json({ error: 'Failed to bulk mark movies as watched' })
  }
})

export default router

