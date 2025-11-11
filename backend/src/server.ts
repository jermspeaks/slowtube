import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import videoRoutes from './routes/videos.js'
import channelRoutes from './routes/channels.js'
import tvShowRoutes from './routes/tv-shows.js'
import movieRoutes from './routes/movies.js'
import calendarRoutes from './routes/calendar.js'
import importRoutes from './routes/import.js'

// Validate TMDB environment variables (warn but don't exit)
if (!process.env.TMDB_API_KEY && !process.env.TMDB_READ_ACCESS_TOKEN) {
  console.warn('WARNING: TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN not set. TMDB features will not work.')
}

const app = express()
const PORT = Number(process.env.PORT) || 3001

// CORS configuration - allow localhost and local network IPs
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:3000',
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,
    ]

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
      callback(new Error('Not allowed by CORS'))
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
app.use('/api/calendar', calendarRoutes)
app.use('/api/import', importRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Accessible at http://0.0.0.0:${PORT}`)
})

