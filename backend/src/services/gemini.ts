import { GoogleGenAI } from '@google/genai'
import { z, toJSONSchema } from 'zod'

const MAX_MOVIES = 500

export interface MovieForSuggest {
  id: number
  title: string
  overview: string | null
  release_date: string | null
}

export interface SuggestedPlaylist {
  name: string
  description: string | null
  movieIds: number[]
}

export interface SuggestPlaylistsResult {
  suggestedPlaylists: SuggestedPlaylist[]
  unassignedMovieIds: number[]
  movies: { id: number; title: string }[]
}

const SuggestedPlaylistSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  movieIds: z.array(z.number().int()),
})

const GeminiResponseSchema = z.object({
  suggestedPlaylists: z.array(SuggestedPlaylistSchema),
  unassignedMovieIds: z.array(z.number().int()),
})

type GeminiResponse = z.infer<typeof GeminiResponseSchema>

const geminiResponseJsonSchema = toJSONSchema(GeminiResponseSchema, {
  target: 'draft-07',
}) as Record<string, unknown>

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key || key.trim().length === 0) {
    throw new Error('GEMINI_API_KEY is not set')
  }
  return key.trim()
}

function buildMoviesText(movies: MovieForSuggest[]): string {
  return movies
    .map(
      (m) =>
        `- id: ${m.id}, title: "${m.title}", release_date: ${m.release_date ?? 'unknown'}, overview: ${(m.overview ?? '').slice(0, 300)}`
    )
    .join('\n')
}

function parseGeminiJson(rawText: string): GeminiResponse {
  const trimmed = rawText.trim()
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (parseErr: unknown) {
    const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr)
    const isTruncation =
      errMsg === 'Unexpected end of JSON input' ||
      /Expected ',' or '\]' after array element.*position \d+/.test(errMsg)
    if (isTruncation) {
      let repaired = jsonStr.replace(/,(\s*)$/, '$1')
      const stack: string[] = []
      for (const c of repaired) {
        if (c === '[') stack.push(']')
        else if (c === '{') stack.push('}')
        else if (c === ']' || c === '}') stack.pop()
      }
      repaired = repaired + stack.reverse().join('')
      try {
        parsed = JSON.parse(repaired)
        const obj = parsed as Record<string, unknown>
        if (!Array.isArray(obj.unassignedMovieIds)) obj.unassignedMovieIds = []
        if (!Array.isArray(obj.suggestedPlaylists)) obj.suggestedPlaylists = []
      } catch {
        throw new Error('Gemini response was not valid JSON')
      }
    } else {
      throw new Error('Gemini response was not valid JSON')
    }
  }

  return GeminiResponseSchema.parse(parsed)
}

function sanitizeResult(
  parsed: GeminiResponse,
  validIds: Set<number>,
  defaultPlaylistName: string
): { suggestedPlaylists: SuggestedPlaylist[]; unassignedMovieIds: number[] } {
  const suggestedPlaylists: SuggestedPlaylist[] = parsed.suggestedPlaylists.map((p) => ({
    name: (p.name?.trim() || defaultPlaylistName) as string,
    description: p.description,
    movieIds: p.movieIds.filter((id) => Number.isInteger(id) && validIds.has(id)),
  }))
  const unassignedMovieIds = parsed.unassignedMovieIds.filter(
    (id) => Number.isInteger(id) && validIds.has(id)
  )
  return { suggestedPlaylists, unassignedMovieIds }
}

export async function suggestPlaylistsFromMovies(
  movies: MovieForSuggest[]
): Promise<SuggestPlaylistsResult> {
  if (movies.length === 0) {
    return { suggestedPlaylists: [], unassignedMovieIds: [], movies: [] }
  }

  const limited = movies.length > MAX_MOVIES ? movies.slice(0, MAX_MOVIES) : movies
  const validIds = new Set(limited.map((m) => m.id))

  const prompt = `You are organizing a movie library into playlists. Given the following movies (each has id, title, release_date, overview), suggest logical playlists (e.g. by genre, theme, decade, mood) and assign movie ids to each playlist. A movie can be in multiple playlists. List movie ids that don't fit any playlist in unassignedMovieIds.
Use only movie ids from the list below.

Movies:
${buildMoviesText(limited)}`

  const apiKey = getApiKey()
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: geminiResponseJsonSchema,
      temperature: 0.4,
      maxOutputTokens: 16384,
    },
  })

  const rawText = response.text
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Gemini returned no text')
  }

  const parsed = parseGeminiJson(rawText)
  const { suggestedPlaylists, unassignedMovieIds } = sanitizeResult(
    parsed,
    validIds,
    'Unnamed'
  )
  const resultMovies = limited.map((m) => ({ id: m.id, title: m.title }))
  return { suggestedPlaylists, unassignedMovieIds, movies: resultMovies }
}

export async function findMoviesByCategory(
  movies: MovieForSuggest[],
  category: string
): Promise<SuggestPlaylistsResult> {
  if (movies.length === 0) {
    return { suggestedPlaylists: [], unassignedMovieIds: [], movies: [] }
  }

  const limited = movies.length > MAX_MOVIES ? movies.slice(0, MAX_MOVIES) : movies
  const validIds = new Set(limited.map((m) => m.id))
  const categoryTrimmed = category.trim() || 'Unnamed category'

  const prompt = `You are filtering a movie library by a user-defined category. Given the following movies (each has id, title, release_date, overview) and the category "${categoryTrimmed}", return exactly one playlist containing all movies that fit this category. The category can be a genre, theme, decade, mood, or any other criteria the user might mean.
Use only movie ids from the list below. Put in movieIds every movie id that fits the category; put all others in unassignedMovieIds.

Movies:
${buildMoviesText(limited)}

Category: "${categoryTrimmed}"`

  const apiKey = getApiKey()
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: geminiResponseJsonSchema,
      temperature: 0.3,
      maxOutputTokens: 16384,
    },
  })

  const rawText = response.text
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Gemini returned no text')
  }

  const parsed = parseGeminiJson(rawText)
  const { suggestedPlaylists, unassignedMovieIds } = sanitizeResult(
    parsed,
    validIds,
    categoryTrimmed
  )
  const resultMovies = limited.map((m) => ({ id: m.id, title: m.title }))
  return { suggestedPlaylists, unassignedMovieIds, movies: resultMovies }
}
