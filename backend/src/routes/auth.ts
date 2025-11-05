import express from 'express'
import { google } from 'googleapis'
import { oauthQueries } from '../services/database.js'

const router = express.Router()

// Get redirect URI from environment or use default
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/youtube/callback'

// Lazy initialization of OAuth2 client - only create when needed (after env vars are loaded)
let oauth2Client: ReturnType<typeof google.auth.OAuth2> | null = null

function getOAuth2Client() {
  if (!oauth2Client) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables')
    }
    
    oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI
    )
  }
  return oauth2Client
}

// Get OAuth URL scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// Initiate OAuth flow
router.get('/youtube', (req, res) => {
  const client = getOAuth2Client()
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
    redirect_uri: REDIRECT_URI, // Explicitly include redirect_uri
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
    const client = getOAuth2Client()
    // Exchange code for tokens - explicitly pass redirect_uri to ensure it matches
    const { tokens } = await client.getToken({
      code: code,
      redirect_uri: REDIRECT_URI,
    })
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' })
    }

    // Get user info
    client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
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
            const client = getOAuth2Client()
            client.setCredentials({
              refresh_token: session.refresh_token,
            })
            
            const { credentials } = await client.refreshAccessToken()
            
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
      const client = getOAuth2Client()
      client.setCredentials({
        refresh_token: session.refresh_token,
      })
      
      const { credentials } = await client.refreshAccessToken()
      
      // Update session
      const newExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null
      
      oauthQueries.update(session.id, {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || session.refresh_token,
        expires_at: newExpiresAt,
      })

      client.setCredentials(credentials)
      return client
    }
  }

  const client = getOAuth2Client()
  client.setCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  return client
}

export default router
