import express from 'express'
import multer from 'multer'
import { videoQueries, tagQueries, commentQueries, videoStateQueries, statsQueries } from '../services/database.js'
import { importVideosFromTakeout, processBatchVideoFetch } from '../services/youtube.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept JSON and CSV files
    const isJson = file.mimetype === 'application/json' || file.originalname.endsWith('.json')
    const isCsv = file.mimetype === 'text/csv' || 
                 file.mimetype === 'application/csv' || 
                 file.originalname.endsWith('.csv')
    
    if (isJson || isCsv) {
      cb(null, true)
    } else {
      cb(new Error('Only JSON and CSV files are allowed'))
    }
  },
})

// Get stats
router.get('/stats', (req, res) => {
  try {
    const channelRankings = statsQueries.getChannelRankings()
    const timeStats = statsQueries.getTimeStats()
    const channelList = statsQueries.getChannelList()
    const totalDurationSeconds = statsQueries.getTotalDuration()

    // Format total duration with days and months
    const SECONDS_PER_MINUTE = 60
    const SECONDS_PER_HOUR = 3600
    const SECONDS_PER_DAY = 86400
    const SECONDS_PER_MONTH = 2592000 // 30 days

    const months = Math.floor(totalDurationSeconds / SECONDS_PER_MONTH)
    const days = Math.floor((totalDurationSeconds % SECONDS_PER_MONTH) / SECONDS_PER_DAY)
    const hours = Math.floor((totalDurationSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)
    const minutes = Math.floor((totalDurationSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
    const seconds = totalDurationSeconds % SECONDS_PER_MINUTE

    // Format duration string
    const parts: string[] = []
    if (months > 0) parts.push(`${months}mo`)
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

    // Format time stats for frontend
    // Fill in missing hours (0-23)
    const hourData = Array.from({ length: 24 }, (_, i) => {
      const existing = timeStats.byHour.find(h => h.hour === i)
      return { hour: i, count: existing?.count || 0 }
    })

    // Fill in missing days (0-6, Sunday to Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeekData = Array.from({ length: 7 }, (_, i) => {
      const existing = timeStats.byDayOfWeek.find(d => d.day_of_week === i)
      return { day_of_week: i, day_name: dayNames[i], count: existing?.count || 0 }
    })

    // Fill in missing months (1-12)
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const existing = timeStats.byMonth.find(m => m.month === month)
      return { month, month_name: monthNames[month], count: existing?.count || 0 }
    })

    res.json({
      channelRankings: channelRankings.map((r, index) => ({
        rank: index + 1,
        channel_title: r.channel_title,
        count: r.count,
      })),
      timeStats: {
        byHour: hourData,
        byDayOfWeek: dayOfWeekData,
        byMonth: monthData,
      },
      channelList: channelList.map(c => c.channel_title),
      totalDuration: {
        seconds: totalDurationSeconds,
        months,
        days,
        hours,
        minutes,
        seconds_remainder: seconds,
        formatted: parts.join(' '),
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Get all unique channels
router.get('/channels', (req, res) => {
  try {
    const channels = videoQueries.getAllUniqueChannels()
    const channelTitles = channels.map(c => c.channel_title).filter(Boolean)
    res.json(channelTitles)
  } catch (error) {
    console.error('Error fetching channels:', error)
    res.status(500).json({ error: 'Failed to fetch channels' })
  }
})

// Get all videos with optional filters
router.get('/', (req, res) => {
  try {
    const { state, search, sortBy, sortOrder, channels, page, limit } = req.query
    
    // Validate sortBy and sortOrder
    let validSortBy: 'published_at' | 'added_to_playlist_at' | undefined
    if (sortBy === 'published_at' || sortBy === 'added_to_playlist_at') {
      validSortBy = sortBy
    }
    
    let validSortOrder: 'asc' | 'desc' | undefined
    if (sortOrder === 'asc' || sortOrder === 'desc') {
      validSortOrder = sortOrder
    }
    
    // Parse channels - can be comma-separated string or array
    let channelArray: string[] | undefined = undefined
    if (channels) {
      if (typeof channels === 'string') {
        channelArray = channels.split(',').map(c => c.trim()).filter(Boolean)
      } else if (Array.isArray(channels)) {
        channelArray = channels.map(c => String(c).trim()).filter(Boolean)
      }
    }
    
    // Parse pagination parameters
    const pageNum = page ? parseInt(String(page), 10) : 1
    const limitNum = limit ? parseInt(String(limit), 10) : 100
    const offsetNum = (pageNum - 1) * limitNum
    
    // Get total count for pagination metadata
    const total = videoQueries.getCount(
      state as string | undefined,
      search as string | undefined,
      channelArray
    )
    
    const totalPages = Math.ceil(total / limitNum)
    
    // Get paginated videos
    const videos = videoQueries.getAll(
      state as string | undefined,
      search as string | undefined,
      validSortBy,
      validSortOrder,
      channelArray,
      limitNum,
      offsetNum
    )
    
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

    res.json({
      videos: videosWithDetails,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    })
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

// Import videos from Google Takeout JSON or CSV file
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a Google Takeout JSON or CSV file.' })
    }

    // Detect file format from extension or mimetype
    const fileName = req.file.originalname.toLowerCase()
    const isCsv = fileName.endsWith('.csv') || 
                  req.file.mimetype === 'text/csv' || 
                  req.file.mimetype === 'application/csv'
    const isJson = fileName.endsWith('.json') || req.file.mimetype === 'application/json'

    if (!isCsv && !isJson) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a JSON or CSV file.' })
    }

    const fileContent = req.file.buffer.toString('utf-8')
    let result: { imported: number; updated: number }

    if (isCsv) {
      // Process CSV file
      try {
        result = importVideosFromTakeout(fileContent, 'csv')
      } catch (parseError: any) {
        console.error('Error parsing CSV file:', parseError)
        return res.status(400).json({ error: 'Invalid CSV file. Please upload a valid Google Takeout CSV file.' })
      }
    } else {
      // Process JSON file
      let jsonData: any
      try {
        jsonData = JSON.parse(fileContent)
      } catch (parseError: any) {
        console.error('Error parsing JSON file:', parseError)
        return res.status(400).json({ error: 'Invalid JSON file. Please upload a valid Google Takeout JSON file.' })
      }
      result = importVideosFromTakeout(jsonData, 'json')
    }
    
    // Count videos queued for fetching
    const fetchQueued = videoQueries.countPendingFetch()
    
    res.json({
      message: 'Videos imported successfully',
      imported: result.imported,
      updated: result.updated,
      fetchQueued,
    })
  } catch (error: any) {
    console.error('Error importing videos:', error)
    res.status(500).json({ error: error.message || 'Failed to import videos' })
  }
})

// Fetch video details from YouTube API (background job)
router.post('/fetch-details', async (req, res) => {
  try {
    // Check authentication by attempting to get authenticated client
    // This will throw if not authenticated
    try {
      const { getAuthenticatedClient } = await import('../routes/auth.js')
      await getAuthenticatedClient()
    } catch (authError: any) {
      return res.status(401).json({ error: 'Not authenticated. Please connect with YouTube.' })
    }

    // Process a batch of videos
    const batchResult = await processBatchVideoFetch(50)
    
    // Count remaining videos that need fetching
    const remaining = videoQueries.countPendingFetch()
    
    res.json({
      processed: batchResult.processed,
      unavailable: batchResult.unavailable,
      remaining,
      status: remaining > 0 ? 'pending' : 'completed',
    })
  } catch (error: any) {
    console.error('Error fetching video details:', error)
    if (error.message === 'No authenticated session found') {
      return res.status(401).json({ error: 'Not authenticated. Please connect with YouTube.' })
    }
    res.status(500).json({ error: error.message || 'Failed to fetch video details' })
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

// Delete all videos (for testing purposes)
router.delete('/all', (req, res) => {
  try {
    const deletedCount = videoQueries.deleteAll()
    res.json({ 
      message: 'All videos deleted successfully',
      deletedCount 
    })
  } catch (error) {
    console.error('Error deleting all videos:', error)
    res.status(500).json({ error: 'Failed to delete all videos' })
  }
})

export default router
