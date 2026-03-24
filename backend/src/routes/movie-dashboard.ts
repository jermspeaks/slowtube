import express from 'express'
import { movieQueries, moviePlaylistQueries } from '../services/database.js'
import { getUpcomingMovies, getNowPlayingMovies } from '../services/tmdb.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Get Movie dashboard sections
router.get('/sections', async (req, res) => {
  try {
    const sections: Array<{
      id: string
      type: 'all_movies' | 'tmdb_upcoming' | 'tmdb_now_playing' | 'upcoming_movies' | 'starred_movies' | 'movie_playlist'
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

    // Section 2: TMDB Upcoming (movies releasing soon)
    try {
      const upcomingResults = await getUpcomingMovies()
      sections.push({
        id: 'tmdb_upcoming',
        type: 'tmdb_upcoming',
        title: 'Upcoming',
        description: 'Movies releasing soon',
        movies: upcomingResults,
      })
    } catch (tmdbError: any) {
      logger.warn('Failed to fetch TMDB upcoming movies:', tmdbError?.message)
      sections.push({
        id: 'tmdb_upcoming',
        type: 'tmdb_upcoming',
        title: 'Upcoming',
        description: 'Movies releasing soon',
        movies: [],
      })
    }

    // Section 3: TMDB Now Playing (in theaters)
    try {
      const nowPlayingResults = await getNowPlayingMovies()
      sections.push({
        id: 'tmdb_now_playing',
        type: 'tmdb_now_playing',
        title: 'In Theaters',
        description: 'Movies currently in theaters',
        movies: nowPlayingResults,
      })
    } catch (tmdbError: any) {
      logger.warn('Failed to fetch TMDB now playing movies:', tmdbError?.message)
      sections.push({
        id: 'tmdb_now_playing',
        type: 'tmdb_now_playing',
        title: 'In Theaters',
        description: 'Movies currently in theaters',
        movies: [],
      })
    }

    // Section 4: Starred Movies
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

    // Section 5: Upcoming Movies (user's saved with future release date)
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

    // Section 6+: Movie Playlists with display_on_home = 1
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
    logger.error('Error fetching Movie dashboard sections:', error)
    res.status(500).json({ error: 'Failed to fetch Movie dashboard sections' })
  }
})

export default router
