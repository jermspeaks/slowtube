import { google } from 'googleapis'
import { getAuthenticatedClient } from '../routes/auth.js'
import { videoQueries, videoStateQueries } from './database.js'

export interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: {
      default?: { url: string }
      medium?: { url: string }
      high?: { url: string }
    }
  }
  contentDetails?: {
    duration: string
  }
}

// Get user's watch later playlist ID
async function getWatchLaterPlaylistId(auth: any): Promise<string> {
  const youtube = google.youtube({ version: 'v3', auth })
  
  // First, get the user's channel ID
  const channelResponse = await youtube.channels.list({
    part: ['contentDetails'],
    mine: true,
  })

  const channel = channelResponse.data.items?.[0]
  if (!channel?.contentDetails?.relatedPlaylists?.watchLater) {
    throw new Error('Watch later playlist not found')
  }

  return channel.contentDetails.relatedPlaylists.watchLater
}

// Fetch all videos from watch later playlist
export async function fetchWatchLaterVideos(): Promise<YouTubeVideo[]> {
  const auth = await getAuthenticatedClient()
  const youtube = google.youtube({ version: 'v3', auth })

  try {
    // Get watch later playlist ID
    const playlistId = await getWatchLaterPlaylistId(auth)

    const allVideos: YouTubeVideo[] = []
    let nextPageToken: string | undefined = undefined

    do {
      // Fetch playlist items
      const playlistResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
      })

      const items = playlistResponse.data.items || []
      
      // Get video IDs
      const videoIds = items
        .map(item => item.contentDetails?.videoId)
        .filter((id): id is string => !!id)

      if (videoIds.length > 0) {
        // Fetch video details
        const videosResponse = await youtube.videos.list({
          part: ['snippet', 'contentDetails'],
          id: videoIds,
        })

        const videos = videosResponse.data.items || []
        allVideos.push(...(videos as YouTubeVideo[]))
      }

      nextPageToken = playlistResponse.data.nextPageToken || undefined
    } while (nextPageToken)

    return allVideos
  } catch (error) {
    console.error('Error fetching watch later videos:', error)
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

// Import videos into database
export async function importVideos(): Promise<{ imported: number; updated: number }> {
  try {
    const youtubeVideos = await fetchWatchLaterVideos()
    let imported = 0
    let updated = 0

    for (const youtubeVideo of youtubeVideos) {
      const existingVideo = videoQueries.getByYoutubeId(youtubeVideo.id)

      const videoData = {
        youtube_id: youtubeVideo.id,
        title: youtubeVideo.snippet.title,
        description: youtubeVideo.snippet.description || null,
        thumbnail_url: youtubeVideo.snippet.thumbnails.medium?.url 
          || youtubeVideo.snippet.thumbnails.high?.url 
          || youtubeVideo.snippet.thumbnails.default?.url 
          || null,
        duration: youtubeVideo.contentDetails?.duration 
          ? parseDuration(youtubeVideo.contentDetails.duration)
          : null,
        published_at: youtubeVideo.snippet.publishedAt || null,
      }

      if (existingVideo) {
        // Update existing video
        videoQueries.update(existingVideo.id, videoData)
        updated++
      } else {
        // Create new video
        const videoId = videoQueries.create(videoData)
        
        // Set initial state to 'feed'
        videoStateQueries.setState(videoId, 'feed')
        imported++
      }
    }

    return { imported, updated }
  } catch (error) {
    console.error('Error importing videos:', error)
    throw error
  }
}

