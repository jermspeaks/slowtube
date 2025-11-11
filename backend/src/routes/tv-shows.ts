import express from 'express'
import { tvShowQueries, episodeQueries, tvShowStateQueries, movieQueries } from '../services/database.js'

const router = express.Router()

// Get all TV shows
router.get('/', (req, res) => {
  try {
    const { includeArchived } = req.query
    const includeArchivedBool = includeArchived === 'true' || includeArchived === '1'
    
    const tvShows = tvShowQueries.getAll(includeArchivedBool)
    
    // Add archived status to each TV show
    const tvShowsWithState = tvShows.map(tvShow => {
      const state = tvShowStateQueries.getByTVShowId(tvShow.id)
      return {
        ...tvShow,
        is_archived: state?.is_archived === 1 || false,
      }
    })
    
    res.json(tvShowsWithState)
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

