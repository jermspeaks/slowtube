import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import videoRoutes from './routes/videos.js'
import channelRoutes from './routes/channels.js'
import tvShowRoutes from './routes/tv-shows.js'
import movieRoutes from './routes/movies.js'
import calendarRoutes from './routes/calendar.js'
import importRoutes from './routes/import.js'

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('ERROR: Missing required environment variables:')
  if (!process.env.GOOGLE_CLIENT_ID) console.error('  - GOOGLE_CLIENT_ID')
  if (!process.env.GOOGLE_CLIENT_SECRET) console.error('  - GOOGLE_CLIENT_SECRET')
  console.error('Please check your .env file')
  process.exit(1)
}

// Validate TMDB environment variables (warn but don't exit)
if (!process.env.TMDB_API_KEY && !process.env.TMDB_READ_ACCESS_TOKEN) {
  console.warn('WARNING: TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN not set. TMDB features will not work.')
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/tv-shows', tvShowRoutes)
app.use('/api/movies', movieRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/import', importRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

