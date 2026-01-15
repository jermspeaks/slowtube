import express from 'express'
import { movieQueries, moviePlaylistQueries } from '../services/database.js'

const router = express.Router()

// Get Movie dashboard sections
router.get('/sections', (req, res) => {
  try {
    const sections: Array<{
      id: string
      type: 'all_movies' | 'upcoming_movies' | 'starred_movies' | 'movie_playlist'
      title: string
      description: string
      movies?: any[]
      playlistId?: number
    }> = []

    // Section 1: All Movies (Latest)
    const allMovies = movieQueries.getAll(
      undefined, // search
      'created_at', // sortBy - we'll sort by saved_at on frontend if needed
      'desc', // sortOrder
      20, // limit
      0, // offset
      'unarchived', // archiveFilter
      undefined, // starredFilter
      undefined, // watchedFilter
      undefined // playlistFilter
    )

    // Sort by saved_at descending, then filter out nulls
    const sortedMovies = allMovies
      .filter(movie => movie.saved_at !== null)
      .sort((a, b) => {
        if (!a.saved_at || !b.saved_at) return 0
        return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      })
      .slice(0, 20)

    sections.push({
      id: 'all_movies',
      type: 'all_movies',
      title: 'Latest Movies',
      description: 'Recently saved movies',
      movies: sortedMovies,
    })

    // Section 2: Starred Movies
    const starredMovies = movieQueries.getAll(
      undefined, // search
      'created_at', // sortBy
      'desc', // sortOrder
      20, // limit
      0, // offset
      'unarchived', // archiveFilter
      'starred', // starredFilter
      undefined, // watchedFilter
      undefined // playlistFilter
    )

    sections.push({
      id: 'starred_movies',
      type: 'starred_movies',
      title: 'Starred Movies',
      description: 'Your favorite movies',
      movies: starredMovies,
    })

    // Section 3: Upcoming Movies
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to midnight for date comparison

    const allMoviesForUpcoming = movieQueries.getAll(
      undefined, // search
      'release_date', // sortBy
      'asc', // sortOrder
      100, // limit - get more to filter
      0, // offset
      'unarchived', // archiveFilter
      undefined, // starredFilter
      undefined, // watchedFilter
      undefined // playlistFilter
    )

    const upcomingMovies = allMoviesForUpcoming
      .filter(movie => {
        if (!movie.release_date) return false
        const releaseDate = new Date(movie.release_date)
        releaseDate.setHours(0, 0, 0, 0)
        return releaseDate > today
      })
      .slice(0, 20) // Limit to 20

    sections.push({
      id: 'upcoming_movies',
      type: 'upcoming_movies',
      title: 'Upcoming Movies',
      description: 'Movies releasing in the future',
      movies: upcomingMovies,
    })

    // Section 4+: Movie Playlists with display_on_home = 1
    const playlists = moviePlaylistQueries.getAll(true) // displayOnHome = true

    for (const playlist of playlists) {
      const playlistWithMovies = moviePlaylistQueries.getById(playlist.id)
      if (playlistWithMovies && playlistWithMovies.movies.length > 0) {
        sections.push({
          id: `movie_playlist_${playlist.id}`,
          type: 'movie_playlist',
          title: playlist.name,
          description: playlist.description || `Movies in ${playlist.name}`,
          movies: playlistWithMovies.movies.slice(0, 20), // Limit to 20 movies per playlist
          playlistId: playlist.id,
        })
      }
    }

    res.json({ sections })
  } catch (error) {
    console.error('Error fetching Movie dashboard sections:', error)
    res.status(500).json({ error: 'Failed to fetch Movie dashboard sections' })
  }
})

export default router
