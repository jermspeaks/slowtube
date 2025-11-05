import express from 'express'
import { google } from 'googleapis'
import { oauthQueries } from '../services/database.js'

const router = express.Router()

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/youtube/callback'
)

// Get OAuth URL scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// Initiate OAuth flow
router.get('/youtube', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  })
  
  res.redirect(authUrl)
})

// Handle OAuth callback
router.get('/youtube/callback', async (req, res) => {
  const { code } = req.query

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code missing' })
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' })
    }

    // Get user info
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    const userId = userInfo.data.id || 'default'

    // Calculate expiration time
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null

    // Store session in database
    oauthQueries.create({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
    })

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/dashboard?auth=success`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/login?error=oauth_failed`)
  }
})

// Get current session
router.get('/session', async (req, res) => {
  try {
    const session = oauthQueries.getLatest()
    
    if (!session) {
      return res.json({ authenticated: false })
    }

    // Check if token is expired
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at)
      const now = new Date()
      
      if (now >= expiresAt) {
        // Token expired, try to refresh
        if (session.refresh_token) {
          try {
            oauth2Client.setCredentials({
              refresh_token: session.refresh_token,
            })
            
            const { credentials } = await oauth2Client.refreshAccessToken()
            
            // Update session
            const newExpiresAt = credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : null
            
            oauthQueries.update(session.id, {
              access_token: credentials.access_token!,
              refresh_token: credentials.refresh_token || session.refresh_token,
              expires_at: newExpiresAt,
            })

            return res.json({
              authenticated: true,
              user_id: session.user_id,
            })
          } catch (refreshError) {
            console.error('Token refresh error:', refreshError)
            return res.json({ authenticated: false })
          }
        } else {
          return res.json({ authenticated: false })
        }
      }
    }

    res.json({
      authenticated: true,
      user_id: session.user_id,
    })
  } catch (error) {
    console.error('Session check error:', error)
    res.status(500).json({ error: 'Failed to check session' })
  }
})

// Get authenticated OAuth client
export async function getAuthenticatedClient() {
  const session = oauthQueries.getLatest()
  
  if (!session || !session.access_token) {
    throw new Error('No authenticated session found')
  }

  // Check if token is expired
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at)
    const now = new Date()
    
    if (now >= expiresAt && session.refresh_token) {
      // Refresh token
      oauth2Client.setCredentials({
        refresh_token: session.refresh_token,
      })
      
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      // Update session
      const newExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null
      
      oauthQueries.update(session.id, {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || session.refresh_token,
        expires_at: newExpiresAt,
      })

      oauth2Client.setCredentials(credentials)
      return oauth2Client
    }
  }

  oauth2Client.setCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  return oauth2Client
}

export default router
