import express from 'express'
import { movieQueries } from '../services/database.js'

const router = express.Router()

// Get all movies
router.get('/', (req, res) => {
  try {
    const movies = movieQueries.getAll()
    res.json(movies)
  } catch (error) {
    console.error('Error fetching movies:', error)
    res.status(500).json({ error: 'Failed to fetch movies' })
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

