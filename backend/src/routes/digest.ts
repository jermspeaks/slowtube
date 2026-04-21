import express from 'express'
import db from '../config/db.js'
import { videoQueries, videoStateQueries } from '../services/database.js'
import { fetchLatestVideosFromChannel, fetchChannelDetailsFromYouTube, resolveChannelFromUrl } from '../services/youtube.js'
import { parseDuration } from '../utils/duration.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// ─── Types ────────────────────────────────────────────────────────────────────

interface DigestChannel {
  id: number
  youtube_channel_id: string
  channel_title: string | null
  thumbnail_url: string | null
  added_from: string | null
  created_at: string
}

interface DigestItem {
  id: number
  youtube_video_id: string
  youtube_channel_id: string
  channel_title: string | null
  title: string
  description: string | null
  thumbnail_url: string | null
  duration: string | null
  published_at: string | null
  fetched_at: string
  is_dismissed: number
}

// ─── Digest Channel Routes ────────────────────────────────────────────────────

// GET /api/digest/channels — list all digest channels
router.get('/channels', (req, res) => {
  try {
    const channels = db.prepare(`
      SELECT dc.*,
        (SELECT COUNT(*) FROM digest_items di
         WHERE di.youtube_channel_id = dc.youtube_channel_id AND di.is_dismissed = 0) as pending_count
      FROM digest_channels dc
      ORDER BY dc.created_at DESC
    `).all() as (DigestChannel & { pending_count: number })[]

    res.json({ channels })
  } catch (error: any) {
    logger.error('Error fetching digest channels:', error)
    res.status(500).json({ error: 'Failed to fetch digest channels' })
  }
})

// POST /api/digest/channels — add channel(s) to digest
router.post('/channels', async (req, res) => {
  try {
    const { youtubeChannelIds, addedFrom } = req.body as {
      youtubeChannelIds: string[]
      addedFrom?: 'subscribed' | 'watch_later' | 'liked' | 'manual'
    }

    if (!youtubeChannelIds || !Array.isArray(youtubeChannelIds) || youtubeChannelIds.length === 0) {
      return res.status(400).json({ error: 'youtubeChannelIds array is required' })
    }

    const validAddedFrom = addedFrom || 'manual'

    // Fetch channel details from YouTube for any channels we don't know about
    const channelsToFetch = youtubeChannelIds.filter(id => {
      const existing = db.prepare('SELECT id FROM digest_channels WHERE youtube_channel_id = ?').get(id)
      return !existing
    })

    let channelDetailsMap = new Map<string, { title: string | null; thumbnailUrl: string | null }>()

    if (channelsToFetch.length > 0) {
      try {
        const details = await fetchChannelDetailsFromYouTube(channelsToFetch)
        for (const [id, detail] of details) {
          channelDetailsMap.set(id, {
            title: detail?.title || null,
            thumbnailUrl: detail?.thumbnailUrl || null,
          })
        }
      } catch (err: any) {
        logger.warn('Could not fetch channel details from YouTube, using channel ID as title:', err.message)
      }
    }

    // Also pull existing channel titles from the channels table
    for (const channelId of youtubeChannelIds) {
      if (!channelDetailsMap.has(channelId)) {
        const existingChannel = db.prepare('SELECT channel_title, thumbnail_url FROM channels WHERE youtube_channel_id = ?').get(channelId) as { channel_title: string | null; thumbnail_url: string | null } | undefined
        if (existingChannel) {
          channelDetailsMap.set(channelId, {
            title: existingChannel.channel_title,
            thumbnailUrl: existingChannel.thumbnail_url,
          })
        }
      }
    }

    const insert = db.prepare(`
      INSERT INTO digest_channels (youtube_channel_id, channel_title, thumbnail_url, added_from)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(youtube_channel_id) DO NOTHING
    `)

    let added = 0
    let skipped = 0

    for (const channelId of youtubeChannelIds) {
      const details = channelDetailsMap.get(channelId)
      const result = insert.run(
        channelId,
        details?.title || null,
        details?.thumbnailUrl || null,
        validAddedFrom
      )
      if (result.changes > 0) {
        added++
      } else {
        skipped++
      }
    }

    res.json({ added, skipped, message: `Added ${added} channel(s) to digest` })
  } catch (error: any) {
    logger.error('Error adding digest channels:', error)
    res.status(500).json({ error: 'Failed to add channels to digest' })
  }
})

// POST /api/digest/channels/resolve — resolve a YouTube URL or handle to channel info
router.post('/channels/resolve', async (req, res) => {
  try {
    const { url } = req.body as { url: string }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' })
    }

    const channel = await resolveChannelFromUrl(url.trim())

    if (!channel) {
      return res.status(404).json({ error: 'Could not resolve channel from the provided URL or handle' })
    }

    // Check if already in digest
    const alreadyAdded = db.prepare('SELECT id FROM digest_channels WHERE youtube_channel_id = ?').get(channel.id)

    res.json({ channel, alreadyAdded: !!alreadyAdded })
  } catch (error: any) {
    logger.error('Error resolving channel URL:', error)
    res.status(500).json({ error: error.message || 'Failed to resolve channel' })
  }
})

// DELETE /api/digest/channels/:channelId — remove channel from digest (cascade deletes items)
router.delete('/channels/:channelId', (req, res) => {
  try {
    const { channelId } = req.params

    const result = db.prepare('DELETE FROM digest_channels WHERE youtube_channel_id = ?').run(channelId)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Channel not found in digest' })
    }

    res.json({ message: 'Channel removed from digest' })
  } catch (error: any) {
    logger.error('Error removing digest channel:', error)
    res.status(500).json({ error: 'Failed to remove channel from digest' })
  }
})

// ─── Digest Feed Routes ───────────────────────────────────────────────────────

// GET /api/digest/feed — paginated list of non-dismissed digest items
router.get('/feed', (req, res) => {
  try {
    const { channelId, page, limit } = req.query

    const pageNum = page ? parseInt(page as string, 10) : 1
    const limitNum = limit ? Math.min(parseInt(limit as string, 10), 100) : 50
    const offset = (pageNum - 1) * limitNum

    let where = 'WHERE di.is_dismissed = 0'
    const params: any[] = []

    if (channelId && typeof channelId === 'string') {
      where += ' AND di.youtube_channel_id = ?'
      params.push(channelId)
    }

    const items = db.prepare(`
      SELECT di.*
      FROM digest_items di
      ${where}
      ORDER BY di.published_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset) as DigestItem[]

    const totalRow = db.prepare(`
      SELECT COUNT(*) as count FROM digest_items di ${where}
    `).get(...params) as { count: number }

    const total = totalRow.count
    const totalPages = Math.ceil(total / limitNum)

    res.json({ items, total, page: pageNum, totalPages })
  } catch (error: any) {
    logger.error('Error fetching digest feed:', error)
    res.status(500).json({ error: 'Failed to fetch digest feed' })
  }
})

// POST /api/digest/feed/refresh — fetch latest videos from all digest channels
export async function refreshDigestFeed(): Promise<{ fetched: number; channels: number; pruned: number }> {
  const channels = db.prepare('SELECT * FROM digest_channels').all() as DigestChannel[]

  if (channels.length === 0) {
    return { fetched: 0, channels: 0, pruned: 0 }
  }

  let totalFetched = 0

  for (const channel of channels) {
    try {
      const videos = await fetchLatestVideosFromChannel(channel.youtube_channel_id, 20)

      const insert = db.prepare(`
        INSERT INTO digest_items (youtube_video_id, youtube_channel_id, channel_title, title, description, thumbnail_url, duration, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(youtube_video_id) DO NOTHING
      `)

      for (const video of videos) {
        if (!video.id) continue

        const thumbnailUrl = video.thumbnails.medium?.url
          || video.thumbnails.high?.url
          || video.thumbnails.default?.url
          || null

        const durationStr = video.duration ? parseDuration(video.duration) : null

        insert.run(
          video.id,
          channel.youtube_channel_id,
          video.channelTitle || channel.channel_title,
          video.title,
          video.description,
          thumbnailUrl,
          durationStr,
          video.publishedAt
        )
        totalFetched++
      }

      logger.info(`Digest refresh: fetched ${videos.length} videos from channel ${channel.youtube_channel_id}`)
    } catch (err: any) {
      logger.error(`Digest refresh: failed to fetch from channel ${channel.youtube_channel_id}:`, err.message)
    }
  }

  // Prune items older than 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const pruneResult = db.prepare(`
    DELETE FROM digest_items WHERE fetched_at < ? AND is_dismissed = 1
  `).run(cutoff)

  // Also prune non-dismissed items older than 14 days
  const pruneOldResult = db.prepare(`
    DELETE FROM digest_items WHERE published_at < ?
  `).run(cutoff)

  const pruned = (pruneResult.changes || 0) + (pruneOldResult.changes || 0)

  logger.info(`Digest refresh complete: fetched ${totalFetched} videos from ${channels.length} channels, pruned ${pruned} old items`)

  return { fetched: totalFetched, channels: channels.length, pruned }
}

router.post('/feed/refresh', async (req, res) => {
  try {
    const result = await refreshDigestFeed()
    res.json({
      message: `Fetched ${result.fetched} new videos from ${result.channels} channels`,
      ...result,
    })
  } catch (error: any) {
    logger.error('Error refreshing digest feed:', error)
    res.status(500).json({ error: 'Failed to refresh digest feed' })
  }
})

// POST /api/digest/feed/:videoId/dismiss — mark video as dismissed
router.post('/feed/:videoId/dismiss', (req, res) => {
  try {
    const { videoId } = req.params

    const result = db.prepare('UPDATE digest_items SET is_dismissed = 1 WHERE youtube_video_id = ?').run(videoId)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Video not found in digest' })
    }

    res.json({ message: 'Video dismissed' })
  } catch (error: any) {
    logger.error('Error dismissing digest video:', error)
    res.status(500).json({ error: 'Failed to dismiss video' })
  }
})

// POST /api/digest/feed/:videoId/add-to-watch-later — save video to Watch Later
router.post('/feed/:videoId/add-to-watch-later', (req, res) => {
  try {
    const { videoId } = req.params

    // Get the digest item
    const item = db.prepare('SELECT * FROM digest_items WHERE youtube_video_id = ?').get(videoId) as DigestItem | undefined

    if (!item) {
      return res.status(404).json({ error: 'Video not found in digest' })
    }

    const now = new Date().toISOString()

    // Check if video already exists in videos table
    const existing = videoQueries.getByYoutubeId(videoId)

    let videoDbId: number

    if (existing) {
      // Update added_to_playlist_at if not already set
      if (!existing.added_to_playlist_at) {
        videoQueries.update(existing.id, { added_to_playlist_at: now })
      }
      videoDbId = existing.id
    } else {
      // Create new video record
      videoDbId = videoQueries.create({
        youtube_id: videoId,
        title: item.title,
        description: item.description,
        thumbnail_url: item.thumbnail_url,
        duration: item.duration,
        published_at: item.published_at,
        added_to_playlist_at: now,
        added_to_latest_at: null,
        fetch_status: 'completed',
        youtube_channel_id: item.youtube_channel_id,
        channel_id: null,
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
        is_liked: 0,
        liked_at: null,
      })
    }

    // Set state to 'inbox' (Watch Later inbox)
    const currentState = videoStateQueries.getByVideoId(videoDbId)
    if (!currentState) {
      videoStateQueries.setState(videoDbId, 'inbox')
    }

    // Dismiss from digest feed (so it doesn't show up again)
    db.prepare('UPDATE digest_items SET is_dismissed = 1 WHERE youtube_video_id = ?').run(videoId)

    res.json({ message: 'Video added to Watch Later', videoId: videoDbId })
  } catch (error: any) {
    logger.error('Error adding digest video to Watch Later:', error)
    res.status(500).json({ error: 'Failed to add video to Watch Later' })
  }
})

export default router
