import Papa from 'papaparse'
import { google } from 'googleapis'
import ytdl from '@distube/ytdl-core'
import { videoQueries, videoStateQueries, channelQueries } from './database.js'
import { getAuthenticatedClient } from '../routes/auth.js'
import { parseDuration } from '../utils/duration.js'

// Google Takeout watch history entry format
export interface GoogleTakeoutWatchHistoryEntry {
  header?: string
  title?: string
  titleUrl?: string
  time?: string
  subtitles?: Array<{
    name?: string
    url?: string
  }>
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  if (!url) return null
  
  // Match patterns like:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

// Parse Google Takeout JSON and extract video information
export function parseGoogleTakeoutJSON(jsonData: any): Array<{
  id: string
  title: string
  watchedAt: string | null
}> {
  if (!Array.isArray(jsonData)) {
    throw new Error('Invalid JSON format: expected an array of watch history entries')
  }

  const videos: Array<{
    id: string
    title: string
    watchedAt: string | null
  }> = []

  for (const entry of jsonData) {
    const entryObj = entry as GoogleTakeoutWatchHistoryEntry
    
    // Skip entries without titleUrl (not YouTube videos)
    if (!entryObj.titleUrl) continue
    
    // Extract video ID from URL
    const videoId = extractVideoId(entryObj.titleUrl)
    if (!videoId) continue
    
    // Skip if we already have this video (takeout may have duplicates)
    if (videos.find(v => v.id === videoId)) continue
    
    videos.push({
      id: videoId,
      title: entryObj.title || 'Untitled Video',
      watchedAt: entryObj.time || null,
    })
  }

  console.log(`Parsed ${videos.length} unique videos from Google Takeout JSON`)
  return videos
}

// Parse Google Takeout CSV and extract video information
export function parseGoogleTakeoutCSV(csvContent: string): Array<{
  id: string
  title: string
  watchedAt: string | null
}> {
  const videos: Array<{
    id: string
    title: string
    watchedAt: string | null
  }> = []

  // Parse CSV using papaparse
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(), // Trim whitespace from headers
  })

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors)
  }

  const rows = result.data as any[]

  // Google Takeout CSV can have different formats:
  // 1. Playlist format: Video ID, Playlist Video Creation Timestamp
  // 2. Watch history format: Title, Channel, URL, Time
  // We'll be flexible to handle both formats
  
  for (const row of rows) {
    let videoId: string | null = null
    
    // First, try to get Video ID directly (playlist format)
    const directVideoId = row['Video ID'] || row['video id'] || row['videoId'] || row['VideoId'] || row['Video_Id']
    
    if (directVideoId && typeof directVideoId === 'string') {
      const trimmedId = directVideoId.trim()
      // YouTube video IDs are exactly 11 characters
      if (trimmedId.length === 11) {
        videoId = trimmedId
      }
    }
    
    if (!videoId) {
      // Try to extract from URL (watch history format)
      const url = row['URL'] || row['url'] || row['Url'] || row['Video URL'] || row['Link'] || row['link']
      if (url) {
        videoId = extractVideoId(url)
      }
    }
    
    if (!videoId) continue

    // Skip if we already have this video (takeout may have duplicates)
    if (videos.find(v => v.id === videoId)) continue

    // Try different possible column names for Title
    const title = row['Title'] || row['title'] || row['Video Title'] || row['Video title'] || 'Untitled Video'
    
    // Try different possible column names for Time/Timestamp
    const time = row['Time'] || 
                 row['time'] || 
                 row['Timestamp'] || 
                 row['timestamp'] || 
                 row['Date'] || 
                 row['date'] || 
                 row['Playlist Video Creation Timestamp'] ||
                 row['Playlist Video Creation timestamp'] ||
                 row['playlist video creation timestamp'] ||
                 null

    videos.push({
      id: videoId,
      title: title || 'Untitled Video',
      watchedAt: time || null,
    })
  }

  console.log(`Parsed ${videos.length} unique videos from Google Takeout CSV`)
  return videos
}

// Generate thumbnail URL from video ID
function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

// Import videos from Google Takeout JSON or CSV into database
export function importVideosFromTakeout(data: any, format: 'json' | 'csv' = 'json'): { imported: number; updated: number; skipped: number } {
  try {
    let parsedVideos: Array<{
      id: string
      title: string
      watchedAt: string | null
    }>

    if (format === 'csv') {
      // data is a string (CSV content)
      if (typeof data !== 'string') {
        throw new Error('CSV data must be a string')
      }
      parsedVideos = parseGoogleTakeoutCSV(data)
    } else {
      // data is JSON object/array
      parsedVideos = parseGoogleTakeoutJSON(data)
    }
    let imported = 0
    let updated = 0
    let skipped = 0
    let firstImported = false

    for (const video of parsedVideos) {
      const existingVideo = videoQueries.getByYoutubeId(video.id)

      if (existingVideo) {
        // Skip videos that are already successfully fetched
        if (existingVideo.fetch_status === 'completed') {
          skipped++
          continue
        }

        // Update existing video that hasn't been fetched yet
        // Update added_to_playlist_at if it's newer
        const updateData: any = {
          added_to_playlist_at: video.watchedAt,
          youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
        }
        // Only update fetch_status if it's not already set or is pending
        if (!existingVideo.fetch_status || existingVideo.fetch_status === 'pending') {
          updateData.fetch_status = 'pending'
        }
        videoQueries.update(existingVideo.id, updateData)
        updated++
        
        if (!firstImported) {
          console.log('First video updated:', {
            id: existingVideo.id,
            youtube_id: video.id,
            added_to_playlist_at: video.watchedAt,
            fetch_status: existingVideo.fetch_status,
          })
          firstImported = true
        }
      } else {
        // Create new video
        const videoData = {
          youtube_id: video.id,
          title: 'Untitled Video', // Will be updated by YouTube API fetch
          description: null, // Will be updated by YouTube API fetch
          thumbnail_url: getThumbnailUrl(video.id), // Temporary thumbnail, may be updated by API
          duration: null, // Will be updated by YouTube API fetch
          published_at: null, // Will be fetched from YouTube API
          added_to_playlist_at: video.watchedAt, // Store CSV timestamp here
          fetch_status: 'pending' as const, // Mark as pending for YouTube API fetch
          youtube_channel_id: null, // Will be updated by YouTube API fetch
          youtube_url: `https://www.youtube.com/watch?v=${video.id}`, // Construct URL from video ID
        }
        
        const videoId = videoQueries.create(videoData)
        
        // Set initial state to 'feed'
        videoStateQueries.setState(videoId, 'feed')
        imported++
        
        if (!firstImported) {
          console.log('First video imported:', {
            id: videoId,
            youtube_id: video.id,
            added_to_playlist_at: video.watchedAt,
            fetch_status: 'pending',
            state: 'feed',
          })
          firstImported = true
        }
      }
    }

    console.log(`Import complete: ${imported} imported, ${updated} updated, ${skipped} skipped (already fetched)`)
    return { imported, updated, skipped }
  } catch (error) {
    console.error('Error importing videos:', error)
    throw error
  }
}

// Parse MyActivity.json and extract liked videos
export function parseLikedVideosFromActivityJSON(jsonData: any): Array<{
  id: string
  title: string
  likedAt: string | null
}> {
  if (!Array.isArray(jsonData)) {
    throw new Error('Invalid JSON format: expected an array of activity entries')
  }

  const videos: Array<{
    id: string
    title: string
    likedAt: string | null
  }> = []

  for (const entry of jsonData) {
    const entryObj = entry as GoogleTakeoutWatchHistoryEntry
    
    // Only process entries with "Liked " prefix in title
    if (!entryObj.title || !entryObj.title.startsWith('Liked ')) continue
    
    // Skip entries without titleUrl (not YouTube videos)
    if (!entryObj.titleUrl) continue
    
    // Extract video ID from URL
    const videoId = extractVideoId(entryObj.titleUrl)
    if (!videoId) continue
    
    // Skip if we already have this video (takeout may have duplicates)
    if (videos.find(v => v.id === videoId)) continue
    
    // Strip "Liked " prefix from title
    const title = entryObj.title.replace(/^Liked /, '')
    
    videos.push({
      id: videoId,
      title: title || 'Untitled Video',
      likedAt: entryObj.time || null,
    })
  }

  console.log(`Parsed ${videos.length} unique liked videos from MyActivity.json`)
  return videos
}

// Import liked videos from MyActivity.json into database
export function importLikedVideosFromActivity(data: any): { imported: number; updated: number; skipped: number } {
  try {
    const parsedVideos = parseLikedVideosFromActivityJSON(data)
    
    let imported = 0
    let updated = 0
    let skipped = 0
    let firstImported = false

    for (const video of parsedVideos) {
      const existingVideo = videoQueries.getByYoutubeId(video.id)

      if (existingVideo) {
        // Update existing video
        const updateData: any = {
          is_liked: 1,
          youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
        }
        
        // Update liked_at if it's newer or doesn't exist
        if (video.likedAt) {
          if (!existingVideo.liked_at || new Date(video.likedAt) > new Date(existingVideo.liked_at)) {
            updateData.liked_at = video.likedAt
          }
        }
        
        videoQueries.update(existingVideo.id, updateData)
        
        // Set state to inbox if not already set
        const currentState = videoStateQueries.getByVideoId(existingVideo.id)
        if (!currentState) {
          videoStateQueries.setState(existingVideo.id, 'inbox')
        }
        
        updated++
        
        if (!firstImported) {
          console.log('First liked video updated:', {
            id: existingVideo.id,
            youtube_id: video.id,
            liked_at: video.likedAt,
          })
          firstImported = true
        }
      } else {
        // Create new video
        const videoData = {
          youtube_id: video.id,
          title: 'Untitled Video', // Will be updated by YouTube API fetch
          description: null, // Will be updated by YouTube API fetch
          thumbnail_url: getThumbnailUrl(video.id), // Temporary thumbnail, may be updated by API
          duration: null, // Will be updated by YouTube API fetch
          published_at: null, // Will be fetched from YouTube API
          added_to_playlist_at: null,
          fetch_status: 'pending' as const, // Mark as pending for YouTube API fetch
          youtube_channel_id: null, // Will be updated by YouTube API fetch
          youtube_url: `https://www.youtube.com/watch?v=${video.id}`, // Construct URL from video ID
          is_liked: 1,
          liked_at: video.likedAt,
        }
        
        const videoId = videoQueries.create(videoData)
        
        // Set initial state to 'inbox'
        videoStateQueries.setState(videoId, 'inbox')
        imported++
        
        if (!firstImported) {
          console.log('First liked video imported:', {
            id: videoId,
            youtube_id: video.id,
            liked_at: video.likedAt,
            state: 'inbox',
          })
          firstImported = true
        }
      }
    }

    console.log(`Liked videos import complete: ${imported} imported, ${updated} updated, ${skipped} skipped`)
    return { imported, updated, skipped }
  } catch (error) {
    console.error('Error importing liked videos:', error)
    throw error
  }
}

// YouTube API video details interface
export interface YouTubeVideoDetails {
  id: string
  title: string
  description: string | null
  channelId: string | null
  channelTitle: string | null
  publishedAt: string | null
  duration: string | null
  thumbnails: {
    default?: { url: string }
    medium?: { url: string }
    high?: { url: string }
  }
}

// Get YouTube API key (returns null if not available)
function getYouTubeApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null
}

// Get YouTube API client (OAuth-first with API key fallback)
// If oauthClient is provided, use it; otherwise fallback to API key
// Note: According to YouTube API docs, some operations may require both OAuth and API key
function getYouTubeClient(oauthClient?: any) {
  const apiKey = getYouTubeApiKey()
  
  // If OAuth client is provided, use it (with optional API key for quota tracking)
  if (oauthClient) {
    // Verify OAuth client has credentials
    const credentials = oauthClient.credentials
    if (!credentials || !credentials.access_token) {
      console.warn('OAuth client provided but missing access_token, falling back to API key')
      // Fall through to API key fallback
    } else {
      // Use OAuth as primary auth, but also include API key if available for quota tracking
      // The googleapis library should handle this correctly
      const client = google.youtube({ version: 'v3', auth: oauthClient })
      
      // If we have an API key, we can set it as a default param (though OAuth should work alone)
      // Some YouTube API operations benefit from having both
      return client
    }
  }
  
  // Otherwise, try API key
  if (!apiKey) {
    return null
  }
  
  // Pass API key when creating client for better compatibility
  return google.youtube({ version: 'v3', auth: apiKey })
}

// Fetch video details using YouTube oEmbed API (fallback method)
// This is free and doesn't require authentication, but provides limited metadata
async function fetchVideoDetailsFromOEmbed(videoId: string): Promise<YouTubeVideoDetails | null> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null // Video not found
      }
      throw new Error(`oEmbed API returned status ${response.status}`)
    }
    
    const data = await response.json()
    
    // oEmbed provides limited data, so we construct what we can
    return {
      id: videoId,
      title: data.title || 'Untitled Video',
      description: null, // oEmbed doesn't provide description
      channelId: null, // oEmbed doesn't provide channel ID
      channelTitle: data.author_name || null,
      publishedAt: null, // oEmbed doesn't provide publish date
      duration: null, // oEmbed doesn't provide duration
      thumbnails: {
        default: data.thumbnail_url ? { url: data.thumbnail_url } : undefined,
        medium: data.thumbnail_url ? { url: data.thumbnail_url } : undefined,
        high: data.thumbnail_url ? { url: data.thumbnail_url } : undefined,
      },
    }
  } catch (error: any) {
    console.warn(`oEmbed fetch failed for video ${videoId}:`, error.message)
    return null
  }
}

// Fetch video details using ytdl-core (fallback method)
// This can extract full metadata without API key, but may be slower
async function fetchVideoDetailsFromYtdl(videoId: string): Promise<YouTubeVideoDetails | null> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const info = await ytdl.getInfo(videoUrl)
    
    if (!info || !info.videoDetails) {
      return null
    }
    
    const details = info.videoDetails
    
    return {
      id: videoId,
      title: details.title || 'Untitled Video',
      description: details.description || null,
      channelId: details.channelId || null,
      channelTitle: details.author?.name || details.ownerChannelName || null,
      publishedAt: details.publishDate || null,
      duration: details.lengthSeconds ? `PT${details.lengthSeconds}S` : null,
      thumbnails: {
        default: details.thumbnails?.[0]?.url ? { url: details.thumbnails[0].url } : undefined,
        medium: details.thumbnails?.find(t => t.width && t.width >= 320)?.url 
          ? { url: details.thumbnails.find(t => t.width && t.width >= 320)!.url } 
          : undefined,
        high: details.thumbnails?.find(t => t.width && t.width >= 480)?.url 
          ? { url: details.thumbnails.find(t => t.width && t.width >= 480)!.url } 
          : undefined,
      },
    }
  } catch (error: any) {
    console.warn(`ytdl-core fetch failed for video ${videoId}:`, error.message)
    return null
  }
}

// Fetch video details from YouTube API in batches
export async function fetchVideoDetailsFromYouTube(videoIds: string[], oauthClient?: any): Promise<Map<string, YouTubeVideoDetails | null>> {
  if (videoIds.length === 0) {
    return new Map()
  }

  if (videoIds.length > 50) {
    throw new Error('Cannot fetch more than 50 videos at once')
  }

  const youtube = getYouTubeClient(oauthClient)
  if (!youtube) {
    const authMethod = oauthClient ? 'OAuth' : 'API key'
    console.warn(`Cannot fetch video details from YouTube API. ${authMethod} authentication not available.`)
    // Return empty map with all videos marked as null
    const result = new Map<string, YouTubeVideoDetails | null>()
    for (const videoId of videoIds) {
      result.set(videoId, null)
    }
    return result
  }

  try {
    // Log authentication method and video IDs being fetched
    if (oauthClient) {
      const credentials = oauthClient.credentials
      const hasToken = !!credentials?.access_token
      const tokenExpiry = credentials?.expiry_date ? new Date(credentials.expiry_date) : null
      const isExpired = tokenExpiry ? new Date() >= tokenExpiry : false
      console.log(`Fetching ${videoIds.length} videos using OAuth:`, {
        hasAccessToken: hasToken,
        tokenExpiry: tokenExpiry?.toISOString(),
        isExpired,
        hasRefreshToken: !!credentials?.refresh_token,
      })
    } else {
      console.log(`Fetching ${videoIds.length} videos using API key`)
    }
    console.log(`Video IDs: ${videoIds.join(', ')}`)

    // Fetch video details - auth is now in the client, no need to pass key
    // According to YouTube API docs, videos.list works with either API key or OAuth
    // However, some operations may benefit from having both for quota tracking
    const apiKey = getYouTubeApiKey()
    const requestParams: any = {
      part: ['snippet', 'contentDetails'],
      id: videoIds,
      maxResults: 50, // Explicitly set max results
    }
    
    // Include API key if available (even with OAuth) for quota tracking
    // The OAuth token will still be used for authorization
    if (apiKey && !oauthClient) {
      requestParams.key = apiKey
    }
    
    const videosResponse = await youtube.videos.list(requestParams)

    const result = new Map<string, YouTubeVideoDetails | null>()
    
    // Mark all videos as null initially
    for (const videoId of videoIds) {
      result.set(videoId, null)
    }

    const videos = videosResponse.data.items || []
    
    // Log API response details for debugging
    if (videos.length === 0 && videoIds.length > 0) {
      console.warn(`YouTube API returned 0 videos for ${videoIds.length} requested IDs. Response:`, {
        pageInfo: videosResponse.data.pageInfo,
        items: videosResponse.data.items,
        totalResults: videosResponse.data.pageInfo?.totalResults,
      })
      
      // If using OAuth and got 0 results, try falling back to API key
      // This might indicate OAuth scope/permission issues
      let triedApiKeyFallback = false
      if (oauthClient) {
        const apiKey = getYouTubeApiKey()
        if (apiKey) {
          triedApiKeyFallback = true
          console.warn(`OAuth returned 0 results, trying API key fallback...`)
          try {
            const apiKeyClient = google.youtube({ version: 'v3', auth: apiKey })
            const fallbackResponse = await apiKeyClient.videos.list({
              part: ['snippet', 'contentDetails'],
              id: videoIds,
              maxResults: 50,
            })
            
            const fallbackVideos = fallbackResponse.data.items || []
            if (fallbackVideos.length > 0) {
              console.log(`API key fallback succeeded! Retrieved ${fallbackVideos.length} videos`)
              // Use fallback results instead
              const fallbackResult = new Map<string, YouTubeVideoDetails | null>()
              
              // Mark all videos as null initially
              for (const videoId of videoIds) {
                fallbackResult.set(videoId, null)
              }
              
              for (const video of fallbackVideos) {
                if (!video.id) continue

                const details: YouTubeVideoDetails = {
                  id: video.id,
                  title: video.snippet?.title || 'Untitled Video',
                  description: video.snippet?.description || null,
                  channelId: video.snippet?.channelId || null,
                  channelTitle: video.snippet?.channelTitle || null,
                  publishedAt: video.snippet?.publishedAt || null,
                  duration: video.contentDetails?.duration || null,
                  thumbnails: {
                    default: video.snippet?.thumbnails?.default?.url ? { url: video.snippet.thumbnails.default.url } : undefined,
                    medium: video.snippet?.thumbnails?.medium?.url ? { url: video.snippet.thumbnails.medium.url } : undefined,
                    high: video.snippet?.thumbnails?.high?.url ? { url: video.snippet.thumbnails.high.url } : undefined,
                  },
                }

                fallbackResult.set(video.id, details)
              }
              
              console.log(`Fetched details for ${fallbackVideos.length} out of ${videoIds.length} videos (using API key fallback)`)
              return fallbackResult
            } else {
              console.warn(`API key fallback also returned 0 results. Trying ytdl-core/oEmbed fallback...`)
            }
          } catch (fallbackError: any) {
            console.error('API key fallback also failed:', fallbackError.message)
            console.warn('Trying ytdl-core/oEmbed fallback...')
          }
        }
      }
      
      // If API returned 0 results (and API key fallback didn't help if we tried it),
      // try using ytdl-core/oEmbed fallback methods
      console.warn(`YouTube API returned 0 results. Attempting fallback methods (ytdl-core/oEmbed)...`)
      return await fetchVideoDetailsWithFallback(videoIds)
    }
    
    for (const video of videos) {
      if (!video.id) continue

      const details: YouTubeVideoDetails = {
        id: video.id,
        title: video.snippet?.title || 'Untitled Video',
        description: video.snippet?.description || null,
        channelId: video.snippet?.channelId || null,
        channelTitle: video.snippet?.channelTitle || null,
        publishedAt: video.snippet?.publishedAt || null,
        duration: video.contentDetails?.duration || null,
        thumbnails: {
          default: video.snippet?.thumbnails?.default?.url ? { url: video.snippet.thumbnails.default.url } : undefined,
          medium: video.snippet?.thumbnails?.medium?.url ? { url: video.snippet.thumbnails.medium.url } : undefined,
          high: video.snippet?.thumbnails?.high?.url ? { url: video.snippet.thumbnails.high.url } : undefined,
        },
      }

      result.set(video.id, details)
    }

    console.log(`Fetched details for ${videos.length} out of ${videoIds.length} videos`)
    return result
  } catch (error: any) {
    // Enhanced error logging
    console.error('Error fetching video details from YouTube:', error)
    
    // Log detailed error information if available
    if (error.response?.data) {
      console.error('YouTube API Error Response:', JSON.stringify(error.response.data, null, 2))
    }
    if (error.code) {
      console.error('Error Code:', error.code)
    }
    if (error.message) {
      console.error('Error Message:', error.message)
    }
    
    // Check for specific error types and provide helpful messages
    if (error.code === 403) {
      const errorMessage = error.response?.data?.error?.message || error.message
      console.warn(`YouTube API access denied (403). Attempting fallback methods...`)
      
      // Try fallback methods when API fails
      return await fetchVideoDetailsWithFallback(videoIds)
    } else if (error.code === 400) {
      const errorMessage = error.response?.data?.error?.message || error.message
      console.warn(`YouTube API bad request (400). Attempting fallback methods...`)
      
      // Try fallback methods
      return await fetchVideoDetailsWithFallback(videoIds)
    } else if (error.code === 401) {
      const errorMessage = error.response?.data?.error?.message || error.message
      console.warn(`YouTube API unauthorized (401). Attempting fallback methods...`)
      
      // Try fallback methods
      return await fetchVideoDetailsWithFallback(videoIds)
    }
    
    // For other errors, try fallback before throwing
    console.warn(`YouTube API error. Attempting fallback methods...`)
    try {
      return await fetchVideoDetailsWithFallback(videoIds)
    } catch (fallbackError) {
      throw error // Throw original error if fallback also fails
    }
  }
}

// Fetch video details using fallback methods (oEmbed or ytdl-core)
// This is called when the YouTube API fails
async function fetchVideoDetailsWithFallback(videoIds: string[]): Promise<Map<string, YouTubeVideoDetails | null>> {
  const result = new Map<string, YouTubeVideoDetails | null>()
  
  // Initialize all videos as null
  for (const videoId of videoIds) {
    result.set(videoId, null)
  }
  
  console.log(`Attempting to fetch ${videoIds.length} videos using fallback methods...`)
  
  // Try ytdl-core first (more complete metadata)
  // Process videos one at a time to avoid overwhelming the service
  let ytdlSuccessCount = 0
  let ytdlFailedIds: string[] = []
  
  for (const videoId of videoIds) {
    try {
      const details = await fetchVideoDetailsFromYtdl(videoId)
      if (details) {
        result.set(videoId, details)
        ytdlSuccessCount++
      } else {
        ytdlFailedIds.push(videoId)
      }
    } catch (error: any) {
      console.warn(`ytdl-core failed for ${videoId}:`, error.message)
      ytdlFailedIds.push(videoId)
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`ytdl-core succeeded for ${ytdlSuccessCount} videos`)
  
  // For videos that ytdl-core failed on, try oEmbed as last resort
  if (ytdlFailedIds.length > 0) {
    console.log(`Trying oEmbed for ${ytdlFailedIds.length} remaining videos...`)
    let oembedSuccessCount = 0
    
    for (const videoId of ytdlFailedIds) {
      try {
        const details = await fetchVideoDetailsFromOEmbed(videoId)
        if (details) {
          result.set(videoId, details)
          oembedSuccessCount++
        }
      } catch (error: any) {
        console.warn(`oEmbed also failed for ${videoId}:`, error.message)
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`oEmbed succeeded for ${oembedSuccessCount} videos`)
  }
  
  const totalSuccess = Array.from(result.values()).filter(v => v !== null).length
  console.log(`Fallback methods fetched ${totalSuccess} out of ${videoIds.length} videos`)
  
  return result
}

// Fetch channel details from YouTube API
export async function fetchChannelDetailsFromYouTube(channelIds: string[], oauthClient?: any): Promise<Map<string, {
  id: string
  title: string | null
  description: string | null
  thumbnailUrl: string | null
  subscriberCount: number | null
} | null>> {
  if (channelIds.length === 0) {
    return new Map()
  }

  if (channelIds.length > 50) {
    throw new Error('Cannot fetch more than 50 channels at once')
  }

  const youtube = getYouTubeClient(oauthClient)
  if (!youtube) {
    const authMethod = oauthClient ? 'OAuth' : 'API key'
    console.warn(`Cannot fetch channel details from YouTube API. ${authMethod} authentication not available.`)
    // Return empty map with all channels marked as null
    const result = new Map<string, {
      id: string
      title: string | null
      description: string | null
      thumbnailUrl: string | null
      subscriberCount: number | null
    } | null>()
    for (const channelId of channelIds) {
      result.set(channelId, null)
    }
    return result
  }

  try {
    // Fetch channel details - auth is now in the client, no need to pass key
    const channelsResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: channelIds,
    })

    const result = new Map<string, {
      id: string
      title: string | null
      description: string | null
      thumbnailUrl: string | null
      subscriberCount: number | null
    } | null>()

    // Mark all channels as null initially
    for (const channelId of channelIds) {
      result.set(channelId, null)
    }

    const channels = channelsResponse.data.items || []

    for (const channel of channels) {
      if (!channel.id) continue

      result.set(channel.id, {
        id: channel.id,
        title: channel.snippet?.title || null,
        description: channel.snippet?.description || null,
        thumbnailUrl: channel.snippet?.thumbnails?.medium?.url || 
                      channel.snippet?.thumbnails?.default?.url || 
                      channel.snippet?.thumbnails?.high?.url || 
                      null,
        subscriberCount: channel.statistics?.subscriberCount ? 
          parseInt(channel.statistics.subscriberCount, 10) : null,
      })
    }

    console.log(`Fetched details for ${channels.length} out of ${channelIds.length} channels`)
    return result
  } catch (error: any) {
    // Enhanced error logging
    console.error('Error fetching channel details from YouTube:', error)
    
    // Log detailed error information if available
    if (error.response?.data) {
      console.error('YouTube API Error Response:', JSON.stringify(error.response.data, null, 2))
    }
    if (error.code) {
      console.error('Error Code:', error.code)
    }
    if (error.message) {
      console.error('Error Message:', error.message)
    }
    
    // Check for specific error types and provide helpful messages
    if (error.code === 403) {
      const errorMessage = error.response?.data?.error?.message || error.message
      throw new Error(`YouTube API access denied (403). Check your API key and quota. Details: ${errorMessage}`)
    } else if (error.code === 400) {
      const errorMessage = error.response?.data?.error?.message || error.message
      throw new Error(`YouTube API bad request (400). ${errorMessage}`)
    } else if (error.code === 401) {
      const errorMessage = error.response?.data?.error?.message || error.message
      throw new Error(`YouTube API unauthorized (401). Authentication failed. Details: ${errorMessage}`)
    }
    
    throw error
  }
}

// Process a batch of videos to fetch details from YouTube API
export async function processBatchVideoFetch(batchSize: number = 5): Promise<{ processed: number; unavailable: number }> {
  try {
    // Get batch of videos that need fetching
    const videos = videoQueries.getVideosNeedingFetch(batchSize)
    
    if (videos.length === 0) {
      return { processed: 0, unavailable: 0 }
    }

    const videoIds = videos.map(v => v.youtube_id)
    console.log(`Processing batch of ${videoIds.length} videos`)
    console.log(`Video IDs: ${videoIds.join(', ')}`)

    // For videos.list, API key is preferred over OAuth since it's a public read operation
    // OAuth is better for user-specific operations. Try API key first, then OAuth as fallback
    const apiKey = process.env.YOUTUBE_API_KEY
    let oauthClient: any = null
    
    // Only use OAuth if API key is not available
    // This avoids OAuth scope/permission issues for public video data
    if (!apiKey) {
      try {
        oauthClient = await getAuthenticatedClient()
        console.log('Using OAuth authentication for YouTube API (API key not available)')
      } catch (oauthError: any) {
        if (oauthError.code === 'AUTHENTICATION_REQUIRED') {
          console.log('OAuth not available and API key not set. Cannot fetch video details.')
        } else {
          console.warn('Error getting OAuth client:', oauthError.message)
        }
      }
    } else {
      console.log('Using API key authentication for YouTube API (preferred for public video data)')
    }

    // Fetch details from YouTube API (will use API key if available, otherwise OAuth)
    const videoDetailsMap = await fetchVideoDetailsFromYouTube(videoIds, oauthClient)

    // Collect unique channel IDs
    const channelIdsSet = new Set<string>()
    videoDetailsMap.forEach((details) => {
      if (details?.channelId) {
        channelIdsSet.add(details.channelId)
      }
    })
    const channelIds = Array.from(channelIdsSet)

    // Fetch channel details for all unique channels
    let channelDetailsMap = new Map<string, {
      id: string
      title: string | null
      description: string | null
      thumbnailUrl: string | null
      subscriberCount: number | null
    } | null>()

    if (channelIds.length > 0) {
      console.log(`Fetching details for ${channelIds.length} unique channels`)
      channelDetailsMap = await fetchChannelDetailsFromYouTube(channelIds, oauthClient)
    }

    let processed = 0
    let unavailable = 0

    // Update each video with fetched details and create/update channels
    for (const video of videos) {
      const details = videoDetailsMap.get(video.youtube_id)

      if (details) {
        // Video was successfully fetched
        const updateData: any = {
          title: details.title,
          description: details.description,
          youtube_channel_id: details.channelId,
          published_at: details.publishedAt,
          duration: details.duration ? parseDuration(details.duration) : null,
          fetch_status: 'completed',
          youtube_url: `https://www.youtube.com/watch?v=${video.youtube_id}`,
        }

        // Update thumbnail if we got a better one from API
        if (details.thumbnails.medium?.url || details.thumbnails.high?.url || details.thumbnails.default?.url) {
          updateData.thumbnail_url = details.thumbnails.medium?.url 
            || details.thumbnails.high?.url 
            || details.thumbnails.default?.url
        }

        videoQueries.update(video.id, updateData)

        // Create or update channel if we have channel ID
        if (details.channelId) {
          const channelDetails = channelDetailsMap.get(details.channelId)
          const existingChannel = channelQueries.getByChannelId(details.channelId)

          if (existingChannel) {
            // Update existing channel with latest info
            if (channelDetails) {
              channelQueries.updateByChannelId(details.channelId, {
                channel_title: channelDetails.title || existingChannel.channel_title,
                description: channelDetails.description || existingChannel.description,
                thumbnail_url: channelDetails.thumbnailUrl || existingChannel.thumbnail_url,
                subscriber_count: channelDetails.subscriberCount || existingChannel.subscriber_count,
              })
            } else {
              // Update with what we have from video
              channelQueries.updateByChannelId(details.channelId, {
                channel_title: details.channelTitle || existingChannel.channel_title,
              })
            }
          } else {
            // Create new channel
            if (channelDetails) {
              channelQueries.create({
                youtube_channel_id: details.channelId,
                channel_title: channelDetails.title || details.channelTitle,
                description: channelDetails.description,
                thumbnail_url: channelDetails.thumbnailUrl,
                subscriber_count: channelDetails.subscriberCount,
                is_subscribed: 0,
                custom_tags: null,
              })
            } else {
              // Create with minimal info from video
              channelQueries.create({
                youtube_channel_id: details.channelId,
                channel_title: details.channelTitle,
                description: null,
                thumbnail_url: null,
                subscriber_count: null,
                is_subscribed: 0,
                custom_tags: null,
              })
            }
          }
        }

        processed++
      } else {
        // Video not found or unavailable (private/deleted)
        videoQueries.update(video.id, {
          fetch_status: 'unavailable',
          title: 'Untitled Video',
        })
        unavailable++
      }
    }

    console.log(`Batch processed: ${processed} completed, ${unavailable} unavailable`)
    return { processed, unavailable }
  } catch (error) {
    console.error('Error processing batch video fetch:', error)
    throw error
  }
}

// Continuously fetch video details in batches until all videos are processed
export async function fetchAllVideoDetails(batchSize: number = 5, delayBetweenBatches: number = 1000): Promise<{
  totalProcessed: number
  totalUnavailable: number
  batchesProcessed: number
}> {
  let totalProcessed = 0
  let totalUnavailable = 0
  let batchesProcessed = 0
  const maxBatches = 1000 // Safety limit to prevent infinite loops
  let previousRemaining = Infinity // Track remaining count to detect stuck loops
  let stuckCount = 0 // Count how many times we've seen the same remaining count

  try {
    // Get initial count to show progress
    const initialRemaining = videoQueries.countPendingFetch()
    const estimatedBatches = Math.ceil(initialRemaining / batchSize)
    
    console.log(`Starting continuous video details fetch...`)
    console.log(`Initial count: ${initialRemaining} videos needing fetch (estimated ${estimatedBatches} batches)`)
    
    while (batchesProcessed < maxBatches) {
      const batchResult = await processBatchVideoFetch(batchSize)
      
      totalProcessed += batchResult.processed
      totalUnavailable += batchResult.unavailable
      batchesProcessed++

      // Check if there are more videos to process
      const remaining = videoQueries.countPendingFetch()
      
      if (remaining === 0) {
        console.log(`Video fetch completed. Total processed: ${totalProcessed}, unavailable: ${totalUnavailable}, batches: ${batchesProcessed}`)
        break
      }

      // Detect if we're stuck (same remaining count for multiple batches)
      if (remaining === previousRemaining && batchResult.processed === 0) {
        stuckCount++
        if (stuckCount >= 3) {
          console.warn(`Detected stuck loop: remaining count hasn't changed for ${stuckCount} batches. Stopping to prevent infinite loop.`)
          console.warn(`This might indicate videos are being processed but not properly excluded from the query.`)
          break
        }
      } else {
        stuckCount = 0 // Reset if we made progress
      }
      previousRemaining = remaining

      // Add delay between batches to avoid rate limiting (except for the last batch)
      if (remaining > 0) {
        const progressPercent = Math.round(((initialRemaining - remaining) / initialRemaining) * 100)
        console.log(`Processed batch ${batchesProcessed}/${estimatedBatches} (${progressPercent}%). Remaining: ${remaining}. Continuing...`)
        await delay(delayBetweenBatches)
      }
    }

    if (batchesProcessed >= maxBatches) {
      console.warn(`Video fetch reached safety limit of ${maxBatches} batches. There may be more videos to process.`)
    }

    return {
      totalProcessed,
      totalUnavailable,
      batchesProcessed,
    }
  } catch (error) {
    console.error('Error during continuous video details fetch:', error)
    // Return partial results even on error
    return {
      totalProcessed,
      totalUnavailable,
      batchesProcessed,
    }
  }
}

// Process a single batch of videos for channel_id backfill
async function processBackfillBatch(batchSize: number): Promise<{ processed: number; unavailable: number }> {
  // Get batch of videos that need channel_id backfill
  const videos = videoQueries.getVideosNeedingChannelIdBackfill(batchSize)
  
  if (videos.length === 0) {
    return { processed: 0, unavailable: 0 }
  }

  const videoIds = videos.map(v => v.youtube_id)
  console.log(`Backfilling channel IDs for ${videoIds.length} videos`)

  // Try to get authenticated OAuth client first, fallback to API key
  let oauthClient: any = null
  try {
    oauthClient = await getAuthenticatedClient()
    console.log('Using OAuth authentication for YouTube API (backfill)')
  } catch (oauthError: any) {
    if (oauthError.code === 'AUTHENTICATION_REQUIRED') {
      console.log('OAuth not available, falling back to API key authentication (backfill)')
    } else {
      console.warn('Error getting OAuth client, falling back to API key (backfill):', oauthError.message)
    }
    // Continue with API key fallback
  }

  // Fetch details from YouTube API (will use OAuth if available, otherwise API key)
  const videoDetailsMap = await fetchVideoDetailsFromYouTube(videoIds, oauthClient)

  // Collect unique channel IDs
  const channelIdsSet = new Set<string>()
  videoDetailsMap.forEach((details) => {
    if (details?.channelId) {
      channelIdsSet.add(details.channelId)
    }
  })
  const channelIds = Array.from(channelIdsSet)

  // Fetch channel details for all unique channels
  let channelDetailsMap = new Map<string, {
    id: string
    title: string | null
    description: string | null
    thumbnailUrl: string | null
    subscriberCount: number | null
  } | null>()

  if (channelIds.length > 0) {
    console.log(`Fetching details for ${channelIds.length} unique channels`)
    channelDetailsMap = await fetchChannelDetailsFromYouTube(channelIds, oauthClient)
  }

  let processed = 0
  let unavailable = 0

  // Update each video with channel_id and create/update channels
  for (const video of videos) {
    const details = videoDetailsMap.get(video.youtube_id)

    if (details && details.channelId) {
      // Update video with channel_id
      videoQueries.update(video.id, {
        youtube_channel_id: details.channelId,
      })

      // Create or update channel if we have channel ID
      const channelDetails = channelDetailsMap.get(details.channelId)
      const existingChannel = channelQueries.getByChannelId(details.channelId)

      if (existingChannel) {
        // Update existing channel with latest info
        if (channelDetails) {
          channelQueries.updateByChannelId(details.channelId, {
            channel_title: channelDetails.title || existingChannel.channel_title,
            description: channelDetails.description || existingChannel.description,
            thumbnail_url: channelDetails.thumbnailUrl || existingChannel.thumbnail_url,
            subscriber_count: channelDetails.subscriberCount || existingChannel.subscriber_count,
          })
        } else {
          // Update with what we have from video
          channelQueries.updateByChannelId(details.channelId, {
            channel_title: details.channelTitle || existingChannel.channel_title,
          })
        }
      } else {
        // Create new channel
        if (channelDetails) {
          channelQueries.create({
            youtube_channel_id: details.channelId,
            channel_title: channelDetails.title || details.channelTitle,
            description: channelDetails.description,
            thumbnail_url: channelDetails.thumbnailUrl,
            subscriber_count: channelDetails.subscriberCount,
            is_subscribed: 0,
            custom_tags: null,
          })
        } else {
          // Create with minimal info from video
          channelQueries.create({
            youtube_channel_id: details.channelId,
            channel_title: details.channelTitle,
            description: null,
            thumbnail_url: null,
            subscriber_count: null,
            is_subscribed: 0,
            custom_tags: null,
          })
        }
      }

      processed++
    } else {
      // Video not found or unavailable (private/deleted)
      unavailable++
      console.warn(`Video ${video.youtube_id} not found or unavailable during backfill`)
    }
  }

  console.log(`Backfill batch processed: ${processed} completed, ${unavailable} unavailable`)
  return { processed, unavailable }
}

// Helper function to add delay between batches (to avoid rate limiting)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Backfill youtube_channel_id for existing videos continuously in batches
export async function backfillChannelIds(batchSize: number = 5, delayBetweenBatches: number = 1000): Promise<{
  totalProcessed: number
  totalUnavailable: number
  batchesProcessed: number
}> {
  let totalProcessed = 0
  let totalUnavailable = 0
  let batchesProcessed = 0
  const maxBatches = 1000 // Safety limit to prevent infinite loops

  try {
    console.log('Starting continuous channel ID backfill...')
    
    while (batchesProcessed < maxBatches) {
      const batchResult = await processBackfillBatch(batchSize)
      
      totalProcessed += batchResult.processed
      totalUnavailable += batchResult.unavailable
      batchesProcessed++

      // Check if there are more videos to process
      const remaining = videoQueries.countVideosNeedingChannelIdBackfill()
      
      if (remaining === 0) {
        console.log(`Backfill completed. Total processed: ${totalProcessed}, unavailable: ${totalUnavailable}, batches: ${batchesProcessed}`)
        break
      }

      // Add delay between batches to avoid rate limiting (except for the last batch)
      if (remaining > 0) {
        console.log(`Processed batch ${batchesProcessed}. Remaining: ${remaining}. Continuing...`)
        await delay(delayBetweenBatches)
      }
    }

    if (batchesProcessed >= maxBatches) {
      console.warn(`Backfill reached safety limit of ${maxBatches} batches. There may be more videos to process.`)
    }

    return {
      totalProcessed,
      totalUnavailable,
      batchesProcessed,
    }
  } catch (error) {
    console.error('Error during continuous channel ID backfill:', error)
    // Return partial results even on error
    return {
      totalProcessed,
      totalUnavailable,
      batchesProcessed,
    }
  }
}

// Fetch latest videos from a channel
export async function fetchLatestVideosFromChannel(channelId: string, limit: number = 50): Promise<YouTubeVideoDetails[]> {
  try {
    // Try to get authenticated OAuth client first, fallback to API key
    let oauthClient: any = null
    try {
      oauthClient = await getAuthenticatedClient()
      console.log('Using OAuth authentication for fetching latest videos')
    } catch (oauthError: any) {
      if (oauthError.code === 'AUTHENTICATION_REQUIRED') {
        console.log('OAuth not available, falling back to API key authentication')
      } else {
        console.warn('Error getting OAuth client, falling back to API key:', oauthError.message)
      }
    }

    const youtube = getYouTubeClient(oauthClient)
    if (!youtube) {
      throw new Error('YouTube API authentication not available. Please configure API key or OAuth.')
    }

    const videos: YouTubeVideoDetails[] = []
    let nextPageToken: string | undefined = undefined
    const maxResults = Math.min(limit, 50) // YouTube API max is 50 per page

    do {
      // Use search.list to get latest videos from channel
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        type: 'video',
        order: 'date',
        maxResults: maxResults,
        pageToken: nextPageToken,
      })

      const items = searchResponse.data.items || []
      
      if (items.length === 0) {
        break
      }

      // Extract video IDs from search results
      const videoIds = items
        .map(item => item.id?.videoId)
        .filter((id): id is string => !!id)

      if (videoIds.length === 0) {
        break
      }

      // Fetch full video details using videos.list (includes duration, etc.)
      const videoDetailsMap = await fetchVideoDetailsFromYouTube(videoIds, oauthClient)

      // Convert to YouTubeVideoDetails array
      for (const videoId of videoIds) {
        const details = videoDetailsMap.get(videoId)
        if (details) {
          videos.push(details)
        }
      }

      // Check if we've reached the limit
      if (videos.length >= limit) {
        break
      }

      nextPageToken = searchResponse.data.nextPageToken || undefined
    } while (nextPageToken && videos.length < limit)

    // Limit to requested number
    const result = videos.slice(0, limit)
    console.log(`Fetched ${result.length} latest videos from channel ${channelId}`)
    return result
  } catch (error: any) {
    console.error('Error fetching latest videos from channel:', error)
    throw error
  }
}

// Fetch subscribed channels from YouTube API
export async function fetchSubscribedChannels(): Promise<Array<{
  channelId: string
  channelTitle: string
  description: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
}>> {
  try {
    // Get authenticated OAuth2 client
    const authClient = await getAuthenticatedClient()
    const youtube = google.youtube({ version: 'v3', auth: authClient })

    const subscribedChannels: Array<{
      channelId: string
      channelTitle: string
      description: string | null
      thumbnailUrl: string | null
      publishedAt: string | null
    }> = []

    let nextPageToken: string | undefined = undefined

    do {
      // Fetch subscriptions (max 50 per page)
      const response: any = await youtube.subscriptions.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
        pageToken: nextPageToken,
        order: 'alphabetical',
      })

      const items = response.data.items || []

      for (const subscription of items) {
        const snippet = subscription.snippet
        if (!snippet || !snippet.resourceId?.channelId) continue

        subscribedChannels.push({
          channelId: snippet.resourceId.channelId,
          channelTitle: snippet.title || 'Unknown Channel',
          description: snippet.description || null,
          thumbnailUrl: snippet.thumbnails?.medium?.url || 
                        snippet.thumbnails?.default?.url || 
                        snippet.thumbnails?.high?.url || 
                        null,
          publishedAt: snippet.publishedAt || null,
        })
      }

      nextPageToken = response.data.nextPageToken || undefined
    } while (nextPageToken)

    console.log(`Fetched ${subscribedChannels.length} subscribed channels`)
    return subscribedChannels
  } catch (error: any) {
    if (error.code === 'AUTHENTICATION_REQUIRED') {
      throw error // Re-throw to be handled by route
    }
    console.error('Error fetching subscribed channels:', error)
    throw error
  }
}

