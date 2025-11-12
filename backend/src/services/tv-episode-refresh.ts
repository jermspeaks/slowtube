import { tvShowQueries, episodeQueries, tvShowStateQueries } from './database.js'
import { fetchTVShowEpisodes } from './tmdb.js'

export interface RefreshResult {
  tvShowId: number
  tvShowTitle: string
  success: boolean
  newEpisodes: number
  updatedEpisodes: number
  error?: string
}

export interface RefreshAllResult {
  total: number
  successful: number
  failed: number
  results: RefreshResult[]
}

/**
 * Refresh episodes for a single TV show
 * @param tvShowId - The database ID of the TV show
 * @returns Refresh result with counts of new and updated episodes
 */
export async function refreshTVShowEpisodes(tvShowId: number): Promise<RefreshResult> {
  const tvShow = tvShowQueries.getById(tvShowId)
  if (!tvShow) {
    throw new Error(`TV show with ID ${tvShowId} not found`)
  }

  try {
    // Get existing episodes to preserve watched status
    const existingEpisodes = episodeQueries.getByTVShowId(tvShowId)
    const existingEpisodesMap = new Map<string, { is_watched: number; watched_at: string | null }>()
    
    for (const ep of existingEpisodes) {
      const key = `${ep.season_number}-${ep.episode_number}`
      existingEpisodesMap.set(key, {
        is_watched: ep.is_watched,
        watched_at: ep.watched_at,
      })
    }

    // Fetch latest episodes from TMDB
    const episodes = await fetchTVShowEpisodes(tvShow.tmdb_id)
    
    let newEpisodes = 0
    let updatedEpisodes = 0

    // Create or update episodes
    for (const episodeData of episodes) {
      const key = `${episodeData.season_number}-${episodeData.episode_number}`
      const existing = existingEpisodesMap.get(key)
      
      // Preserve watched status if episode already exists
      const isWatched = existing?.is_watched || 0
      const watchedAt = existing?.watched_at || null

      try {
        // Check if this is a new episode
        const wasNew = existing === undefined
        
        episodeQueries.create({
          tv_show_id: tvShowId,
          season_number: episodeData.season_number,
          episode_number: episodeData.episode_number,
          name: episodeData.name,
          overview: episodeData.overview,
          air_date: episodeData.air_date,
          runtime: episodeData.runtime,
          still_path: episodeData.still_path,
          is_watched: isWatched,
          watched_at: watchedAt,
        })

        if (wasNew) {
          newEpisodes++
        } else {
          updatedEpisodes++
        }
      } catch (epError: any) {
        // Skip duplicate episodes (already handled by ON CONFLICT in create)
        if (!epError.message?.includes('UNIQUE constraint')) {
          console.warn(`Error creating/updating episode S${episodeData.season_number}E${episodeData.episode_number} for TV show ${tvShow.title}:`, epError.message)
        }
      }
    }

    return {
      tvShowId,
      tvShowTitle: tvShow.title,
      success: true,
      newEpisodes,
      updatedEpisodes,
    }
  } catch (error: any) {
    console.error(`Error refreshing episodes for TV show ${tvShow.title} (ID: ${tvShowId}):`, error.message)
    return {
      tvShowId,
      tvShowTitle: tvShow.title,
      success: false,
      newEpisodes: 0,
      updatedEpisodes: 0,
      error: error.message,
    }
  }
}

/**
 * Refresh episodes for all TV shows
 * @param includeArchived - Whether to include archived TV shows (default: false)
 * @returns Summary of refresh results
 */
export async function refreshAllTVShowEpisodes(includeArchived: boolean = false): Promise<RefreshAllResult> {
  // Get all TV shows (optionally excluding archived)
  const tvShows = tvShowQueries.getAll(includeArchived)
  
  const results: RefreshResult[] = []
  let successful = 0
  let failed = 0

  console.log(`Starting refresh for ${tvShows.length} TV show(s)...`)

  // Refresh each TV show with a delay to avoid rate limiting
  for (let i = 0; i < tvShows.length; i++) {
    const tvShow = tvShows[i]

    console.log(`Refreshing episodes for: ${tvShow.title} (${i + 1}/${tvShows.length})`)
    
    const result = await refreshTVShowEpisodes(tvShow.id)
    results.push(result)

    if (result.success) {
      successful++
      console.log(`  ✓ ${tvShow.title}: ${result.newEpisodes} new, ${result.updatedEpisodes} updated`)
    } else {
      failed++
      console.log(`  ✗ ${tvShow.title}: ${result.error}`)
    }

    // Add delay between TV shows to avoid rate limiting (except for the last one)
    if (i < tvShows.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const summary: RefreshAllResult = {
    total: tvShows.length,
    successful,
    failed,
    results,
  }

  console.log(`Refresh complete: ${successful} successful, ${failed} failed out of ${tvShows.length} total`)
  
  return summary
}

