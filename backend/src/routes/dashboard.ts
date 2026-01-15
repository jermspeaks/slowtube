import express from 'express'
import { channelListQueries, videoQueries, tagQueries, commentQueries } from '../services/database.js'

const router = express.Router()

// Get dashboard sections
router.get('/sections', (req, res) => {
  try {
    const sections: Array<{
      id: string
      type: 'inbox' | 'feed' | 'channel_group'
      title: string
      description: string
      videos: any[]
      groupId?: number
      groupName?: string
      groupColor?: string | null
    }> = []

    // Section 1: Latest Videos (Inbox)
    const inboxVideos = videoQueries.getAll(
      'inbox',
      undefined,
      'added_to_playlist_at',
      'desc',
      undefined,
      20,
      0
    )
    
    const inboxVideosWithDetails = inboxVideos.map(video => {
      const tags = tagQueries.getByVideoId(video.id)
      const comments = commentQueries.getByVideoId(video.id)
      return {
        ...video,
        tags,
        comments,
      }
    })

    sections.push({
      id: 'inbox',
      type: 'inbox',
      title: 'Latest Videos',
      description: 'Videos in your inbox',
      videos: inboxVideosWithDetails,
    })

    // Section 2: From Feed
    const feedVideos = videoQueries.getAll(
      'feed',
      undefined,
      'added_to_playlist_at',
      'desc',
      undefined,
      20,
      0
    )
    
    const feedVideosWithDetails = feedVideos.map(video => {
      const tags = tagQueries.getByVideoId(video.id)
      const comments = commentQueries.getByVideoId(video.id)
      return {
        ...video,
        tags,
        comments,
      }
    })

    sections.push({
      id: 'feed',
      type: 'feed',
      title: 'From Feed',
      description: 'Videos from your feed',
      videos: feedVideosWithDetails,
    })

    // Section 3+: Channel Groups with display_on_home=true
    const displayedGroups = channelListQueries.getAll(true)
    
    for (const group of displayedGroups) {
      const groupVideos = channelListQueries.getVideosForList(
        group.id,
        'watch_later',
        'added_to_playlist_at',
        'desc',
        'exclude_archived',
        undefined
      ).slice(0, 20) // Limit to 20 videos per group
      
      const groupVideosWithDetails = groupVideos.map(video => {
        const tags = tagQueries.getByVideoId(video.id)
        const comments = commentQueries.getByVideoId(video.id)
        return {
          ...video,
          tags,
          comments,
        }
      })

      sections.push({
        id: `group-${group.id}`,
        type: 'channel_group',
        title: group.name,
        description: `Watch later videos from ${group.name}`,
        videos: groupVideosWithDetails,
        groupId: group.id,
        groupName: group.name,
        groupColor: group.color,
      })
    }

    res.json({ sections })
  } catch (error) {
    console.error('Error fetching dashboard sections:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard sections' })
  }
})

export default router
