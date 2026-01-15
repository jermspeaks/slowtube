import express from 'express'
import { channelListQueries, channelQueries, tagQueries, commentQueries } from '../services/database.js'
import { processLatestVideosFromChannel } from './channels.js'
import { getAuthenticatedClient } from './auth.js'

const router = express.Router()

// Create a channel group
router.post('/', (req, res) => {
  try {
    const { name, description, color, display_on_home } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const displayOnHome = display_on_home !== undefined ? (display_on_home ? 1 : 0) : undefined
    const listId = channelListQueries.create(name.trim(), description || null, color || null, displayOnHome)
    const list = channelListQueries.getById(listId)
    
    if (!list) {
      return res.status(500).json({ error: 'Failed to create list' })
    }

    res.status(201).json(list)
  } catch (error: any) {
    console.error('Error creating channel group:', error)
    res.status(500).json({ error: error.message || 'Failed to create channel group' })
  }
})

// Get all channel groups
router.get('/', (req, res) => {
  try {
    const { display_on_home } = req.query
    const displayOnHome = display_on_home === 'true' ? true : display_on_home === 'false' ? false : undefined
    const lists = channelListQueries.getAll(displayOnHome)
    res.json(lists)
  } catch (error) {
    console.error('Error fetching channel groups:', error)
    res.status(500).json({ error: 'Failed to fetch channel groups' })
  }
})

// Get channel group by ID
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
    console.error('Error fetching channel group:', error)
    res.status(500).json({ error: 'Failed to fetch channel group' })
  }
})

// Update channel group
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
      updates.display_on_home = display_on_home ? 1 : 0
    }

    const changes = channelListQueries.update(id, updates)
    if (changes === 0 && Object.keys(updates).length > 0) {
      return res.status(500).json({ error: 'Failed to update list' })
    }

    const updatedList = channelListQueries.getById(id)
    res.json(updatedList)
  } catch (error: any) {
    console.error('Error updating channel group:', error)
    res.status(500).json({ error: error.message || 'Failed to update channel group' })
  }
})

// Delete channel group
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
      return res.status(500).json({ error: 'Failed to delete list' })
    }
  } catch (error) {
    console.error('Error deleting channel group:', error)
    res.status(500).json({ error: 'Failed to delete channel group' })
  }
})

// Add channels to group
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
    console.error('Error adding channels to group:', error)
    res.status(500).json({ error: error.message || 'Failed to add channels to group' })
  }
})

// Remove channel from group
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
      return res.status(404).json({ error: 'Channel not found in list' })
    }
  } catch (error) {
    console.error('Error removing channel from list:', error)
    res.status(500).json({ error: 'Failed to remove channel from list' })
  }
})

// Refresh group - fetch latest videos from all channels in group
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
    res.status(500).json({ error: error.message || 'Failed to refresh channel group' })
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

    const { type, sortBy, sortOrder, stateFilter, shortsFilter } = req.query
    
    // Validate shortsFilter
    let validShortsFilter: 'all' | 'exclude' | 'only' | undefined = undefined
    if (shortsFilter === 'all' || shortsFilter === 'exclude' || shortsFilter === 'only') {
      validShortsFilter = shortsFilter
    }
    
    if (type === 'watch_later') {
      // Validate stateFilter for watch_later
      let validStateFilter: 'all' | 'exclude_archived' | 'feed' | 'inbox' | 'archive' | undefined = undefined
      if (stateFilter === 'all' || stateFilter === 'exclude_archived' || stateFilter === 'feed' || stateFilter === 'inbox' || stateFilter === 'archive') {
        validStateFilter = stateFilter
      }
      
      // Validate sortBy and sortOrder for watch_later videos
      let validSortBy: 'title' | 'added_to_playlist_at' | 'published_at' | undefined = undefined
      if (sortBy === 'title' || sortBy === 'added_to_playlist_at' || sortBy === 'published_at') {
        validSortBy = sortBy
      }
      
      let validSortOrder: 'asc' | 'desc' | undefined = undefined
      if (sortOrder === 'asc' || sortOrder === 'desc') {
        validSortOrder = sortOrder
      }
      
      const videos = channelListQueries.getVideosForList(id, 'watch_later', validSortBy, validSortOrder, validStateFilter, validShortsFilter)
      
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
      // Validate sortBy and sortOrder for latest videos
      let validSortBy: 'title' | 'added_to_latest_at' | 'published_at' | undefined = undefined
      if (sortBy === 'title' || sortBy === 'added_to_latest_at' || sortBy === 'published_at') {
        validSortBy = sortBy
      }
      
      let validSortOrder: 'asc' | 'desc' | undefined = undefined
      if (sortOrder === 'asc' || sortOrder === 'desc') {
        validSortOrder = sortOrder
      }
      
      // Default to 'exclude' for latest videos if not specified
      const effectiveShortsFilter = validShortsFilter || 'exclude'
      
      const videos = channelListQueries.getVideosForList(id, 'latest', validSortBy, validSortOrder, undefined, effectiveShortsFilter)
      
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
      return res.status(400).json({ error: 'Invalid type. Must be watch_later, latest, or liked' })
    }
  } catch (error) {
    console.error('Error fetching group videos:', error)
    res.status(500).json({ error: 'Failed to fetch group videos' })
  }
})

// Toggle display on home for a channel group
router.patch('/:id/display-on-home', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid list ID' })
    }

    const list = channelListQueries.getById(id)
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    const { display_on_home } = req.body
    if (typeof display_on_home !== 'boolean') {
      return res.status(400).json({ error: 'display_on_home must be a boolean' })
    }

    const changes = channelListQueries.updateDisplayOnHome(id, display_on_home)
    if (changes === 0) {
      return res.status(500).json({ error: 'Failed to update display on home' })
    }

    const updatedList = channelListQueries.getById(id)
    res.json(updatedList)
  } catch (error: any) {
    console.error('Error updating display on home:', error)
    res.status(500).json({ error: error.message || 'Failed to update display on home' })
  }
})

// Reorder channel groups
router.patch('/reorder', (req, res) => {
  try {
    const { groupIds } = req.body
    if (!Array.isArray(groupIds)) {
      return res.status(400).json({ error: 'groupIds must be an array' })
    }
    if (!groupIds.every(id => typeof id === 'number')) {
      return res.status(400).json({ error: 'All groupIds must be numbers' })
    }
    if (groupIds.length === 0) {
      return res.status(400).json({ error: 'groupIds array cannot be empty' })
    }

    // Verify all group IDs exist
    const allGroups = channelListQueries.getAll()
    const allGroupIds = allGroups.map(g => g.id)
    const invalidIds = groupIds.filter((id: number) => !allGroupIds.includes(id))
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid group IDs: ${invalidIds.join(', ')}` })
    }

    // Verify all groups are included
    if (groupIds.length !== allGroupIds.length) {
      return res.status(400).json({ error: 'All channel groups must be included in reorder' })
    }

    channelListQueries.reorderChannelGroups(groupIds)
    const updatedGroups = channelListQueries.getAll()
    res.json(updatedGroups)
  } catch (error: any) {
    console.error('Error reordering channel groups:', error)
    res.status(500).json({ error: error.message || 'Failed to reorder channel groups' })
  }
})

export default router

