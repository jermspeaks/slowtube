import api, { API_BASE_URL } from '../../../shared/services/client'
import { buildQueryParams } from '../../../shared/utils/apiParams'

// Videos API
export const videosAPI = {
  getAll: async (
    state?: string,
    search?: string,
    sortBy?: 'published_at' | 'added_to_playlist_at' | 'archived_at',
    sortOrder?: 'asc' | 'desc',
    channels?: string[],
    page?: number,
    limit?: number,
    dateField?: 'added_to_playlist_at' | 'published_at',
    startDate?: string,
    endDate?: string
  ) => {
    const params = buildQueryParams({
      state,
      search,
      sortBy,
      sortOrder,
      channels: channels && channels.length > 0 ? channels.join(',') : undefined,
      page,
      limit,
      dateField,
      startDate,
      endDate,
    })
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
  getFetchStatus: async () => {
    const response = await api.get('/api/videos/fetch-details/status')
    return response.data
  },
  updateState: async (id: number, state: 'feed' | 'inbox' | 'archive') => {
    const response = await api.patch(`/api/videos/${id}/state`, { state })
    return response.data
  },
  bulkUpdateState: async (updates: Array<{ videoId: number; state: 'feed' | 'inbox' | 'archive' }>) => {
    const response = await api.post('/api/videos/bulk-state', { updates })
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
    const params = buildQueryParams({
      dateField,
      startDate,
      endDate,
    })
    const response = await api.get('/api/videos/stats', { params })
    return response.data
  },
  getProgress: async (id: number) => {
    const response = await api.get(`/api/videos/${id}/progress`)
    return response.data
  },
  updateProgress: async (id: number, progressSeconds: number) => {
    const response = await api.post(`/api/videos/${id}/progress`, { progress_seconds: progressSeconds })
    return response.data
  },
  getPlayerSettings: async (id: number) => {
    const response = await api.get(`/api/videos/${id}/player-settings`)
    return response.data
  },
  updatePlayerSettings: async (
    id: number,
    settings: {
      start_time_seconds?: number | null
      end_time_seconds?: number | null
      playback_speed?: number
      volume?: number
      autoplay_next?: boolean
    }
  ) => {
    const response = await api.patch(`/api/videos/${id}/player-settings`, settings)
    return response.data
  },
}

// Channels API
export const channelsAPI = {
  getAll: async (
    filter?: 'subscribed' | 'watch_later',
    page?: number,
    limit?: number,
    sortBy?: 'channel_title' | 'updated_at' | 'last_video_date',
    sortOrder?: 'asc' | 'desc',
    notInAnyList?: boolean
  ) => {
    const params = buildQueryParams({
      filter,
      page,
      limit,
      sortBy,
      sortOrder,
      notInAnyList,
    })
    const response = await api.get('/api/channels', { params })
    return response.data
  },
  getById: async (channelId: string) => {
    const response = await api.get(`/api/channels/${channelId}`)
    return response.data
  },
  getVideos: async (
    channelId: string,
    type: 'watch_later' | 'latest' | 'liked',
    sortBy?: 'title' | 'added_to_latest_at' | 'published_at',
    sortOrder?: 'asc' | 'desc'
  ) => {
    const params = buildQueryParams({
      type,
      sortBy,
      sortOrder,
    })
    const response = await api.get(`/api/channels/${channelId}/videos`, { params })
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
  syncSubscriptions: async () => {
    const response = await api.post('/api/channels/sync-subscriptions')
    return response.data
  },
  fetchLatest: async (channelId: string, limit?: number) => {
    const params = buildQueryParams({ limit })
    const response = await api.post(`/api/channels/${channelId}/fetch-latest`, null, { params })
    return response.data
  },
  fetchLatestAll: async (limit?: number) => {
    const params = buildQueryParams({ limit })
    const response = await api.post('/api/channels/fetch-latest-all', null, { params })
    return response.data
  },
}

// Dashboard API
export const dashboardAPI = {
  getSections: async () => {
    const response = await api.get('/api/dashboard/sections')
    return response.data
  },
}

// Channel Groups API
export const channelGroupsAPI = {
  getAll: async (displayOnHome?: boolean) => {
    const params = displayOnHome !== undefined ? { display_on_home: displayOnHome } : {}
    const response = await api.get('/api/channel-lists', { params })
    return response.data
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/channel-lists/${id}`)
    return response.data
  },
  create: async (name: string, description?: string | null, color?: string | null) => {
    const response = await api.post('/api/channel-lists', { name, description, color })
    return response.data
  },
  update: async (id: number, updates: { name?: string; description?: string | null; color?: string | null; display_on_home?: boolean }) => {
    const response = await api.patch(`/api/channel-lists/${id}`, updates)
    return response.data
  },
  toggleDisplayOnHome: async (id: number, displayOnHome: boolean) => {
    const response = await api.patch(`/api/channel-lists/${id}/display-on-home`, { display_on_home: displayOnHome })
    return response.data
  },
  reorderChannelGroups: async (groupIds: number[]) => {
    const response = await api.patch('/api/channel-lists/reorder', { groupIds })
    return response.data
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/channel-lists/${id}`)
    return response.data
  },
  addChannel: async (listId: number, channelId: string) => {
    const response = await api.post(`/api/channel-lists/${listId}/channels`, { channelId })
    return response.data
  },
  addChannels: async (listId: number, channelIds: string[]) => {
    const response = await api.post(`/api/channel-lists/${listId}/channels`, { channelIds })
    return response.data
  },
  removeChannel: async (listId: number, channelId: string) => {
    const response = await api.delete(`/api/channel-lists/${listId}/channels/${channelId}`)
    return response.data
  },
  refresh: async (listId: number, limit?: number) => {
    const params = buildQueryParams({ limit })
    const response = await api.post(`/api/channel-lists/${listId}/refresh`, null, { params })
    return response.data
  },
  getVideos: async (
    listId: number,
    type: 'watch_later' | 'latest' | 'liked',
    sortBy?: 'title' | 'added_to_latest_at' | 'published_at' | 'added_to_playlist_at',
    sortOrder?: 'asc' | 'desc',
    stateFilter?: 'all' | 'exclude_archived' | 'feed' | 'inbox' | 'archive',
    shortsFilter?: 'all' | 'exclude' | 'only'
  ) => {
    const params = buildQueryParams({
      type,
      sortBy,
      sortOrder,
      stateFilter,
      shortsFilter,
    })
    const response = await api.get(`/api/channel-lists/${listId}/videos`, { params })
    return response.data
  },
}
