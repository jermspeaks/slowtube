import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import videoRoutes from './routes/videos.js'
import channelRoutes from './routes/channels.js'
import tvShowRoutes from './routes/tv-shows.js'
import movieRoutes from './routes/movies.js'
import moviePlaylistRoutes from './routes/movie-playlists.js'
import channelListRoutes from './routes/channel-lists.js'
import dashboardRoutes from './routes/dashboard.js'
import calendarRoutes from './routes/calendar.js'
import importRoutes from './routes/import.js'
import settingsRoutes from './routes/settings.js'
import authRoutes from './routes/auth.js'
import { refreshAllTVShowEpisodes } from './services/tv-episode-refresh.js'
import { errorHandler } from './middleware/errorHandler.js'

// Validate TMDB environment variables (warn but don't exit)
if (!process.env.TMDB_API_KEY && !process.env.TMDB_READ_ACCESS_TOKEN) {
  console.warn('WARNING: TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN not set. TMDB features will not work.')
}

const app = express()
const PORT = Number(process.env.PORT) || 3001

// CORS configuration - allow localhost and local network IPs
const defaultOrigins = [
  'http://localhost:5200',
  'http://127.0.0.1:5200',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/,
]

const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, ...defaultOrigins]
  : defaultOrigins

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed
      }
      return allowed.test(origin)
    })
    
    if (isAllowed) {
      callback(null, true)
    } else {
      console.warn(`CORS: Rejected origin: ${origin}`)
      console.warn(`CORS: Allowed origins:`, allowedOrigins)
      callback(new Error(`Not allowed by CORS: ${origin}`))
    }
  },
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/videos', videoRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/tv-shows', tvShowRoutes)
app.use('/api/movies', movieRoutes)
app.use('/api/movie-playlists', moviePlaylistRoutes)
app.use('/api/channel-lists', channelListRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/import', importRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/auth', authRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Error handler middleware (must be last)
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Accessible at http://0.0.0.0:${PORT}`)
})

// Setup daily TV episode refresh job
const refreshEnabled = process.env.TV_EPISODE_REFRESH_ENABLED !== 'false' // Default to true
const refreshCronSchedule = process.env.TV_EPISODE_REFRESH_TIME || '0 0 * * *' // Default: midnight daily
const includeArchived = process.env.TV_EPISODE_REFRESH_INCLUDE_ARCHIVED === 'true' // Default: false

if (refreshEnabled) {
  // Validate cron schedule
  if (cron.validate(refreshCronSchedule)) {
    console.log(`TV episode refresh scheduled: ${refreshCronSchedule} (includeArchived: ${includeArchived})`)
    
    cron.schedule(refreshCronSchedule, async () => {
      console.log(`[${new Date().toISOString()}] Starting scheduled TV episode refresh...`)
      try {
        const result = await refreshAllTVShowEpisodes(includeArchived)
        console.log(`[${new Date().toISOString()}] TV episode refresh completed: ${result.successful} successful, ${result.failed} failed out of ${result.total} total`)
      } catch (error: any) {
        console.error(`[${new Date().toISOString()}] TV episode refresh failed:`, error.message)
      }
    })
  } else {
    console.warn(`Invalid TV_EPISODE_REFRESH_TIME cron schedule: ${refreshCronSchedule}. TV episode refresh disabled.`)
  }
} else {
  console.log('TV episode refresh is disabled (TV_EPISODE_REFRESH_ENABLED=false)')
}

