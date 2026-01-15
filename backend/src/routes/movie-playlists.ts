import express from 'express'
import { moviePlaylistQueries } from '../services/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Create a playlist
router.post('/', (req, res) => {
  try {
    const { name, description, color } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const playlistId = moviePlaylistQueries.create(name.trim(), description || null, color || null)
    const playlist = moviePlaylistQueries.getById(playlistId)
    
    if (!playlist) {
      return res.status(500).json({ error: 'Failed to create playlist' })
    }

    res.status(201).json(playlist)
  } catch (error: any) {
    logger.error('Error creating playlist', { error: error.message, stack: error.stack })
    res.status(500).json({ error: error.message || 'Failed to create playlist' })
  }
})

// Get all playlists
router.get('/', (req, res) => {
  try {
    const playlists = moviePlaylistQueries.getAll()
    res.json(playlists)
  } catch (error: any) {
    logger.error('Error fetching playlists', { error: error.message, stack: error.stack })
    res.status(500).json({ error: 'Failed to fetch playlists' })
  }
})

// Get playlist by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    res.json(playlist)
  } catch (error: any) {
    logger.error('Error fetching playlist', { error: error.message, stack: error.stack })
    res.status(500).json({ error: 'Failed to fetch playlist' })
  }
})

// Update playlist
router.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const { name, description, color, display_on_home } = req.body
    const updates: { name?: string; description?: string | null; color?: string | null; display_on_home?: number } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name must be a non-empty string' })
      }
      updates.name = name.trim()
    }
    if (description !== undefined) {
      updates.description = description === null || description === '' ? null : description
    }
    if (color !== undefined) {
      updates.color = color === null || color === '' ? null : color
    }
    if (display_on_home !== undefined) {
      if (typeof display_on_home !== 'boolean') {
        return res.status(400).json({ error: 'display_on_home must be a boolean' })
      }
      updates.display_on_home = display_on_home ? 1 : 0
    }

    const changes = moviePlaylistQueries.update(id, updates)
    if (changes === 0 && Object.keys(updates).length > 0) {
      return res.status(500).json({ error: 'Failed to update playlist' })
    }

    const updatedPlaylist = moviePlaylistQueries.getById(id)
    res.json(updatedPlaylist)
  } catch (error: any) {
    logger.error('Error updating playlist', { error: error.message, stack: error.stack, playlistId: id })
    res.status(500).json({ error: error.message || 'Failed to update playlist' })
  }
})

// Delete playlist
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const deleted = moviePlaylistQueries.delete(id)
    if (deleted > 0) {
      res.json({ message: 'Playlist deleted successfully' })
    } else {
      res.status(500).json({ error: 'Failed to delete playlist' })
    }
  } catch (error: any) {
    logger.error('Error deleting playlist', { error: error.message, stack: error.stack, playlistId: id })
    res.status(500).json({ error: 'Failed to delete playlist' })
  }
})

// Add movies to playlist
router.post('/:id/movies', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const { movieId, movieIds } = req.body

    if (movieId !== undefined) {
      // Single movie
      if (typeof movieId !== 'number') {
        return res.status(400).json({ error: 'movieId must be a number' })
      }
      const result = moviePlaylistQueries.addMovie(id, movieId)
      if (result === 0) {
        return res.status(409).json({ error: 'Movie already in playlist' })
      }
    } else if (movieIds !== undefined) {
      // Bulk add
      if (!Array.isArray(movieIds) || movieIds.length === 0) {
        return res.status(400).json({ error: 'movieIds must be a non-empty array' })
      }
      if (!movieIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ error: 'All movieIds must be numbers' })
      }
      const addedCount = moviePlaylistQueries.addMovies(id, movieIds)
      res.json({ message: `Added ${addedCount} movie(s) to playlist`, addedCount })
      return
    } else {
      return res.status(400).json({ error: 'Either movieId or movieIds is required' })
    }

    const updatedPlaylist = moviePlaylistQueries.getById(id)
    res.json(updatedPlaylist)
  } catch (error: any) {
    logger.error('Error adding movies to playlist', { error: error.message, stack: error.stack, playlistId: id })
    res.status(500).json({ error: error.message || 'Failed to add movies to playlist' })
  }
})

// Remove movie from playlist
router.delete('/:id/movies/:movieId', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const movieId = parseInt(req.params.movieId, 10)
    
    if (isNaN(id) || isNaN(movieId)) {
      return res.status(400).json({ error: 'Invalid playlist ID or movie ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const deleted = moviePlaylistQueries.removeMovie(id, movieId)
    if (deleted > 0) {
      const updatedPlaylist = moviePlaylistQueries.getById(id)
      res.json(updatedPlaylist)
    } else {
      res.status(404).json({ error: 'Movie not found in playlist' })
    }
  } catch (error: any) {
    logger.error('Error removing movie from playlist', { error: error.message, stack: error.stack, playlistId: id, movieId })
    res.status(500).json({ error: 'Failed to remove movie from playlist' })
  }
})

// Bulk remove movies from playlist
router.post('/:id/movies/bulk-remove', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const { movieIds } = req.body
    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({ error: 'movieIds must be a non-empty array' })
    }
    if (!movieIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ error: 'All movieIds must be numbers' })
    }

    const removedCount = moviePlaylistQueries.removeMovies(id, movieIds)
    const updatedPlaylist = moviePlaylistQueries.getById(id)
    res.json({ ...updatedPlaylist, removedCount })
  } catch (error: any) {
    logger.error('Error removing movies from playlist', { error: error.message, stack: error.stack, playlistId: id })
    res.status(500).json({ error: error.message || 'Failed to remove movies from playlist' })
  }
})

// Reorder playlists (must be before /:id routes to avoid route matching conflicts)
router.patch('/reorder', (req, res) => {
  try {
    const { playlistIds } = req.body
    
    logger.debug('Reorder playlists request received', { 
      playlistIds,
      playlistIdsType: typeof playlistIds,
      playlistIdsLength: Array.isArray(playlistIds) ? playlistIds.length : 'not an array'
    })
    
    if (!Array.isArray(playlistIds)) {
      logger.warn('Reorder playlists failed: playlistIds is not an array', { playlistIds })
      return res.status(400).json({ error: 'playlistIds must be an array' })
    }
    if (!playlistIds.every(id => typeof id === 'number')) {
      logger.warn('Reorder playlists failed: playlistIds contains non-numbers', { 
        playlistIds,
        types: playlistIds.map(id => typeof id)
      })
      return res.status(400).json({ error: 'All playlistIds must be numbers' })
    }
    if (playlistIds.length === 0) {
      logger.warn('Reorder playlists failed: playlistIds array is empty')
      return res.status(400).json({ error: 'playlistIds array cannot be empty' })
    }

    // Verify all playlist IDs exist
    const allPlaylists = moviePlaylistQueries.getAll()
    const allPlaylistIds = allPlaylists.map(p => p.id)
    
    logger.debug('Playlist validation', {
      requestedIds: playlistIds,
      requestedCount: playlistIds.length,
      allPlaylistIds: allPlaylistIds,
      allPlaylistCount: allPlaylistIds.length
    })
    
    const invalidIds = playlistIds.filter((id: number) => !allPlaylistIds.includes(id))
    if (invalidIds.length > 0) {
      logger.warn('Reorder playlists failed: invalid playlist IDs', {
        invalidIds,
        requestedIds: playlistIds,
        validIds: allPlaylistIds
      })
      return res.status(400).json({ 
        error: `Invalid playlist IDs: ${invalidIds.join(', ')}`,
        details: `Requested ${playlistIds.length} playlists, but ${invalidIds.length} are invalid. Valid playlist IDs: ${allPlaylistIds.join(', ')}`
      })
    }

    // Check for duplicate IDs in the request
    const uniqueIds = new Set(playlistIds)
    if (uniqueIds.size !== playlistIds.length) {
      const duplicates = playlistIds.filter((id, index) => playlistIds.indexOf(id) !== index)
      logger.warn('Reorder playlists failed: duplicate playlist IDs', {
        duplicates,
        requestedIds: playlistIds
      })
      return res.status(400).json({ 
        error: 'Duplicate playlist IDs in request',
        details: `Found duplicate IDs: ${[...new Set(duplicates)].join(', ')}`
      })
    }

    logger.info('Reordering playlists', { playlistIds })
    moviePlaylistQueries.reorderPlaylists(playlistIds)
    const updatedPlaylists = moviePlaylistQueries.getAll()
    logger.debug('Playlists reordered successfully', { 
      count: updatedPlaylists.length,
      newOrder: updatedPlaylists.map(p => ({ id: p.id, name: p.name, sort_order: p.sort_order }))
    })
    res.json(updatedPlaylists)
  } catch (error: any) {
    logger.error('Error reordering playlists', { error: error.message, stack: error.stack })
    res.status(500).json({ error: error.message || 'Failed to reorder playlists' })
  }
})

// Toggle display on home for a playlist
router.patch('/:id/display-on-home', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const { display_on_home } = req.body
    if (typeof display_on_home !== 'boolean') {
      return res.status(400).json({ error: 'display_on_home must be a boolean' })
    }

    const changes = moviePlaylistQueries.updateDisplayOnHome(id, display_on_home)
    if (changes === 0) {
      return res.status(500).json({ error: 'Failed to update display on home' })
    }

    const updatedPlaylist = moviePlaylistQueries.getById(id)
    res.json(updatedPlaylist)
  } catch (error: any) {
    logger.error('Error updating display on home', { error: error.message, stack: error.stack, playlistId: id })
    res.status(500).json({ error: error.message || 'Failed to update display on home' })
  }
})

// Reorder movies in playlist
router.patch('/:id/movies/reorder', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playlist ID' })
    }

    const playlist = moviePlaylistQueries.getById(id)
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const { movieIds } = req.body
    if (!Array.isArray(movieIds)) {
      return res.status(400).json({ error: 'movieIds must be an array' })
    }
    if (!movieIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ error: 'All movieIds must be numbers' })
    }

    // Verify all movie IDs exist in the playlist
    const playlistMovieIds = playlist.movies.map(m => m.id)
    const invalidIds = movieIds.filter(movieId => !playlistMovieIds.includes(movieId))
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid movie IDs: ${invalidIds.join(', ')}` })
    }

    // Verify all playlist movies are included
    if (movieIds.length !== playlistMovieIds.length) {
      return res.status(400).json({ error: 'All movies in playlist must be included in reorder' })
    }

    moviePlaylistQueries.reorderMovies(id, movieIds)
    const updatedPlaylist = moviePlaylistQueries.getById(id)
    res.json(updatedPlaylist)
  } catch (error: any) {
    logger.error('Error reordering movies in playlist', { error: error.message, stack: error.stack, playlistId: id })
    res.status(500).json({ error: error.message || 'Failed to reorder movies in playlist' })
  }
})

export default router

