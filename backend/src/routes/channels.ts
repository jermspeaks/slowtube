import express from 'express'
import { channelQueries, videoQueries, tagQueries, commentQueries } from '../services/database.js'
import { fetchLatestVideosFromChannel, fetchSubscribedChannels, fetchChannelDetailsFromYouTube } from '../services/youtube.js'
import { getAuthenticatedClient } from './auth.js'

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

// Fetch and sync subscribed channels from YouTube
router.post('/sync-subscriptions', async (req, res) => {
  try {
    // Check if authenticated first
    try {
      await getAuthenticatedClient()
    } catch (authError: any) {
      if (authError.code === 'AUTHENTICATION_REQUIRED') {
        return res.status(401).json({ 
          error: 'YouTube authentication required',
          message: 'Please connect your YouTube account in Settings to sync subscriptions.',
          requiresAuth: true,
          settingsUrl: '/settings'
        })
      }
      throw authError
    }

    const subscribedChannels = await fetchSubscribedChannels()
    
    // Get authenticated client for fetching additional channel details
    const authClient = await getAuthenticatedClient()
    
    // Collect channel IDs to fetch additional details (subscriber count, etc.)
    const channelIds = subscribedChannels.map(ch => ch.channelId)
    
    // Fetch additional channel details in batches (max 50 per batch)
    const channelDetailsMap = new Map<string, {
      id: string
      title: string | null
      description: string | null
      thumbnailUrl: string | null
      subscriberCount: number | null
    } | null>()
    
    // Process in batches of 50
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50)
      const batchDetails = await fetchChannelDetailsFromYouTube(batch, authClient)
      batchDetails.forEach((details, channelId) => {
        channelDetailsMap.set(channelId, details)
      })
    }
    
    let created = 0
    let updated = 0
    
    // Process each subscribed channel
    for (const subChannel of subscribedChannels) {
      const existingChannel = channelQueries.getByChannelId(subChannel.channelId)
      const channelDetails = channelDetailsMap.get(subChannel.channelId)
      
      if (existingChannel) {
        // Update existing channel
        const updateData: any = {
          channel_title: channelDetails?.title || subChannel.channelTitle || existingChannel.channel_title,
          description: channelDetails?.description || subChannel.description || existingChannel.description,
          thumbnail_url: channelDetails?.thumbnailUrl || subChannel.thumbnailUrl || existingChannel.thumbnail_url,
          subscriber_count: channelDetails?.subscriberCount || existingChannel.subscriber_count,
          is_subscribed: 1, // Mark as subscribed
        }
        
        channelQueries.updateByChannelId(subChannel.channelId, updateData)
        updated++
      } else {
        // Create new channel
        channelQueries.create({
          youtube_channel_id: subChannel.channelId,
          channel_title: channelDetails?.title || subChannel.channelTitle || 'Unknown Channel',
          description: channelDetails?.description || subChannel.description || null,
          thumbnail_url: channelDetails?.thumbnailUrl || subChannel.thumbnailUrl || null,
          subscriber_count: channelDetails?.subscriberCount || null,
          is_subscribed: 1,
          custom_tags: null,
        })
        created++
      }
    }
    
    const synced = subscribedChannels.length
    
    res.json({
      synced,
      created,
      updated,
      message: `Successfully synced ${synced} subscribed channels (${created} created, ${updated} updated)`
    })
    
  } catch (error: any) {
    console.error('Error syncing subscriptions:', error)
    if (error.code === 'AUTHENTICATION_REQUIRED') {
      return res.status(401).json({ 
        error: 'YouTube authentication required',
        message: 'Please connect your YouTube account in Settings to sync subscriptions.',
        requiresAuth: true,
        settingsUrl: '/settings'
      })
    }
    res.status(500).json({ error: 'Failed to sync subscriptions' })
  }
})

export default router

