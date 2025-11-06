import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Auth API
export const authAPI = {
  checkSession: async () => {
    const response = await api.get('/auth/session')
    return response.data
  },
  getAuthUrl: () => {
    return `${API_BASE_URL}/auth/youtube`
  },
}

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

export default api

