const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// Get TMDB API key and access token from environment
function getTMDBConfig() {
  const apiKey = process.env.TMDB_API_KEY
  const accessToken = process.env.TMDB_READ_ACCESS_TOKEN

  if (!apiKey && !accessToken) {
    throw new Error('TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN must be set in environment variables')
  }

  return {
    apiKey,
    accessToken,
  }
}

// Helper to get image URL
export function getImageUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

// Helper to make TMDB API requests
async function tmdbRequest(endpoint: string, params: Record<string, any> = {}) {
  const config = getTMDBConfig()
  
  const headers: Record<string, string> = {}
  if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  const requestParams: Record<string, any> = { ...params }
  if (config.apiKey) {
    requestParams['api_key'] = config.apiKey
  }

  // Build URL with query parameters
  const url = new URL(`${TMDB_API_BASE}${endpoint}`)
  Object.entries(requestParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })

  try {
    const response = await fetch(url.toString(), {
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`TMDB API error: ${response.status} - ${errorData?.status_message || response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    if (error.message && error.message.includes('TMDB API error')) {
      throw error
    }
    throw new Error(`TMDB API request failed: ${error.message}`)
  }
}

// Find TMDB ID from IMDb ID
export async function findTmdbIdByImdbId(imdbId: string): Promise<number | null> {
  try {
    // Pass the full IMDb ID (including 'tt' prefix) directly to the API
    const data = await tmdbRequest(`/find/${imdbId}`, {
      external_source: 'imdb_id',
    }) as {
      movie_results?: Array<{ id: number }>
      tv_results?: Array<{ id: number }>
    }

    // Prefer movie_results over tv_results when both exist
    if (data.movie_results && data.movie_results.length > 0) {
      return data.movie_results[0].id
    }
    if (data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id
    }

    return null
  } catch (error: any) {
    console.error(`Error finding TMDB ID for IMDb ID ${imdbId}:`, error.message)
    return null
  }
}

// Determine if a TMDB ID is a movie or TV show
export async function getMediaType(tmdbId: number): Promise<'movie' | 'tv' | null> {
  try {
    // Try TV first
    try {
      await tmdbRequest(`/tv/${tmdbId}`)
      return 'tv'
    } catch (tvError: any) {
      // If 404, try movie
      if (tvError.response?.status === 404) {
        try {
          await tmdbRequest(`/movie/${tmdbId}`)
          return 'movie'
        } catch (movieError: any) {
          if (movieError.response?.status === 404) {
            return null
          }
          throw movieError
        }
      }
      throw tvError
    }
  } catch (error: any) {
    console.error(`Error determining media type for TMDB ID ${tmdbId}:`, error.message)
    return null
  }
}

// Fetch TV show details
export async function fetchTVShowDetails(tmdbId: number) {
  try {
    const data = await tmdbRequest(`/tv/${tmdbId}`)
    return {
      tmdb_id: data.id,
      title: data.name,
      overview: data.overview || null,
      poster_path: data.poster_path || null,
      backdrop_path: data.backdrop_path || null,
      first_air_date: data.first_air_date || null,
      last_air_date: data.last_air_date || null,
      status: data.status || null,
    }
  } catch (error: any) {
    console.error(`Error fetching TV show details for TMDB ID ${tmdbId}:`, error.message)
    throw error
  }
}

// Fetch movie details
export async function fetchMovieDetails(tmdbId: number) {
  try {
    const data = await tmdbRequest(`/movie/${tmdbId}`)
    return {
      tmdb_id: data.id,
      imdb_id: data.imdb_id || null,
      title: data.title,
      overview: data.overview || null,
      poster_path: data.poster_path || null,
      backdrop_path: data.backdrop_path || null,
      release_date: data.release_date || null,
    }
  } catch (error: any) {
    console.error(`Error fetching movie details for TMDB ID ${tmdbId}:`, error.message)
    throw error
  }
}

// Fetch all episodes for a TV show
export async function fetchTVShowEpisodes(tmdbId: number) {
  try {
    // First, get the number of seasons
    const tvShowData = await tmdbRequest(`/tv/${tmdbId}`)
    const numberOfSeasons = tvShowData.number_of_seasons || 0

    const allEpisodes: Array<{
      season_number: number
      episode_number: number
      name: string | null
      overview: string | null
      air_date: string | null
      runtime: number | null
      still_path: string | null
    }> = []

    // Fetch episodes for each season
    for (let seasonNum = 1; seasonNum <= numberOfSeasons; seasonNum++) {
      try {
        const seasonData = await tmdbRequest(`/tv/${tmdbId}/season/${seasonNum}`)
        
        if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
          for (const episode of seasonData.episodes) {
            allEpisodes.push({
              season_number: episode.season_number || seasonNum,
              episode_number: episode.episode_number,
              name: episode.name || null,
              overview: episode.overview || null,
              air_date: episode.air_date || null,
              runtime: episode.runtime || null,
              still_path: episode.still_path || null,
            })
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250))
      } catch (seasonError: any) {
        console.warn(`Error fetching season ${seasonNum} for TV show ${tmdbId}:`, seasonError.message)
        // Continue with next season
      }
    }

    return allEpisodes
  } catch (error: any) {
    console.error(`Error fetching episodes for TV show ${tmdbId}:`, error.message)
    throw error
  }
}

// Fetch media details (movie or TV show) by TMDB ID
export async function fetchMediaDetails(tmdbId: number, type: 'movie' | 'tv') {
  if (type === 'tv') {
    return await fetchTVShowDetails(tmdbId)
  } else {
    return await fetchMovieDetails(tmdbId)
  }
}

