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

    // Expand date range by 1 day on each side to account for timezone differences
    // This ensures we get all episodes that might appear on the requested dates
    // in any timezone. The frontend will filter them correctly using timezone-aware dates.
    const expandedStartDate = new Date(startDateStr)
    expandedStartDate.setDate(expandedStartDate.getDate() - 1)
    const expandedStartDateStr = expandedStartDate.toISOString().split('T')[0]

    const expandedEndDate = new Date(endDateStr)
    expandedEndDate.setDate(expandedEndDate.getDate() + 1)
    const expandedEndDateStr = expandedEndDate.toISOString().split('T')[0]

    const episodes = episodeQueries.getByDateRange(expandedStartDateStr, expandedEndDateStr, hideArchivedBool)

    // Return flat array - frontend will handle timezone-aware grouping
    res.json({
      episodes: episodes,
      total: episodes.length,
    })
  } catch (error) {
    console.error('Error fetching calendar episodes:', error)
    res.status(500).json({ error: 'Failed to fetch calendar episodes' })
  }
})

export default router

