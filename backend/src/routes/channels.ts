import express from 'express'
import { channelQueries, videoQueries, tagQueries, commentQueries } from '../services/database.js'
import { fetchLatestVideosFromChannel } from '../services/youtube.js'

const router = express.Router()

// Get all channels with optional filter
router.get('/', (req, res) => {
  try {
    const { filter } = req.query
    
    let filterType: 'subscribed' | 'watch_later' | undefined = undefined
    if (filter === 'subscribed' || filter === 'watch_later') {
      filterType = filter
    }
    
    // For watch_later filter, get channels with counts
    if (filterType === 'watch_later') {
      const channelsWithCounts = channelQueries.getChannelsWithWatchLaterCount()
      res.json(channelsWithCounts)
    } else {
      const channels = channelQueries.getAll(filterType)
      res.json(channels)
    }
  } catch (error) {
    console.error('Error fetching channels:', error)
    res.status(500).json({ error: 'Failed to fetch channels' })
  }
})

// Get channel details by YouTube channel ID
router.get('/:channelId', (req, res) => {
  try {
    const { channelId } = req.params
    
    const channel = channelQueries.getByChannelId(channelId)
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json(channel)
  } catch (error) {
    console.error('Error fetching channel:', error)
    res.status(500).json({ error: 'Failed to fetch channel' })
  }
})

// Get videos for a channel
router.get('/:channelId/videos', async (req, res) => {
  try {
    const { channelId } = req.params
    const { type } = req.query
    
    // Verify channel exists
    const channel = channelQueries.getByChannelId(channelId)
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    if (type === 'watch_later') {
      // Get watch later videos for this channel
      const videos = channelQueries.getWatchLaterVideosByChannel(channelId)
      
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
      // Fetch latest videos from YouTube API
      try {
        const latestVideos = await fetchLatestVideosFromChannel(channelId)
        res.json({ videos: latestVideos })
      } catch (error: any) {
        console.error('Error fetching latest videos:', error)
        res.status(500).json({ error: 'Failed to fetch latest videos from YouTube API' })
      }
    } else if (type === 'liked') {
      // Placeholder for future implementation
      res.json({ videos: [], message: 'Liked videos feature coming soon' })
    } else {
      res.status(400).json({ error: 'Invalid type. Must be watch_later, latest, or liked' })
    }
  } catch (error) {
    console.error('Error fetching channel videos:', error)
    res.status(500).json({ error: 'Failed to fetch channel videos' })
  }
})

// Subscribe to a channel
router.post('/:channelId/subscribe', (req, res) => {
  try {
    const { channelId } = req.params
    
    // Verify channel exists
    const channel = channelQueries.getByChannelId(channelId)
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    const changes = channelQueries.subscribe(channelId)
    
    if (changes === 0) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json({ message: 'Channel subscribed successfully' })
  } catch (error) {
    console.error('Error subscribing to channel:', error)
    res.status(500).json({ error: 'Failed to subscribe to channel' })
  }
})

// Unsubscribe from a channel
router.delete('/:channelId/subscribe', (req, res) => {
  try {
    const { channelId } = req.params
    
    // Verify channel exists
    const channel = channelQueries.getByChannelId(channelId)
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    const changes = channelQueries.unsubscribe(channelId)
    
    if (changes === 0) {
      return res.status(404).json({ error: 'Channel not found' })
    }
    
    res.json({ message: 'Channel unsubscribed successfully' })
  } catch (error) {
    console.error('Error unsubscribing from channel:', error)
    res.status(500).json({ error: 'Failed to unsubscribe from channel' })
  }
})

export default router

