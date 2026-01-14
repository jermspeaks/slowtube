import axios from 'axios'

// Use relative URLs in development (goes through Vite proxy) or env var in production
// When accessing from mobile, relative URLs will use the same host as the frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export default api
export { API_BASE_URL }
