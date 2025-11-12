import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { tvShowQueries, movieQueries, episodeQueries } from './database.js'
import { 
  findTmdbIdByImdbId, 
  getMediaType, 
  fetchTVShowDetails, 
  fetchMovieDetails, 
  fetchTVShowEpisodes,
  searchMovies
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
    const result = await findTmdbIdByImdbId(id)
    if (!result) {
      console.warn(`Could not find TMDB ID for IMDb ID: ${id}`)
      return { type: 'skipped' }
    }

    // Use the media type directly from the find result (which knows if it came from movie_results or tv_results)
    tmdbId = result.tmdbId
    mediaType = result.mediaType
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

// Letterboxd CSV entry interface
interface LetterboxdEntry {
  date: string // ISO date string
  name: string
  year: number
  letterboxdUri: string
}

// Parse Letterboxd CSV file
function parseLetterboxdCSV(csvContent: string): LetterboxdEntry[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  // Skip header row
  const dataLines = lines.slice(1)
  const entries: LetterboxdEntry[] = []

  for (const line of dataLines) {
    if (!line.trim()) continue

    // Parse CSV line handling quoted fields
    const fields: string[] = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        fields.push(currentField.trim())
        currentField = ''
      } else {
        currentField += char
      }
    }
    // Add last field
    fields.push(currentField.trim())

    if (fields.length < 4) {
      console.warn(`Skipping invalid CSV line: ${line}`)
      continue
    }

    const [dateStr, name, yearStr, letterboxdUri] = fields

    // Convert date to ISO format (YYYY-MM-DD -> ISO string)
    let dateISO: string
    try {
      // Parse date and convert to ISO string
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateStr}, skipping entry`)
        continue
      }
      dateISO = date.toISOString()
    } catch (error) {
      console.warn(`Error parsing date ${dateStr}:`, error)
      continue
    }

    // Convert year to number
    const year = parseInt(yearStr, 10)
    if (isNaN(year)) {
      console.warn(`Invalid year: ${yearStr}, skipping entry`)
      continue
    }

    entries.push({
      date: dateISO,
      name: name.trim(),
      year,
      letterboxdUri: letterboxdUri.trim(),
    })
  }

  return entries
}

// Find TMDB movie ID by title and year
async function findMovieByTitleAndYear(title: string, year: number): Promise<number | null> {
  try {
    const results = await searchMovies(title)
    
    // Filter by exact year match
    const yearMatch = results.find(movie => {
      if (!movie.release_date) return false
      const movieYear = parseInt(movie.release_date.substring(0, 4), 10)
      return movieYear === year
    })

    if (yearMatch) {
      return yearMatch.tmdb_id
    }

    return null
  } catch (error: any) {
    console.error(`Error searching for movie "${title}" (${year}):`, error.message)
    return null
  }
}

// Import from Letterboxd CSV
export async function importFromLetterboxdCSV(csvContent: string): Promise<{
  total: number
  imported: number
  movies: number
  skipped: number
  errors: number
  notFound: string[]
}> {
  console.log('Starting import from Letterboxd CSV...')

  let entries: LetterboxdEntry[]
  try {
    entries = parseLetterboxdCSV(csvContent)
  } catch (error: any) {
    throw new Error(`Failed to parse CSV: ${error.message}`)
  }

  console.log(`Found ${entries.length} entries to process`)

  let imported = 0
  let movies = 0
  let skipped = 0
  let errors = 0
  const notFound: string[] = []

  // Process entries with a delay to avoid rate limiting
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    
    try {
      // Search for movie in TMDB
      const tmdbId = await findMovieByTitleAndYear(entry.name, entry.year)
      
      if (!tmdbId) {
        notFound.push(`${entry.name} (${entry.year})`)
        skipped++
        console.log(`Movie not found in TMDB: ${entry.name} (${entry.year})`)
        continue
      }

      // Check if movie already exists
      const existing = movieQueries.getByTmdbId(tmdbId)
      
      if (existing) {
        // Skip if exists (keep existing saved_at)
        skipped++
        console.log(`Movie already exists: ${existing.title} (TMDB: ${tmdbId})`)
        continue
      }

      // Fetch movie details and import
      try {
        const movieData = await fetchMovieDetails(tmdbId)
        
        // Create movie with saved_at from CSV
        const movieId = movieQueries.create({
          ...movieData,
          saved_at: entry.date,
        })

        imported++
        movies++
        console.log(`Imported movie: ${movieData.title} (TMDB: ${tmdbId}, DB ID: ${movieId})`)
      } catch (movieError: any) {
        console.error(`Error importing movie ${entry.name} (TMDB: ${tmdbId}):`, movieError.message)
        errors++
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
      console.error(`Error processing entry ${entry.name} (${entry.year}):`, error.message)
      errors++
    }
  }

  console.log('Import completed!')
  console.log(`  Total: ${entries.length}`)
  console.log(`  Imported: ${imported} (${movies} movies)`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Not found: ${notFound.length}`)
  console.log(`  Errors: ${errors}`)

  return {
    total: entries.length,
    imported,
    movies,
    skipped,
    errors,
    notFound,
  }
}

