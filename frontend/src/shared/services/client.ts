import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

// Use relative URLs in development (goes through Vite proxy) or env var in production
// When accessing from mobile, relative URLs will use the same host as the frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add common headers if needed
    // config.headers['X-Custom-Header'] = 'value'
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const data = error.response.data as any

      // Handle authentication errors
      if (status === 401) {
        const errorMessage = data?.message || data?.error || 'Authentication required'
        if (data?.requiresAuth) {
          toast.error(errorMessage)
          // Could redirect to login or settings page here if needed
        } else {
          toast.error(errorMessage)
        }
      }
      // Handle validation errors
      else if (status === 400) {
        const errorMessage = data?.message || data?.error || 'Invalid request'
        toast.error(errorMessage)
      }
      // Handle not found errors
      else if (status === 404) {
        const errorMessage = data?.message || data?.error || 'Resource not found'
        // Don't show toast for 404s as they're often handled in UI
        console.warn('404 Error:', errorMessage)
      }
      // Handle conflict errors
      else if (status === 409) {
        const errorMessage = data?.message || data?.error || 'Conflict occurred'
        toast.error(errorMessage)
      }
      // Handle server errors
      else if (status >= 500) {
        const errorMessage = data?.message || data?.error || 'Server error occurred'
        toast.error(errorMessage)
      }
      // Handle other errors
      else {
        const errorMessage = data?.message || data?.error || 'An error occurred'
        toast.error(errorMessage)
      }
    } else if (error.request) {
      // Request was made but no response received
      toast.error('Network error: Unable to reach server')
      console.error('Network error:', error.request)
    } else {
      // Something else happened
      toast.error('An unexpected error occurred')
      console.error('Error:', error.message)
    }

    return Promise.reject(error)
  }
)

// Typed wrapper functions for better type safety
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.get<T>(url, config)
  },
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.post<T>(url, data, config)
  },
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.patch<T>(url, data, config)
  },
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.put<T>(url, data, config)
  },
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.delete<T>(url, config)
  },
}

export default api
export { API_BASE_URL }
