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
  getAll: async (state?: string) => {
    const params = state ? { state } : {}
    const response = await api.get('/api/videos', { params })
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
}

export default api

