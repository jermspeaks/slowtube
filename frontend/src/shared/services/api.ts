import api, { API_BASE_URL } from './client'

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

// Auth API
export const authAPI = {
  getAuthUrl: () => {
    return `${API_BASE_URL}/api/auth/youtube`
  },
  checkSession: async () => {
    const response = await api.get('/api/auth/session')
    return response.data
  },
}
