import Papa from 'papaparse'
import { google } from 'googleapis'
import { getAuthenticatedClient } from '../routes/auth.js'
import { videoQueries, videoStateQueries } from './database.js'

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
    
    if (directVideoId && typeof directVideoId === 'string' && directVideoId.trim().length === 11) {
      // Looks like a valid YouTube video ID (11 characters)
      videoId = directVideoId.trim()
    } else {
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
export function importVideosFromTakeout(data: any, format: 'json' | 'csv' = 'json'): { imported: number; updated: number } {
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
    let firstImported = false

    for (const video of parsedVideos) {
      const existingVideo = videoQueries.getByYoutubeId(video.id)

      const videoData = {
        youtube_id: video.id,
        title: 'Untitled Video', // Will be updated by YouTube API fetch
        description: null, // Will be updated by YouTube API fetch
        thumbnail_url: getThumbnailUrl(video.id), // Temporary thumbnail, may be updated by API
        duration: null, // Will be updated by YouTube API fetch
        published_at: null, // Will be fetched from YouTube API
        added_to_playlist_at: video.watchedAt, // Store CSV timestamp here
        fetch_status: 'pending' as const, // Mark as pending for YouTube API fetch
        channel_title: null, // Will be updated by YouTube API fetch
        youtube_url: `https://www.youtube.com/watch?v=${video.id}`, // Construct URL from video ID
      }

      if (existingVideo) {
        // Update existing video - only update if it's not already fetched
        if (existingVideo.fetch_status !== 'completed') {
          // Update added_to_playlist_at if it's newer
          const updateData: any = {
            added_to_playlist_at: video.watchedAt,
            youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
          }
          // Only update fetch_status if it's not already set
          if (!existingVideo.fetch_status || existingVideo.fetch_status === 'pending') {
            updateData.fetch_status = 'pending'
          }
          videoQueries.update(existingVideo.id, updateData)
          updated++
        }
        if (!firstImported) {
          console.log('First video updated:', {
            id: existingVideo.id,
            youtube_id: video.id,
            added_to_playlist_at: video.watchedAt,
          })
          firstImported = true
        }
      } else {
        // Create new video
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

    console.log(`Import complete: ${imported} imported, ${updated} updated`)
    return { imported, updated }
  } catch (error) {
    console.error('Error importing videos:', error)
    throw error
  }
}

// YouTube API video details interface
export interface YouTubeVideoDetails {
  id: string
  title: string
  description: string | null
  channelTitle: string | null
  publishedAt: string | null
  duration: string | null
  thumbnails: {
    default?: { url: string }
    medium?: { url: string }
    high?: { url: string }
  }
}

// Fetch video details from YouTube API in batches
export async function fetchVideoDetailsFromYouTube(videoIds: string[]): Promise<Map<string, YouTubeVideoDetails | null>> {
  if (videoIds.length === 0) {
    return new Map()
  }

  if (videoIds.length > 50) {
    throw new Error('Cannot fetch more than 50 videos at once')
  }

  try {
    const auth = await getAuthenticatedClient()
    const youtube = google.youtube({ version: 'v3', auth })

    // Fetch video details
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    })

    const result = new Map<string, YouTubeVideoDetails | null>()
    
    // Mark all videos as null initially
    for (const videoId of videoIds) {
      result.set(videoId, null)
    }

    const videos = videosResponse.data.items || []
    
    for (const video of videos) {
      if (!video.id) continue

      const details: YouTubeVideoDetails = {
        id: video.id,
        title: video.snippet?.title || 'Untitled Video',
        description: video.snippet?.description || null,
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
  } catch (error) {
    console.error('Error fetching video details from YouTube:', error)
    throw error
  }
}

// Convert YouTube duration (ISO 8601) to readable format
function parseDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return duration

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0) parts.push(`${seconds}s`)

  return parts.join(' ') || '0s'
}

// Process a batch of videos to fetch details from YouTube API
export async function processBatchVideoFetch(batchSize: number = 50): Promise<{ processed: number; unavailable: number }> {
  try {
    // Get batch of videos that need fetching
    const videos = videoQueries.getVideosNeedingFetch(batchSize)
    
    if (videos.length === 0) {
      return { processed: 0, unavailable: 0 }
    }

    const videoIds = videos.map(v => v.youtube_id)
    console.log(`Processing batch of ${videoIds.length} videos`)

    // Fetch details from YouTube API
    const videoDetailsMap = await fetchVideoDetailsFromYouTube(videoIds)

    let processed = 0
    let unavailable = 0

    // Update each video with fetched details
    for (const video of videos) {
      const details = videoDetailsMap.get(video.youtube_id)

      if (details) {
        // Video was successfully fetched
        const updateData: any = {
          title: details.title,
          description: details.description,
          channel_title: details.channelTitle,
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

