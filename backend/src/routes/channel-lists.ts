import express from 'express'
import { channelListQueries, channelQueries, tagQueries, commentQueries } from '../services/database.js'
import { processLatestVideosFromChannel } from './channels.js'
import { getAuthenticatedClient } from './auth.js'

const router = express.Router()

// Create a channel list
router.post('/', (req, res) => {
  try {
    const { name, description, color } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const listId = channelListQueries.create(name.trim(), description || null, color || null)
    const list = channelListQueries.getById(listId)
    
    if (!list) {
      return res.status(500).json({ error: 'Failed to create list' })
    }

    res.status(201).json(list)
  } catch (error: any) {
    console.error('Error creating channel list:', error)
    res.status(500).json({ error: error.message || 'Failed to create channel list' })
  }
})

// Get all channel lists
router.get('/', (req, res) => {
  try {
    const lists = channelListQueries.getAll()
    res.json(lists)
  } catch (error) {
    console.error('Error fetching channel lists:', error)
    res.status(500).json({ error: 'Failed to fetch channel lists' })
  }
})

// Get channel list by ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    res.json(list)
  } catch (error) {
    console.error('Error fetching channel list:', error)
    res.status(500).json({ error: 'Failed to fetch channel list' })
  }
})

// Update channel list
router.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    const { name, description, color } = req.body
    const updates: { name?: string; description?: string | null; color?: string | null } = {}

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

    const changes = channelListQueries.update(id, updates)
    if (changes === 0 && Object.keys(updates).length > 0) {
      return res.status(500).json({ error: 'Failed to update list' })
    }

    const updatedList = channelListQueries.getById(id)
    res.json(updatedList)
  } catch (error: any) {
    console.error('Error updating channel list:', error)
    res.status(500).json({ error: error.message || 'Failed to update channel list' })
  }
})

// Delete channel list
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    const deleted = channelListQueries.delete(id)
    if (deleted > 0) {
      res.json({ message: 'List deleted successfully' })
    } else {
      res.status(500).json({ error: 'Failed to delete list' })
    }
  } catch (error) {
    console.error('Error deleting channel list:', error)
    res.status(500).json({ error: 'Failed to delete channel list' })
  }
})

// Add channels to list
router.post('/:id/channels', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    const { channelId, channelIds } = req.body

    if (channelId !== undefined) {
      // Single channel
      if (typeof channelId !== 'string') {
        return res.status(400).json({ error: 'channelId must be a string' })
      }
      const result = channelListQueries.addChannel(id, channelId)
      if (result === 0) {
        return res.status(409).json({ error: 'Channel already in list' })
      }
    } else if (channelIds !== undefined) {
      // Bulk add
      if (!Array.isArray(channelIds) || channelIds.length === 0) {
        return res.status(400).json({ error: 'channelIds must be a non-empty array' })
      }
      if (!channelIds.every(id => typeof id === 'string')) {
        return res.status(400).json({ error: 'All channelIds must be strings' })
      }
      const addedCount = channelListQueries.addChannels(id, channelIds)
      res.json({ message: `Added ${addedCount} channel(s) to list`, addedCount })
      return
    } else {
      return res.status(400).json({ error: 'Either channelId or channelIds is required' })
    }

    const updatedList = channelListQueries.getById(id)
    res.json(updatedList)
  } catch (error: any) {
    console.error('Error adding channels to list:', error)
    res.status(500).json({ error: error.message || 'Failed to add channels to list' })
  }
})

// Remove channel from list
router.delete('/:id/channels/:channelId', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { channelId } = req.params
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    const deleted = channelListQueries.removeChannel(id, channelId)
    if (deleted > 0) {
      const updatedList = channelListQueries.getById(id)
      res.json(updatedList)
    } else {
      res.status(404).json({ error: 'Channel not found in list' })
    }
  } catch (error) {
    console.error('Error removing channel from list:', error)
    res.status(500).json({ error: 'Failed to remove channel from list' })
  }
})

// Refresh list - fetch latest videos from all channels in list
router.post('/:id/refresh', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    // Check if authenticated first
    try {
      await getAuthenticatedClient()
    } catch (authError: any) {
      if (authError.code === 'AUTHENTICATION_REQUIRED') {
        return res.status(401).json({ 
          error: 'YouTube authentication required',
          message: 'Please connect your YouTube account in Settings to refresh videos.',
          requiresAuth: true,
          settingsUrl: '/settings'
        })
      }
      throw authError
    }

    const { limit } = req.query
    const fetchLimit = limit ? parseInt(limit as string, 10) : 50

    if (isNaN(fetchLimit) || fetchLimit < 1 || fetchLimit > 50) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 50.' })
    }

    if (list.channels.length === 0) {
      return res.json({
        message: 'No channels in list',
        channelsProcessed: 0,
        totalVideos: 0,
        newVideos: 0,
        existingVideos: 0,
        results: [],
      })
    }

    const results: Array<{
      channelId: string
      channelTitle: string
      videosFetched: number
      newVideos: number
      existingVideos: number
      error?: string
    }> = []

    let totalVideos = 0
    let totalNewVideos = 0
    let totalExistingVideos = 0

    // Process each channel sequentially
    for (const channel of list.channels) {
      try {
        const result = await processLatestVideosFromChannel(channel.youtube_channel_id, fetchLimit)
        
        if (result.error) {
          results.push({
            channelId: channel.youtube_channel_id,
            channelTitle: channel.channel_title || 'Unknown Channel',
            videosFetched: 0,
            newVideos: 0,
            existingVideos: 0,
            error: result.error,
          })
          continue
        }

        const newVideos = result.videos.filter(v => v.isNew).length
        const existingVideos = result.videos.filter(v => !v.isNew).length

        results.push({
          channelId: channel.youtube_channel_id,
          channelTitle: channel.channel_title || 'Unknown Channel',
          videosFetched: result.videos.length,
          newVideos,
          existingVideos,
        })

        totalVideos += result.videos.length
        totalNewVideos += newVideos
        totalExistingVideos += existingVideos
      } catch (error: any) {
        console.error(`Error fetching latest videos for channel ${channel.youtube_channel_id}:`, error)
        results.push({
          channelId: channel.youtube_channel_id,
          channelTitle: channel.channel_title || 'Unknown Channel',
          videosFetched: 0,
          newVideos: 0,
          existingVideos: 0,
          error: error.message || 'Failed to fetch videos',
        })
      }
    }

    const channelsWithErrors = results.filter(r => r.error).length
    const channelsProcessed = results.length

    res.json({
      message: `Processed ${channelsProcessed} channels: ${totalVideos} videos fetched (${totalNewVideos} new, ${totalExistingVideos} existing)${channelsWithErrors > 0 ? `, ${channelsWithErrors} channel(s) had errors` : ''}`,
      channelsProcessed,
      totalVideos,
      newVideos: totalNewVideos,
      existingVideos: totalExistingVideos,
      channelsWithErrors,
      results,
    })
  } catch (error: any) {
    console.error('Error refreshing channel list:', error)
    if (error.code === 'AUTHENTICATION_REQUIRED') {
      return res.status(401).json({ 
        error: 'YouTube authentication required',
        message: 'Please connect your YouTube account in Settings to refresh videos.',
        requiresAuth: true,
        settingsUrl: '/settings'
      })
    }
    res.status(500).json({ error: error.message || 'Failed to refresh channel list' })
  }
})

// Get videos for list
router.get('/:id/videos', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    const { type } = req.query
    
    if (type === 'watch_later') {
      const videos = channelListQueries.getVideosForList(id, 'watch_later')
      
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
      
      res.json({ videos: videosWithDetails })
    } else if (type === 'latest') {
      const videos = channelListQueries.getVideosForList(id, 'latest')
      
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
      
      res.json({ videos: videosWithDetails })
    } else if (type === 'liked') {
      // Placeholder for future implementation
      res.json({ videos: [], message: 'Liked videos feature coming soon' })
    } else {
      res.status(400).json({ error: 'Invalid type. Must be watch_later, latest, or liked' })
    }
  } catch (error) {
    console.error('Error fetching list videos:', error)
    res.status(500).json({ error: 'Failed to fetch list videos' })
  }
})

export default router

