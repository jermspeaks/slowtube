import express from 'express'
import { tvShowQueries, episodeQueries, tvShowStateQueries } from '../services/database.js'

const router = express.Router()

// Get TV dashboard sections
router.get('/sections', (req, res) => {
  try {
    const sections: Array<{
      id: string
      type: 'tv_shows_last_aired' | 'upcoming_episodes' | 'recently_aired_episodes'
      title: string
      description: string
      tvShows?: any[]
      episodes?: any[]
    }> = []

    // Section 1: TV Shows (Last Aired)
    const tvShows = tvShowQueries.getAll(
      true, // includeArchived
      undefined, // search
      'last_episode_date', // sortBy
      'desc', // sortOrder
      20, // limit
      0, // offset
      undefined, // status
      'unarchived', // archiveFilter - only show unarchived
      'hideCompleted' // completionFilter
    )

    // Add archived and started status to each TV show
    // The getAll method returns is_started but not is_archived, so we need to fetch it
    const tvShowsWithState = tvShows.map(tvShow => {
      const state = tvShowStateQueries.getByTVShowId(tvShow.id)
      return {
        ...tvShow,
        is_archived: state?.is_archived === 1 || false,
        // is_started is already included from getAll, but ensure it's a boolean
        is_started: tvShow.is_started !== undefined ? tvShow.is_started : (state?.is_started === 1 || false),
      }
    })

    sections.push({
      id: 'tv_shows_last_aired',
      type: 'tv_shows_last_aired',
      title: 'TV Shows (Last Aired)',
      description: 'TV shows sorted by most recently aired episode',
      tvShows: tvShowsWithState,
    })

    // Section 2: Upcoming Episodes (next 30 days)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to midnight for date comparison
    const nextMonth = new Date(today)
    nextMonth.setDate(nextMonth.getDate() + 30)
    
    const todayStr = today.toISOString().split('T')[0]
    const nextMonthStr = nextMonth.toISOString().split('T')[0]

    const upcomingEpisodes = episodeQueries.getByDateRange(todayStr, nextMonthStr, true) // hideArchived = true
      .filter(ep => {
        // Filter to only future episodes (air_date > today)
        if (!ep.air_date) return false
        const airDate = new Date(ep.air_date)
        airDate.setHours(0, 0, 0, 0) // Set to midnight for date comparison
        return airDate > today
      })
      .slice(0, 20) // Limit to 20

    sections.push({
      id: 'upcoming_episodes',
      type: 'upcoming_episodes',
      title: 'Upcoming Episodes',
      description: 'Episodes airing in the next month',
      episodes: upcomingEpisodes,
    })

    // Section 3: Recently Aired Episodes (past 30 days)
    const pastMonth = new Date(today)
    pastMonth.setDate(pastMonth.getDate() - 30)
    
    const pastMonthStr = pastMonth.toISOString().split('T')[0]

    const recentlyAiredEpisodes = episodeQueries.getByDateRange(pastMonthStr, todayStr, true) // hideArchived = true
      .filter(ep => {
        // Filter to only past episodes (air_date <= today)
        if (!ep.air_date) return false
        const airDate = new Date(ep.air_date)
        airDate.setHours(0, 0, 0, 0) // Set to midnight for date comparison
        return airDate <= today
      })
      .slice(0, 20) // Limit to 20
      .reverse() // Most recent first

    sections.push({
      id: 'recently_aired_episodes',
      type: 'recently_aired_episodes',
      title: 'Recently Aired',
      description: 'Episodes that aired in the past month',
      episodes: recentlyAiredEpisodes,
    })

    res.json({ sections })
  } catch (error) {
    console.error('Error fetching TV dashboard sections:', error)
    res.status(500).json({ error: 'Failed to fetch TV dashboard sections' })
  }
})

export default router
