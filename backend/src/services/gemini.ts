import { GoogleGenAI } from '@google/genai'

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
}

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

const JSON_SCHEMA_INSTRUCTIONS = `
Respond with a single JSON object (no markdown, no code fence) with this exact shape:
{
  "suggestedPlaylists": [
    { "name": "string", "description": "string or null", "movieIds": [number, ...] }
  ],
  "unassignedMovieIds": [number, ...]
}
Rules:
- Use only movie ids from the list above.
- A movie may appear in multiple playlists (include its id in each playlist's movieIds).
- Put any movie that doesn't fit any playlist in unassignedMovieIds.
- suggestedPlaylists: array of playlists with name, short description (or null), and movieIds (array of id numbers).
- unassignedMovieIds: array of movie ids that don't belong in any suggested playlist.
`

export async function suggestPlaylistsFromMovies(
  movies: MovieForSuggest[]
): Promise<SuggestPlaylistsResult> {
  if (movies.length === 0) {
    return { suggestedPlaylists: [], unassignedMovieIds: [] }
  }

  const limited = movies.length > MAX_MOVIES ? movies.slice(0, MAX_MOVIES) : movies
  const validIds = new Set(limited.map((m) => m.id))

  const prompt = `You are organizing a movie library into playlists. Given the following movies (each has id, title, release_date, overview), suggest logical playlists (e.g. by genre, theme, decade, mood) and assign movie ids to each playlist. A movie can be in multiple playlists. List movie ids that don't fit any playlist in unassignedMovieIds.

Movies:
${buildMoviesText(limited)}

${JSON_SCHEMA_INSTRUCTIONS}`

  const apiKey = getApiKey()
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 16384,
    },
  })

  const rawText = response.text
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Gemini returned no text')
  }

  const trimmed = rawText.trim()
  const jsonStr = trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?\s*|\s*```$/g, '').trim() : trimmed
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (parseErr: unknown) {
    const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr)
    const isTruncation =
      errMsg === 'Unexpected end of JSON input' || /Expected ',' or '\]' after array element.*position \d+/.test(errMsg)
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

  if (!parsed || typeof parsed !== 'object' || !('suggestedPlaylists' in parsed) || !('unassignedMovieIds' in parsed)) {
    throw new Error('Gemini response missing suggestedPlaylists or unassignedMovieIds')
  }

  const { suggestedPlaylists: rawPlaylists, unassignedMovieIds: rawUnassigned } = parsed as {
    suggestedPlaylists?: unknown
    unassignedMovieIds?: unknown
  }

  const suggestedPlaylists: SuggestedPlaylist[] = []
  if (Array.isArray(rawPlaylists)) {
    for (const p of rawPlaylists) {
      if (!p || typeof p !== 'object' || !('name' in p) || !('movieIds' in p)) continue
      const name = typeof (p as { name?: unknown }).name === 'string' ? (p as { name: string }).name : String((p as { name?: unknown }).name ?? 'Unnamed')
      const description =
        (p as { description?: unknown }).description === null || typeof (p as { description?: unknown }).description === 'string'
          ? ((p as { description: string | null }).description as string | null)
          : null
      const movieIds = Array.isArray((p as { movieIds?: unknown }).movieIds)
        ? ((p as { movieIds: unknown[] }).movieIds as unknown[])
            .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && validIds.has(id))
        : []
      suggestedPlaylists.push({ name: name.trim() || 'Unnamed', description, movieIds })
    }
  }

  const unassignedMovieIds: number[] = Array.isArray(rawUnassigned)
    ? (rawUnassigned as unknown[]).filter(
        (id): id is number => typeof id === 'number' && Number.isInteger(id) && validIds.has(id)
      )
    : []

  return { suggestedPlaylists, unassignedMovieIds }
}
