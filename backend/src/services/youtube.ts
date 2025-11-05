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
  
  try {
    // First, try to get it from channel's relatedPlaylists
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true,
    })
    
    const channel = channelResponse.data.items?.[0]
    
    if (channel?.contentDetails?.relatedPlaylists?.watchLater) {
      return channel.contentDetails.relatedPlaylists.watchLater
    }

    // If not found in relatedPlaylists, try using the special "WL" playlist ID
    // This is a special playlist ID that YouTube uses for watch later
    console.log('Watch later not found in relatedPlaylists, trying special WL playlist ID...')
    
    // Try to access the WL playlist to verify it exists
    try {
      const testResponse = await youtube.playlistItems.list({
        part: ['id'],
        playlistId: 'WL',
        maxResults: 1,
      })
      console.log(testResponse.data);
      
      if (testResponse.data !== undefined) {
        console.log('Successfully accessed WL playlist')
        return 'WL'
      }
    } catch (wlError: any) {
      console.error('WL playlist test failed:', wlError.message)
      // If WL doesn't work, try searching through playlists
      console.log('Searching through user playlists for watch later playlist...')
      
      let nextPageToken: string | undefined = undefined
      const maxPages = 5 // Limit to prevent infinite loops
      
      for (let page = 0; page < maxPages; page++) {
        const playlistsResponse = await youtube.playlists.list({
          part: ['id', 'snippet'],
          mine: true,
          maxResults: 50,
          pageToken: nextPageToken,
        })

        const playlists = playlistsResponse.data.items || []
        
        // Look for watch later playlist by title (it's usually called "Watch later" in English)
        // Also check for common variations
        const watchLaterPlaylist = playlists.find((playlist: any) => {
          const title = playlist.snippet?.title?.toLowerCase() || ''
          return title.includes('watch later') || 
                 title === 'watch later' ||
                 title === 'watchlater'
        })

        if (watchLaterPlaylist?.id) {
          console.log('Found watch later playlist:', watchLaterPlaylist.id, watchLaterPlaylist.snippet?.title)
          return watchLaterPlaylist.id
        }

        nextPageToken = playlistsResponse.data.nextPageToken || undefined
        if (!nextPageToken) {
          break
        }
      }
    }

    throw new Error('Watch later playlist not found. Please ensure your YouTube account has a watch later playlist.')
  } catch (error: any) {
    console.error('Error getting watch later playlist ID:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    })
    
    throw new Error(`Watch later playlist not found: ${error.message}`)
  }
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
        
        // Log first video entry if this is the first batch
        if (allVideos.length > 0 && allVideos.length === videos.length) {
          const firstVideo = allVideos[0]
          console.log('First video entry:', {
            id: firstVideo.id,
            title: firstVideo.snippet.title,
            publishedAt: firstVideo.snippet.publishedAt,
          })
        }
      }

      nextPageToken = playlistResponse.data.nextPageToken || undefined
    } while (nextPageToken)

    console.log(`Fetched ${allVideos.length} videos from watch later playlist`)
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
    let firstImported = false

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
        if (!firstImported) {
          console.log('First video updated:', {
            id: existingVideo.id,
            youtube_id: youtubeVideo.id,
            title: videoData.title,
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
            youtube_id: youtubeVideo.id,
            title: videoData.title,
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

