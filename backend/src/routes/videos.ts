import express from 'express'
import { videoQueries, tagQueries, commentQueries, videoStateQueries } from '../services/database.js'
import { importVideos } from '../services/youtube.js'

const router = express.Router()

// Get all videos with optional filters
router.get('/', (req, res) => {
  try {
    const { state } = req.query
    const videos = videoQueries.getAll(state as string | undefined)
    
    // Get tags and comments for each video
    const videosWithDetails = videos.map(video => {
      const tags = tagQueries.getByVideoId(video.id)
      const comments = commentQueries.getByVideoId(video.id)
      
      return {
        ...video,
        tags,
        comments,
      }
    })

    res.json(videosWithDetails)
  } catch (error) {
    console.error('Error fetching videos:', error)
    res.status(500).json({ error: 'Failed to fetch videos' })
  }
})

// Get single video by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid video ID' })
    }

    const video = videoQueries.getById(id)
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    const tags = tagQueries.getByVideoId(id)
    const comments = commentQueries.getByVideoId(id)

    res.json({
      ...video,
      tags,
      comments,
    })
  } catch (error) {
    console.error('Error fetching video:', error)
    res.status(500).json({ error: 'Failed to fetch video' })
  }
})

// Import videos from YouTube
router.post('/import', async (req, res) => {
  try {
    const result = await importVideos()
    res.json({
      message: 'Videos imported successfully',
      imported: result.imported,
      updated: result.updated,
    })
  } catch (error: any) {
    console.error('Error importing videos:', error)
    if (error.message === 'No authenticated session found') {
      return res.status(401).json({ error: 'Not authenticated. Please connect with YouTube.' })
    }
    res.status(500).json({ error: 'Failed to import videos' })
  }
})

// Manual refresh trigger
router.post('/refresh', async (req, res) => {
  try {
    const result = await importVideos()
    res.json({
      message: 'Videos refreshed successfully',
      imported: result.imported,
      updated: result.updated,
    })
  } catch (error: any) {
    console.error('Error refreshing videos:', error)
    if (error.message === 'No authenticated session found') {
      return res.status(401).json({ error: 'Not authenticated. Please connect with YouTube.' })
    }
    res.status(500).json({ error: 'Failed to refresh videos' })
  }
})

// Update video state
router.patch('/:id/state', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid video ID' })
    }

    const { state } = req.body
    if (!state || !['feed', 'inbox', 'archive'].includes(state)) {
      return res.status(400).json({ error: 'Invalid state. Must be feed, inbox, or archive' })
    }

    // Verify video exists
    const video = videoQueries.getById(id)
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    videoStateQueries.setState(id, state as 'feed' | 'inbox' | 'archive')
    res.json({ message: 'State updated successfully', state })
  } catch (error) {
    console.error('Error updating video state:', error)
    res.status(500).json({ error: 'Failed to update video state' })
  }
})

// Add tag to video
router.post('/:id/tags', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid video ID' })
    }

    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' })
    }

    // Verify video exists
    const video = videoQueries.getById(id)
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    const tagId = tagQueries.create(id, name.trim())
    if (tagId === null) {
      return res.status(409).json({ error: 'Tag already exists for this video' })
    }

    const tag = tagQueries.getByVideoId(id).find(t => t.id === tagId)
    res.status(201).json(tag)
  } catch (error) {
    console.error('Error adding tag:', error)
    res.status(500).json({ error: 'Failed to add tag' })
  }
})

// Delete tag from video
router.delete('/:id/tags/:tagId', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const tagId = parseInt(req.params.tagId, 10)
    
    if (isNaN(id) || isNaN(tagId)) {
      return res.status(400).json({ error: 'Invalid video ID or tag ID' })
    }

    const deleted = tagQueries.delete(id, tagId)
    if (deleted === 0) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    res.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('Error deleting tag:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
})

// Get all unique tags (for autocomplete)
router.get('/tags/all', (req, res) => {
  try {
    const tags = tagQueries.getAllUnique()
    res.json(tags.map(t => t.name))
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
})

// Add comment to video
router.post('/:id/comments', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid video ID' })
    }

    const { content } = req.body
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    // Verify video exists
    const video = videoQueries.getById(id)
    if (!video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    const commentId = commentQueries.create(id, content.trim())
    const comment = commentQueries.getByVideoId(id).find(c => c.id === commentId)
    res.status(201).json(comment)
  } catch (error) {
    console.error('Error adding comment:', error)
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// Update comment
router.patch('/:id/comments/:commentId', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const commentId = parseInt(req.params.commentId, 10)
    
    if (isNaN(id) || isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid video ID or comment ID' })
    }

    const { content } = req.body
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' })
    }

    const updated = commentQueries.update(commentId, id, content.trim())
    if (updated === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    const comment = commentQueries.getByVideoId(id).find(c => c.id === commentId)
    res.json(comment)
  } catch (error) {
    console.error('Error updating comment:', error)
    res.status(500).json({ error: 'Failed to update comment' })
  }
})

// Delete comment
router.delete('/:id/comments/:commentId', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const commentId = parseInt(req.params.commentId, 10)
    
    if (isNaN(id) || isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid video ID or comment ID' })
    }

    const deleted = commentQueries.delete(commentId, id)
    if (deleted === 0) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    res.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ error: 'Failed to delete comment' })
  }
})

export default router
