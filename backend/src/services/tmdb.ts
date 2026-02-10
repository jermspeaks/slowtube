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
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  }
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
export async function findTmdbIdByImdbId(imdbId: string): Promise<{ tmdbId: number; mediaType: 'movie' | 'tv' } | null> {
  try {
    // Pass the full IMDb ID (including 'tt' prefix) directly to the API
    // Format: /find/{external_id}?external_source=imdb_id
    const data = await tmdbRequest(`/find/${imdbId}`, {
      external_source: 'imdb_id',
    }) as {
      movie_results?: Array<{ id: number }>
      tv_results?: Array<{ id: number }>
      tv_episode_results?: Array<{ id: number }>
      person_results?: Array<{ id: number }>
    }

    // Prefer movie_results over tv_results when both exist
    if (data.movie_results && data.movie_results.length > 0) {
      const tmdbId = data.movie_results[0].id
      console.log(`Found TMDB movie ID ${tmdbId} for IMDb ID ${imdbId}`)
      return { tmdbId, mediaType: 'movie' }
    }
    if (data.tv_results && data.tv_results.length > 0) {
      const tmdbId = data.tv_results[0].id
      console.log(`Found TMDB TV ID ${tmdbId} for IMDb ID ${imdbId}`)
      return { tmdbId, mediaType: 'tv' }
    }

    console.warn(`No TMDB ID found for IMDb ID ${imdbId}`)
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
      // Check if it's a 404 error by parsing the error message
      // Error format: "TMDB API error: 404 - ..."
      if (tvError.message?.includes('404')) {
        try {
          await tmdbRequest(`/movie/${tmdbId}`)
          return 'movie'
        } catch (movieError: any) {
          if (movieError.message?.includes('404')) {
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

// Search movies on TMDB
export async function searchMovies(query: string) {
  try {
    const data = await tmdbRequest('/search/movie', {
      query,
      include_adult: false,
    }) as {
      results: Array<{
        id: number
        title: string
        overview: string | null
        poster_path: string | null
        backdrop_path: string | null
        release_date: string | null
        popularity: number
      }>
      total_results: number
      total_pages: number
    }
    return data.results.map(result => ({
      tmdb_id: result.id,
      title: result.title,
      overview: result.overview || null,
      poster_path: result.poster_path || null,
      backdrop_path: result.backdrop_path || null,
      release_date: result.release_date || null,
      popularity: result.popularity,
    }))
  } catch (error: any) {
    console.error(`Error searching movies for query "${query}":`, error.message)
    throw error
  }
}

// Search TV shows on TMDB
export async function searchTVShows(query: string) {
  try {
    const data = await tmdbRequest('/search/tv', {
      query,
      include_adult: false,
    }) as {
      results: Array<{
        id: number
        name: string
        overview: string | null
        poster_path: string | null
        backdrop_path: string | null
        first_air_date: string | null
        popularity: number
      }>
      total_results: number
      total_pages: number
    }
    return data.results.map(result => ({
      tmdb_id: result.id,
      title: result.name,
      overview: result.overview || null,
      poster_path: result.poster_path || null,
      backdrop_path: result.backdrop_path || null,
      first_air_date: result.first_air_date || null,
      popularity: result.popularity,
    }))
  } catch (error: any) {
    console.error(`Error searching TV shows for query "${query}":`, error.message)
    throw error
  }
}

// Shared DTO shape for discovery TV show lists
export type DiscoveryTVShowItem = {
  tmdb_id: number
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
}

function mapTVResultToDiscovery(item: {
  id: number
  name?: string
  title?: string
  overview?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  first_air_date?: string | null
}): DiscoveryTVShowItem {
  return {
    tmdb_id: item.id,
    title: item.name ?? item.title ?? '',
    overview: item.overview ?? null,
    poster_path: item.poster_path ?? null,
    backdrop_path: item.backdrop_path ?? null,
    first_air_date: item.first_air_date ?? null,
  }
}

// Trending TV shows (week)
export async function getTrendingTV(): Promise<DiscoveryTVShowItem[]> {
  const data = await tmdbRequest('/trending/tv/week') as {
    results: Array<{
      id: number
      name?: string
      overview?: string | null
      poster_path?: string | null
      backdrop_path?: string | null
      first_air_date?: string | null
    }>
  }
  return (data.results ?? []).map(mapTVResultToDiscovery)
}

// Popular TV shows
export async function getPopularTV(): Promise<DiscoveryTVShowItem[]> {
  const data = await tmdbRequest('/tv/popular') as {
    results: Array<{
      id: number
      name?: string
      overview?: string | null
      poster_path?: string | null
      backdrop_path?: string | null
      first_air_date?: string | null
    }>
  }
  return (data.results ?? []).map(mapTVResultToDiscovery)
}

// TV shows on the air (currently airing)
export async function getOnTheAirTV(): Promise<DiscoveryTVShowItem[]> {
  const data = await tmdbRequest('/tv/on_the_air') as {
    results: Array<{
      id: number
      name?: string
      overview?: string | null
      poster_path?: string | null
      backdrop_path?: string | null
      first_air_date?: string | null
    }>
  }
  return (data.results ?? []).map(mapTVResultToDiscovery)
}

