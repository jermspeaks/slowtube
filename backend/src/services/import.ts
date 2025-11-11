import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { tvShowQueries, movieQueries, episodeQueries } from './database.js'
import { 
  findTmdbIdByImdbId, 
  getMediaType, 
  fetchTVShowDetails, 
  fetchMovieDetails, 
  fetchTVShowEpisodes 
} from './tmdb.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Parse data.json entry
interface DataEntry {
  id: string // e.g., "tmdb:1029955" or "tt0035093"
  savedAt: number // timestamp in milliseconds
}

// Parse data.json or data2.json file
function parseDataJson(filePath: string): DataEntry[] {
  const fullPath = path.join(__dirname, '../../../', filePath)
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${filePath} file not found in project root`)
  }

  const fileContent = fs.readFileSync(fullPath, 'utf-8')
  const data = JSON.parse(fileContent)

  if (!data.result || !Array.isArray(data.result)) {
    throw new Error(`Invalid ${filePath} format: expected result array`)
  }

  return data.result.map((entry: [string, number]) => ({
    id: entry[0],
    savedAt: entry[1],
  }))
}

// Extract ID and type from entry ID
function parseEntryId(entryId: string, expectedType?: 'tmdb' | 'imdb'): { type: 'tmdb' | 'imdb' | 'other', id: string } {
  // If expected type is provided, use it
  if (expectedType === 'tmdb') {
    return { type: 'tmdb', id: entryId }
  } else if (expectedType === 'imdb') {
    return { type: 'imdb', id: entryId }
  }

  // Auto-detect based on format
  if (entryId.startsWith('tmdb:')) {
    return { type: 'tmdb', id: entryId.replace('tmdb:', '') }
  } else if (entryId.startsWith('tt')) {
    return { type: 'imdb', id: entryId }
  } else if (/^\d+$/.test(entryId)) {
    // Numeric IDs are treated as TMDB IDs
    return { type: 'tmdb', id: entryId }
  } else {
    return { type: 'other', id: entryId }
  }
}

// Convert timestamp to ISO string
function timestampToISO(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

// Import a single entry
async function importEntry(entry: DataEntry, expectedType?: 'tmdb' | 'imdb'): Promise<{ type: 'tv' | 'movie' | 'skipped', tmdbId?: number }> {
  const { type, id } = parseEntryId(entry.id, expectedType)
  let tmdbId: number | null = null
  let mediaType: 'movie' | 'tv' | null = null

  // Handle TMDB IDs
  if (type === 'tmdb') {
    tmdbId = parseInt(id, 10)
    if (isNaN(tmdbId)) {
      console.warn(`Invalid TMDB ID: ${id}`)
      return { type: 'skipped' }
    }

    // Determine if it's a movie or TV show
    mediaType = await getMediaType(tmdbId)
    if (!mediaType) {
      console.warn(`Could not determine media type for TMDB ID: ${tmdbId}`)
      return { type: 'skipped' }
    }
  }
  // Handle IMDb IDs
  else if (type === 'imdb') {
    tmdbId = await findTmdbIdByImdbId(id)
    if (!tmdbId) {
      console.warn(`Could not find TMDB ID for IMDb ID: ${id}`)
      return { type: 'skipped' }
    }

    // Determine if it's a movie or TV show
    mediaType = await getMediaType(tmdbId)
    if (!mediaType) {
      console.warn(`Could not determine media type for TMDB ID: ${tmdbId} (from IMDb: ${id})`)
      return { type: 'skipped' }
    }
  }
  // Skip other types
  else {
    console.warn(`Skipping entry with unsupported ID format: ${entry.id}`)
    return { type: 'skipped' }
  }

  const savedAtISO = timestampToISO(entry.savedAt)

  // Import as TV show
  if (mediaType === 'tv') {
    try {
      // Check if TV show already exists
      const existing = tvShowQueries.getByTmdbId(tmdbId)
      
      if (existing) {
        // Update saved_at if it's newer
        if (!existing.saved_at || new Date(savedAtISO) > new Date(existing.saved_at)) {
          tvShowQueries.update(existing.id, { saved_at: savedAtISO })
        }
        console.log(`TV show already exists: ${existing.title} (TMDB: ${tmdbId})`)
      } else {
        // Fetch TV show details
        const tvShowData = await fetchTVShowDetails(tmdbId)
        
        // Create TV show
        const tvShowId = tvShowQueries.create({
          ...tvShowData,
          saved_at: savedAtISO,
        })

        console.log(`Imported TV show: ${tvShowData.title} (TMDB: ${tmdbId}, DB ID: ${tvShowId})`)

        // Fetch and import all episodes
        try {
          const episodes = await fetchTVShowEpisodes(tmdbId)
          let episodeCount = 0

          for (const episodeData of episodes) {
            try {
              episodeQueries.create({
                tv_show_id: tvShowId,
                season_number: episodeData.season_number,
                episode_number: episodeData.episode_number,
                name: episodeData.name,
                overview: episodeData.overview,
                air_date: episodeData.air_date,
                runtime: episodeData.runtime,
                still_path: episodeData.still_path,
                is_watched: 0,
                watched_at: null,
              })
              episodeCount++
            } catch (epError: any) {
              // Skip duplicate episodes (already handled by ON CONFLICT in create)
              if (!epError.message?.includes('UNIQUE constraint')) {
                console.warn(`Error importing episode S${episodeData.season_number}E${episodeData.episode_number}:`, epError.message)
              }
            }
          }

          console.log(`  Imported ${episodeCount} episodes for ${tvShowData.title}`)
        } catch (episodesError: any) {
          console.warn(`Error fetching episodes for TV show ${tmdbId}:`, episodesError.message)
        }
      }

      return { type: 'tv', tmdbId }
    } catch (error: any) {
      console.error(`Error importing TV show ${tmdbId}:`, error.message)
      return { type: 'skipped' }
    }
  }
  // Import as movie
  else if (mediaType === 'movie') {
    try {
      // Check if movie already exists
      const existing = movieQueries.getByTmdbId(tmdbId)
      
      if (existing) {
        // Update saved_at if it's newer
        if (!existing.saved_at || new Date(savedAtISO) > new Date(existing.saved_at)) {
          movieQueries.update(existing.id, { saved_at: savedAtISO })
        }
        console.log(`Movie already exists: ${existing.title} (TMDB: ${tmdbId})`)
      } else {
        // Fetch movie details
        const movieData = await fetchMovieDetails(tmdbId)
        
        // Create movie
        const movieId = movieQueries.create({
          ...movieData,
          saved_at: savedAtISO,
        })

        console.log(`Imported movie: ${movieData.title} (TMDB: ${tmdbId}, DB ID: ${movieId})`)
      }

      return { type: 'movie', tmdbId }
    } catch (error: any) {
      console.error(`Error importing movie ${tmdbId}:`, error.message)
      return { type: 'skipped' }
    }
  }

  return { type: 'skipped' }
}

// Import all entries from a data file
async function importFromDataFile(filePath: string, expectedType: 'tmdb' | 'imdb'): Promise<{
  total: number
  imported: number
  tvShows: number
  movies: number
  skipped: number
  errors: number
}> {
  console.log(`Starting import from ${filePath} (${expectedType.toUpperCase()} IDs)...`)

  const entries = parseDataJson(filePath)
  console.log(`Found ${entries.length} entries to process`)

  let imported = 0
  let tvShows = 0
  let movies = 0
  let skipped = 0
  let errors = 0

  // Process entries with a delay to avoid rate limiting
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    
    try {
      const result = await importEntry(entry, expectedType)
      
      if (result.type === 'tv') {
        imported++
        tvShows++
      } else if (result.type === 'movie') {
        imported++
        movies++
      } else {
        skipped++
      }

      // Add delay between requests to avoid rate limiting (except for last entry)
      if (i < entries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
      }

      // Log progress every 10 entries
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${entries.length} entries processed`)
      }
    } catch (error: any) {
      console.error(`Error processing entry ${entry.id}:`, error.message)
      errors++
    }
  }

  console.log('Import completed!')
  console.log(`  Total: ${entries.length}`)
  console.log(`  Imported: ${imported} (${tvShows} TV shows, ${movies} movies)`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)

  return {
    total: entries.length,
    imported,
    tvShows,
    movies,
    skipped,
    errors,
  }
}

// Import all entries from data.json (TMDB IDs)
export async function importFromDataJson(): Promise<{
  total: number
  imported: number
  tvShows: number
  movies: number
  skipped: number
  errors: number
}> {
  return importFromDataFile('data.json', 'tmdb')
}

// Import all entries from data2.json (IMDb IDs)
export async function importFromData2Json(): Promise<{
  total: number
  imported: number
  tvShows: number
  movies: number
  skipped: number
  errors: number
}> {
  return importFromDataFile('data2.json', 'imdb')
}

