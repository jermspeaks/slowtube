import api from '../../../shared/services/client'
import { buildQueryParams } from '../../../shared/utils/apiParams'

// TV Shows API
export const tvShowsAPI = {
  getAll: async (
    includeArchived?: boolean,
    search?: string,
    sortBy?: 'title' | 'first_air_date' | 'created_at' | 'next_episode_date' | 'last_episode_date',
    sortOrder?: 'asc' | 'desc',
    page?: number,
    limit?: number,
    status?: string,
    archiveFilter?: 'all' | 'archived' | 'unarchived',
    completionFilter?: 'all' | 'hideCompleted' | 'startedOnly' | 'newOnly'
  ) => {
    const params = buildQueryParams({
      includeArchived: includeArchived !== undefined ? (includeArchived ? 'true' : 'false') : undefined,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
      status,
      archiveFilter,
      completionFilter,
    })
    const response = await api.get('/api/tv-shows', { params })
    return response.data
  },
  getStatuses: async () => {
    const response = await api.get('/api/tv-shows/statuses')
    return response.data
  },
  search: async (query: string) => {
    const response = await api.post('/api/tv-shows/search', { query })
    return response.data
  },
  create: async (tmdbId: number) => {
    const response = await api.post('/api/tv-shows', { tmdbId })
    return response.data
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/tv-shows/${id}`)
    return response.data
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/tv-shows/${id}`)
    // Backend wraps response in { data: ... } format
    return response.data.data || response.data
  },
  getEpisodes: async (id: number) => {
    const response = await api.get(`/api/tv-shows/${id}/episodes`)
    // Backend wraps response in { data: ... } format
    return response.data.data || response.data || []
  },
  archive: async (id: number, isArchived: boolean) => {
    const response = await api.patch(`/api/tv-shows/${id}/archive`, { isArchived })
    return response.data
  },
  setStarted: async (id: number, isStarted: boolean) => {
    const response = await api.patch(`/api/tv-shows/${id}/started`, { isStarted })
    return response.data
  },
  markEpisodeWatched: async (tvShowId: number, episodeId: number) => {
    const response = await api.post(`/api/tv-shows/${tvShowId}/episodes/${episodeId}/watched`)
    return response.data
  },
  markEpisodeUnwatched: async (tvShowId: number, episodeId: number) => {
    const response = await api.post(`/api/tv-shows/${tvShowId}/episodes/${episodeId}/unwatched`)
    return response.data
  },
  markAllEpisodesWatched: async (id: number) => {
    const response = await api.post(`/api/tv-shows/${id}/episodes/watched-all`)
    return response.data
  },
  markAllTVEpisodesWatched: async () => {
    const response = await api.post('/api/tv-shows/episodes/watched-all')
    return response.data
  },
  markSeasonWatched: async (tvShowId: number, seasonNumber: number) => {
    const response = await api.post(`/api/tv-shows/${tvShowId}/seasons/${seasonNumber}/watched`)
    return response.data
  },
  deleteAll: async () => {
    const response = await api.delete('/api/tv-shows/all')
    return response.data
  },
  refreshAll: async (includeArchived?: boolean) => {
    const response = await api.post('/api/tv-shows/refresh', { includeArchived: includeArchived || false })
    return response.data
  },
  refresh: async (id: number) => {
    const response = await api.post(`/api/tv-shows/${id}/refresh`)
    return response.data
  },
}

// Movies API
export const moviesAPI = {
  getAll: async (
    search?: string,
    sortBy?: 'title' | 'release_date' | 'created_at',
    sortOrder?: 'asc' | 'desc',
    page?: number,
    limit?: number,
    archiveFilter?: 'all' | 'archived' | 'unarchived',
    starredFilter?: 'all' | 'starred' | 'unstarred',
    watchedFilter?: 'all' | 'watched' | 'unwatched',
    playlistFilter?: 'all' | 'in_playlist' | 'not_in_playlist'
  ) => {
    const params = buildQueryParams({
      search,
      sortBy,
      sortOrder,
      page,
      limit,
      archiveFilter,
      starredFilter,
      watchedFilter,
      playlistFilter,
    })
    const response = await api.get('/api/movies', { params })
    return response.data
  },
  search: async (query: string) => {
    const response = await api.post('/api/movies/search', { query })
    return response.data
  },
  create: async (tmdbId: number) => {
    const response = await api.post('/api/movies', { tmdbId })
    return response.data
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/movies/${id}`)
    return response.data
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/movies/${id}`)
    // Backend wraps response in { data: ... } format
    return response.data.data || response.data
  },
  archive: async (id: number, isArchived: boolean) => {
    const response = await api.patch(`/api/movies/${id}/archive`, { isArchived })
    return response.data
  },
  star: async (id: number, isStarred: boolean) => {
    const response = await api.patch(`/api/movies/${id}/star`, { isStarred })
    return response.data
  },
  watched: async (id: number, isWatched: boolean) => {
    const response = await api.patch(`/api/movies/${id}/watched`, { isWatched })
    return response.data
  },
  bulkWatched: async (movieIds: number[], isWatched: boolean) => {
    const response = await api.post('/api/movies/bulk-watched', { movieIds, isWatched })
    return response.data
  },
}

// Movie Playlists API
export const moviePlaylistsAPI = {
  getAll: async () => {
    const response = await api.get('/api/movie-playlists')
    return response.data
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/movie-playlists/${id}`)
    return response.data
  },
  create: async (name: string, description?: string | null, color?: string | null) => {
    const response = await api.post('/api/movie-playlists', { name, description, color })
    return response.data
  },
  update: async (id: number, updates: { name?: string; description?: string | null; color?: string | null; display_on_home?: boolean }) => {
    const response = await api.patch(`/api/movie-playlists/${id}`, updates)
    return response.data
  },
  toggleDisplayOnHome: async (id: number, displayOnHome: boolean) => {
    const response = await api.patch(`/api/movie-playlists/${id}/display-on-home`, { display_on_home: displayOnHome })
    return response.data
  },
  reorderPlaylists: async (playlistIds: number[]) => {
    const response = await api.patch('/api/movie-playlists/reorder', { playlistIds })
    return response.data
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/movie-playlists/${id}`)
    return response.data
  },
  addMovie: async (playlistId: number, movieId: number) => {
    const response = await api.post(`/api/movie-playlists/${playlistId}/movies`, { movieId })
    return response.data
  },
  addMovies: async (playlistId: number, movieIds: number[]) => {
    const response = await api.post(`/api/movie-playlists/${playlistId}/movies`, { movieIds })
    return response.data
  },
  removeMovie: async (playlistId: number, movieId: number) => {
    const response = await api.delete(`/api/movie-playlists/${playlistId}/movies/${movieId}`)
    return response.data
  },
  removeMovies: async (playlistId: number, movieIds: number[]) => {
    const response = await api.post(`/api/movie-playlists/${playlistId}/movies/bulk-remove`, { movieIds })
    return response.data
  },
  reorderMovies: async (playlistId: number, movieIds: number[]) => {
    const response = await api.patch(`/api/movie-playlists/${playlistId}/movies/reorder`, { movieIds })
    return response.data
  },
}

// Calendar API
export const calendarAPI = {
  getEpisodes: async (startDate: string, endDate: string, hideArchived?: boolean) => {
    const params = buildQueryParams({
      startDate,
      endDate,
      hideArchived: hideArchived !== undefined ? (hideArchived ? 'true' : 'false') : undefined,
    })
    const response = await api.get('/api/calendar/episodes', { params })
    return response.data
  },
}

// Import API
export const importAPI = {
  importTMDB: async () => {
    const response = await api.post('/api/import/tmdb')
    return response.data
  },
  importIMDB: async () => {
    const response = await api.post('/api/import/imdb')
    return response.data
  },
  importLetterboxd: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/import/letterboxd', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

// TV Dashboard API
export const tvDashboardAPI = {
  getSections: async () => {
    const response = await api.get('/api/tv-dashboard/sections')
    return response.data
  },
}

// Movie Dashboard API
export const movieDashboardAPI = {
  getSections: async () => {
    const response = await api.get('/api/movie-dashboard/sections')
    return response.data
  },
}
