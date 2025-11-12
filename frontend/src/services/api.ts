import axios from 'axios'

// Use relative URLs in development (goes through Vite proxy) or env var in production
// When accessing from mobile, relative URLs will use the same host as the frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Videos API
export const videosAPI = {
  getAll: async (
    state?: string,
    search?: string,
    sortBy?: 'published_at' | 'added_to_playlist_at',
    sortOrder?: 'asc' | 'desc',
    channels?: string[],
    page?: number,
    limit?: number,
    dateField?: 'added_to_playlist_at' | 'published_at',
    startDate?: string,
    endDate?: string
  ) => {
    const params: Record<string, string | string[] | number> = {}
    if (state) params.state = state
    if (search) params.search = search
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    if (channels && channels.length > 0) {
      // Send channels as comma-separated string - backend handles both string and array
      params.channels = channels.join(',')
    }
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    if (dateField) params.dateField = dateField
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await api.get('/api/videos', { params })
    return response.data
  },
  getAllChannels: async () => {
    const response = await api.get('/api/videos/channels')
    return response.data
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/videos/${id}`)
    return response.data
  },
  import: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/videos/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  fetchDetails: async () => {
    const response = await api.post('/api/videos/fetch-details')
    return response.data
  },
  updateState: async (id: number, state: 'feed' | 'inbox' | 'archive') => {
    const response = await api.patch(`/api/videos/${id}/state`, { state })
    return response.data
  },
  addTag: async (videoId: number, name: string) => {
    const response = await api.post(`/api/videos/${videoId}/tags`, { name })
    return response.data
  },
  deleteTag: async (videoId: number, tagId: number) => {
    const response = await api.delete(`/api/videos/${videoId}/tags/${tagId}`)
    return response.data
  },
  getAllTags: async () => {
    const response = await api.get('/api/videos/tags/all')
    return response.data
  },
  addComment: async (videoId: number, content: string) => {
    const response = await api.post(`/api/videos/${videoId}/comments`, { content })
    return response.data
  },
  updateComment: async (videoId: number, commentId: number, content: string) => {
    const response = await api.patch(`/api/videos/${videoId}/comments/${commentId}`, { content })
    return response.data
  },
  deleteComment: async (videoId: number, commentId: number) => {
    const response = await api.delete(`/api/videos/${videoId}/comments/${commentId}`)
    return response.data
  },
  deleteAll: async () => {
    const response = await api.delete('/api/videos/all')
    return response.data
  },
  getStats: async (
    dateField?: 'added_to_playlist_at' | 'published_at',
    startDate?: string,
    endDate?: string
  ) => {
    const params: Record<string, string> = {}
    if (dateField) params.dateField = dateField
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await api.get('/api/videos/stats', { params })
    return response.data
  },
}

// Channels API
export const channelsAPI = {
  getAll: async (filter?: 'subscribed' | 'watch_later') => {
    const params: Record<string, string> = {}
    if (filter) params.filter = filter
    const response = await api.get('/api/channels', { params })
    return response.data
  },
  getById: async (channelId: string) => {
    const response = await api.get(`/api/channels/${channelId}`)
    return response.data
  },
  getVideos: async (channelId: string, type: 'watch_later' | 'latest' | 'liked') => {
    const response = await api.get(`/api/channels/${channelId}/videos`, {
      params: { type },
    })
    return response.data
  },
  subscribe: async (channelId: string) => {
    const response = await api.post(`/api/channels/${channelId}/subscribe`)
    return response.data
  },
  unsubscribe: async (channelId: string) => {
    const response = await api.delete(`/api/channels/${channelId}/subscribe`)
    return response.data
  },
}

// TV Shows API
export const tvShowsAPI = {
  getAll: async (
    includeArchived?: boolean,
    search?: string,
    sortBy?: 'title' | 'first_air_date' | 'created_at',
    sortOrder?: 'asc' | 'desc',
    page?: number,
    limit?: number
  ) => {
    const params: Record<string, string | number> = {}
    if (includeArchived !== undefined) {
      params.includeArchived = includeArchived ? 'true' : 'false'
    }
    if (search) params.search = search
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    const response = await api.get('/api/tv-shows', { params })
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
    return response.data
  },
  getEpisodes: async (id: number) => {
    const response = await api.get(`/api/tv-shows/${id}/episodes`)
    return response.data
  },
  archive: async (id: number, isArchived: boolean) => {
    const response = await api.patch(`/api/tv-shows/${id}/archive`, { isArchived })
    return response.data
  },
  markEpisodeWatched: async (tvShowId: number, episodeId: number) => {
    const response = await api.post(`/api/tv-shows/${tvShowId}/episodes/${episodeId}/watched`)
    return response.data
  },
  markAllEpisodesWatched: async (id: number) => {
    const response = await api.post(`/api/tv-shows/${id}/episodes/watched-all`)
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
    limit?: number
  ) => {
    const params: Record<string, string | number> = {}
    if (search) params.search = search
    if (sortBy) params.sortBy = sortBy
    if (sortOrder) params.sortOrder = sortOrder
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
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
    return response.data
  },
}

// Calendar API
export const calendarAPI = {
  getEpisodes: async (startDate: string, endDate: string, hideArchived?: boolean) => {
    const params: Record<string, string> = {
      startDate,
      endDate,
    }
    if (hideArchived !== undefined) {
      params.hideArchived = hideArchived ? 'true' : 'false'
    }
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

// Settings API
export const settingsAPI = {
  getTimezone: async (): Promise<string | null> => {
    try {
      const response = await api.get('/api/settings/timezone')
      return response.data.value || null
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },
  setTimezone: async (timezone: string): Promise<void> => {
    await api.post('/api/settings', { key: 'timezone', value: timezone })
  },
  getTheme: async (): Promise<'system' | 'light' | 'dark' | null> => {
    try {
      const response = await api.get('/api/settings/theme')
      return (response.data.value as 'system' | 'light' | 'dark') || null
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },
  setTheme: async (theme: 'system' | 'light' | 'dark'): Promise<void> => {
    await api.post('/api/settings', { key: 'theme', value: theme })
  },
}

export default api

