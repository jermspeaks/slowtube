import express from 'express'
import { tvShowQueries, episodeQueries, tvShowStateQueries, movieQueries } from '../services/database.js'
import { searchTVShows, fetchTVShowDetails, fetchTVShowEpisodes } from '../services/tmdb.js'

const router = express.Router()

// Search TV shows on TMDB
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' })
    }

    const results = await searchTVShows(query)
    res.json(results)
  } catch (error: any) {
    console.error('Error searching TV shows:', error)
    res.status(500).json({ error: error.message || 'Failed to search TV shows' })
  }
})

// Create a TV show from TMDB ID
router.post('/', async (req, res) => {
  try {
    const { tmdbId } = req.body
    if (!tmdbId || typeof tmdbId !== 'number') {
      return res.status(400).json({ error: 'tmdbId is required and must be a number' })
    }

    // Check if TV show already exists
    const existing = tvShowQueries.getByTmdbId(tmdbId)
    if (existing) {
      return res.status(409).json({ error: 'TV show already exists', tvShow: existing })
    }

    // Fetch TV show details from TMDB
    const tvShowData = await fetchTVShowDetails(tmdbId)

    // Create TV show in database
    const tvShowId = tvShowQueries.create({
      ...tvShowData,
      saved_at: new Date().toISOString(),
    })

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
            air_date: episodeData.air_date,
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

    const tvShow = tvShowQueries.getById(tvShowId)
    const state = tvShowStateQueries.getByTVShowId(tvShowId)
    res.status(201).json({
      ...tvShow,
      is_archived: state?.is_archived === 1 || false,
    })
  } catch (error: any) {
    console.error('Error creating TV show:', error)
    res.status(500).json({ error: error.message || 'Failed to create TV show' })
  }
})

// Get all TV shows
router.get('/', (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === '1'
    const search = req.query.search as string | undefined
    const sortBy = req.query.sortBy as 'title' | 'first_air_date' | 'created_at' | undefined
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
    const tvShows = tvShowQueries.getAll(includeArchived, search, sortBy, sortOrder, limit, offset)
    const total = tvShowQueries.getCount(includeArchived, search)
    const totalPages = Math.ceil(total / limit)
    
    // Add archived status to each TV show
    const tvShowsWithState = tvShows.map(tvShow => {
      const state = tvShowStateQueries.getByTVShowId(tvShow.id)
      return {
        ...tvShow,
        is_archived: state?.is_archived === 1 || false,
      }
    })
    
    res.json({
      tvShows: tvShowsWithState,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching TV shows:', error)
    res.status(500).json({ error: 'Failed to fetch TV shows' })
  }
})

// Delete all TV shows, episodes, and movies (for reset)
// Must come before /:id routes to avoid route conflicts
router.delete('/all', (req, res) => {
  try {
    const tvShowsDeleted = tvShowQueries.deleteAll()
    const moviesDeleted = movieQueries.deleteAll()
    
    res.json({ 
      message: 'All TV shows, episodes, and movies deleted successfully',
      tvShowsDeleted,
      moviesDeleted
    })
  } catch (error) {
    console.error('Error deleting all TV shows and movies:', error)
    res.status(500).json({ error: 'Failed to delete all TV shows and movies' })
  }
})

// Delete TV show by ID (cascades to episodes)
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid TV show ID' })
    }

    const tvShow = tvShowQueries.getById(id)
    if (!tvShow) {
      return res.status(404).json({ error: 'TV show not found' })
    }

    const deleted = tvShowQueries.delete(id)
    if (deleted > 0) {
      res.json({ message: 'TV show deleted successfully' })
    } else {
      res.status(500).json({ error: 'Failed to delete TV show' })
    }
  } catch (error) {
    console.error('Error deleting TV show:', error)
    res.status(500).json({ error: 'Failed to delete TV show' })
  }
})

// Get TV show by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid TV show ID' })
    }

    const tvShow = tvShowQueries.getById(id)
    if (!tvShow) {
      return res.status(404).json({ error: 'TV show not found' })
    }

    const state = tvShowStateQueries.getByTVShowId(id)
    res.json({
      ...tvShow,
      is_archived: state?.is_archived === 1 || false,
    })
  } catch (error) {
    console.error('Error fetching TV show:', error)
    res.status(500).json({ error: 'Failed to fetch TV show' })
  }
})

// Get episodes for a TV show
router.get('/:id/episodes', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid TV show ID' })
    }

    const tvShow = tvShowQueries.getById(id)
    if (!tvShow) {
      return res.status(404).json({ error: 'TV show not found' })
    }

    const episodes = episodeQueries.getByTVShowId(id)
    res.json(episodes)
  } catch (error) {
    console.error('Error fetching episodes:', error)
    res.status(500).json({ error: 'Failed to fetch episodes' })
  }
})

// Archive/unarchive TV show
router.patch('/:id/archive', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid TV show ID' })
    }

    const { isArchived } = req.body
    if (typeof isArchived !== 'boolean') {
      return res.status(400).json({ error: 'isArchived must be a boolean' })
    }

    const tvShow = tvShowQueries.getById(id)
    if (!tvShow) {
      return res.status(404).json({ error: 'TV show not found' })
    }

    // Set archived state
    tvShowStateQueries.setArchived(id, isArchived)

    // If archiving, mark all episodes as watched
    if (isArchived) {
      episodeQueries.markAllAsWatched(id)
    }

    res.json({ message: `TV show ${isArchived ? 'archived' : 'unarchived'} successfully`, isArchived })
  } catch (error) {
    console.error('Error archiving TV show:', error)
    res.status(500).json({ error: 'Failed to archive TV show' })
  }
})

// Mark episode as watched
router.post('/:id/episodes/:episodeId/watched', (req, res) => {
  try {
    const tvShowId = parseInt(req.params.id, 10)
    const episodeId = parseInt(req.params.episodeId, 10)
    
    if (isNaN(tvShowId) || isNaN(episodeId)) {
      return res.status(400).json({ error: 'Invalid TV show ID or episode ID' })
    }

    const tvShow = tvShowQueries.getById(tvShowId)
    if (!tvShow) {
      return res.status(404).json({ error: 'TV show not found' })
    }

    const episode = episodeQueries.getById(episodeId)
    if (!episode || episode.tv_show_id !== tvShowId) {
      return res.status(404).json({ error: 'Episode not found' })
    }

    episodeQueries.markAsWatched(episodeId)
    const updatedEpisode = episodeQueries.getById(episodeId)
    
    res.json(updatedEpisode)
  } catch (error) {
    console.error('Error marking episode as watched:', error)
    res.status(500).json({ error: 'Failed to mark episode as watched' })
  }
})

// Mark all episodes of a TV show as watched
router.post('/:id/episodes/watched-all', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid TV show ID' })
    }

    const tvShow = tvShowQueries.getById(id)
    if (!tvShow) {
      return res.status(404).json({ error: 'TV show not found' })
    }

    const updatedCount = episodeQueries.markAllAsWatched(id)
    res.json({ message: 'All episodes marked as watched', updatedCount })
  } catch (error) {
    console.error('Error marking all episodes as watched:', error)
    res.status(500).json({ error: 'Failed to mark all episodes as watched' })
  }
})

export default router

