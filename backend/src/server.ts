import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import videoRoutes from './routes/videos.js'
import channelRoutes from './routes/channels.js'

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('ERROR: Missing required environment variables:')
  if (!process.env.GOOGLE_CLIENT_ID) console.error('  - GOOGLE_CLIENT_ID')
  if (!process.env.GOOGLE_CLIENT_SECRET) console.error('  - GOOGLE_CLIENT_SECRET')
  console.error('Please check your .env file')
  process.exit(1)
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

