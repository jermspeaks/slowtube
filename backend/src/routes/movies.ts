import express from 'express'
import { movieQueries } from '../services/database.js'
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

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: 'Invalid page number' })
    }
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: 'Invalid limit' })
    }

    const offset = (page - 1) * limit
    const movies = movieQueries.getAll(search, sortBy, sortOrder, limit, offset)
    const total = movieQueries.getCount(search)
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

export default router

