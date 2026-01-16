import express from 'express'
import { channelQueries, videoQueries, tagQueries, commentQueries, videoStateQueries } from '../services/database.js'
import { fetchLatestVideosFromChannel, fetchSubscribedChannels, fetchChannelDetailsFromYouTube } from '../services/youtube.js'
import { getAuthenticatedClient } from './auth.js'
import { parseDuration } from '../utils/duration.js'

const router = express.Router()

// Get all channels with optional filter
router.get('/', (req, res) => {
  try {
    const { filter, page, limit, sortBy, sortOrder, notInAnyList } = req.query
    
    let filterType: 'subscribed' | 'watch_later' | undefined = undefined
    if (filter === 'subscribed' || filter === 'watch_later') {
      filterType = filter
    }
    
    // Validate sortBy and sortOrder
    let validSortBy: 'channel_title' | 'updated_at' | 'last_video_date' | undefined = undefined
    if (sortBy === 'channel_title' || sortBy === 'updated_at' || sortBy === 'last_video_date') {
      validSortBy = sortBy
    }
    
    let validSortOrder: 'asc' | 'desc' | undefined = undefined
    if (sortOrder === 'asc' || sortOrder === 'desc') {
      validSortOrder = sortOrder
    }
    
    // Parse notInAnyList filter
    const notInAnyListFilter = notInAnyList === 'true' || notInAnyList === true
    
    // For subscribed filter, apply pagination
    if (filterType === 'subscribed') {
      const pageNum = page ? parseInt(page as string, 10) : 1
      const limitNum = limit ? parseInt(limit as string, 10) : 50
      const offset = (pageNum - 1) * limitNum
      
      // For subscribed channels, only allow channel_title and updated_at
      const subscribedSortBy = (validSortBy === 'channel_title' || validSortBy === 'updated_at') ? validSortBy : undefined
      
      const channels = channelQueries.getAll(filterType, limitNum, offset, subscribedSortBy, validSortOrder, notInAnyListFilter)
      const total = channelQueries.getAllCount(filterType, notInAnyListFilter)
      const totalPages = Math.ceil(total / limitNum)
      
      res.json({
        channels,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      })
    } else if (filterType === 'watch_later') {
      // For watch_later filter, get channels with counts (no pagination)
      const channelsWithCounts = channelQueries.getChannelsWithWatchLaterCount(validSortBy, validSortOrder, notInAnyListFilter)
      res.json(channelsWithCounts)
    } else {
      // For other filters, return all channels (backward compatibility)
      const otherSortBy = (validSortBy === 'channel_title' || validSortBy === 'updated_at') ? validSortBy : undefined
      const channels = channelQueries.getAll(filterType, undefined, undefined, otherSortBy, validSortOrder, notInAnyListFilter)
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
    const { type, sortBy, sortOrder } = req.query
    
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
      // Validate sortBy and sortOrder for latest videos
      let validSortBy: 'title' | 'added_to_latest_at' | 'published_at' | undefined = undefined
      if (sortBy === 'title' || sortBy === 'added_to_latest_at' || sortBy === 'published_at') {
        validSortBy = sortBy
      }
      
      let validSortOrder: 'asc' | 'desc' | undefined = undefined
      if (sortOrder === 'asc' || sortOrder === 'desc') {
        validSortOrder = sortOrder
      }
      
      // Get latest videos for this channel (videos with added_to_latest_at set and no state)
      const videos = channelQueries.getLatestVideosByChannel(channelId, validSortBy, validSortOrder)
      
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
    console.error('Error fetching channel videos:', error)
    res.status(500).json({ error: 'Failed to fetch channel videos' })
  }
})

// Helper function to process and save latest videos from a channel
export async function processLatestVideosFromChannel(
  channelId: string,
  fetchLimit: number = 50
): Promise<{
  videos: Array<{
    id: number
    youtube_id: string
    title: string
    state: 'feed' | 'inbox' | 'archive' | null
    isNew: boolean
  }>
  error?: string
}> {
  try {
    // Fetch latest videos from YouTube API
    const latestVideos = await fetchLatestVideosFromChannel(channelId, fetchLimit)

    const savedVideos: Array<{
      id: number
      youtube_id: string
      title: string
      state: 'feed' | 'inbox' | 'archive' | null
      isNew: boolean
    }> = []

    // Process each video
    for (const videoDetails of latestVideos) {
      if (!videoDetails.id) continue

      // Check if video already exists
      const existingVideo = videoQueries.getByYoutubeId(videoDetails.id)

      if (existingVideo) {
        // Get current state - preserve existing state, but set to 'feed' if null
        const currentState = videoStateQueries.getByVideoId(existingVideo.id)
        let state = currentState?.state || null
        
        // If video has no state, set it to 'feed' when refreshing latest videos
        if (state === null) {
          videoStateQueries.setState(existingVideo.id, 'feed')
          state = 'feed'
        }

        // Set timestamp for latest videos
        const latestTimestamp = new Date().toISOString()

        // Update existing video metadata but preserve state
        const updateData: any = {
          title: videoDetails.title,
          description: videoDetails.description,
          channel_title: videoDetails.channelTitle,
          youtube_channel_id: videoDetails.channelId,
          published_at: videoDetails.publishedAt,
          duration: videoDetails.duration ? parseDuration(videoDetails.duration) : null,
          fetch_status: 'completed',
          youtube_url: `https://www.youtube.com/watch?v=${videoDetails.id}`,
          added_to_latest_at: latestTimestamp, // Set timestamp for latest videos
        }

        // Set added_to_playlist_at if it's NULL (preserve existing values)
        if (existingVideo.added_to_playlist_at === null) {
          updateData.added_to_playlist_at = latestTimestamp
        }

        // Update thumbnail if we got a better one
        if (videoDetails.thumbnails.medium?.url || videoDetails.thumbnails.high?.url || videoDetails.thumbnails.default?.url) {
          updateData.thumbnail_url = videoDetails.thumbnails.medium?.url 
            || videoDetails.thumbnails.high?.url 
            || videoDetails.thumbnails.default?.url
        }

        videoQueries.update(existingVideo.id, updateData)

        savedVideos.push({
          id: existingVideo.id,
          youtube_id: videoDetails.id,
          title: videoDetails.title,
          state: state,
          isNew: false,
        })
      } else {
        // Create new video
        const latestTimestamp = new Date().toISOString()
        const videoData = {
          youtube_id: videoDetails.id,
          title: videoDetails.title,
          description: videoDetails.description,
          thumbnail_url: videoDetails.thumbnails.medium?.url 
            || videoDetails.thumbnails.high?.url 
            || videoDetails.thumbnails.default?.url 
            || null,
          duration: videoDetails.duration ? parseDuration(videoDetails.duration) : null,
          published_at: videoDetails.publishedAt,
          added_to_playlist_at: latestTimestamp, // Set to same timestamp as added_to_latest_at
          fetch_status: 'completed' as const,
          channel_title: videoDetails.channelTitle,
          youtube_channel_id: videoDetails.channelId,
          youtube_url: `https://www.youtube.com/watch?v=${videoDetails.id}`,
          added_to_latest_at: latestTimestamp, // Set timestamp for latest videos
        }

        const videoId = videoQueries.create(videoData)

        // Set state to 'feed' for new videos fetched from latest
        videoStateQueries.setState(videoId, 'feed')

        savedVideos.push({
          id: videoId,
          youtube_id: videoDetails.id,
          title: videoDetails.title,
          state: 'feed',
          isNew: true,
        })
      }
    }

    return { videos: savedVideos }
  } catch (error: any) {
    // Catch errors and return them in the error field instead of throwing
    console.error(`Error processing latest videos for channel ${channelId}:`, error)
    return {
      videos: [],
      error: error.message || 'Failed to fetch and process latest videos',
    }
  }
}

// Fetch latest videos from a channel and save them to database
router.post('/:channelId/fetch-latest', async (req, res) => {
  try {
    const { channelId } = req.params
    const { limit } = req.query
    const fetchLimit = limit ? parseInt(limit as string, 10) : 50

    if (isNaN(fetchLimit) || fetchLimit < 1 || fetchLimit > 50) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 50.' })
    }

    // Verify channel exists
    const channel = channelQueries.getByChannelId(channelId)
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const result = await processLatestVideosFromChannel(channelId, fetchLimit)

    if (result.error) {
      return res.status(500).json({ error: result.error })
    }

    res.json({
      message: `Fetched and saved ${result.videos.length} videos`,
      videos: result.videos,
    })
  } catch (error: any) {
    console.error('Error fetching and saving latest videos:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch and save latest videos' })
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

// Fetch latest videos from all subscribed channels
router.post('/fetch-latest-all', async (req, res) => {
  try {
    // Check if authenticated first
    try {
      await getAuthenticatedClient()
    } catch (authError: any) {
      if (authError.code === 'AUTHENTICATION_REQUIRED') {
        return res.status(401).json({ 
          error: 'YouTube authentication required',
          message: 'Please connect your YouTube account in Settings to refresh latest videos.',
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

    // Get all subscribed channels
    const subscribedChannels = channelQueries.getAll('subscribed')
    
    if (subscribedChannels.length === 0) {
      return res.json({
        message: 'No subscribed channels found',
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
    for (const channel of subscribedChannels) {
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
    console.error('Error fetching latest videos from all subscribed channels:', error)
    if (error.code === 'AUTHENTICATION_REQUIRED') {
      return res.status(401).json({ 
        error: 'YouTube authentication required',
        message: 'Please connect your YouTube account in Settings to refresh latest videos.',
        requiresAuth: true,
        settingsUrl: '/settings'
      })
    }
    res.status(500).json({ error: error.message || 'Failed to fetch latest videos from all subscribed channels' })
  }
})

export default router

