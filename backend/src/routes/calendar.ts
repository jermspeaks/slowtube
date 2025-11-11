import express from 'express'
import { episodeQueries } from '../services/database.js'

const router = express.Router()

// Get episodes for calendar view
router.get('/episodes', (req, res) => {
  try {
    const { startDate, endDate, hideArchived } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const hideArchivedBool = hideArchived === 'true' || hideArchived === '1'

    // Validate date format (YYYY-MM-DD)
    const startDateStr = String(startDate)
    const endDateStr = String(endDate)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' })
    }

    const episodes = episodeQueries.getByDateRange(startDateStr, endDateStr, hideArchivedBool)

    // Group episodes by date
    const episodesByDate: Record<string, typeof episodes> = {}
    
    for (const episode of episodes) {
      if (!episode.air_date) continue
      
      const dateKey = episode.air_date.split('T')[0] // Get just the date part
      if (!episodesByDate[dateKey]) {
        episodesByDate[dateKey] = []
      }
      episodesByDate[dateKey].push(episode)
    }

    res.json({
      episodes: episodesByDate,
      total: episodes.length,
    })
  } catch (error) {
    console.error('Error fetching calendar episodes:', error)
    res.status(500).json({ error: 'Failed to fetch calendar episodes' })
  }
})

export default router

