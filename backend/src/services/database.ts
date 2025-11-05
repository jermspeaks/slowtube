import db from '../config/db.js'

export interface Video {
  id: number
  youtube_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  duration: string | null
  published_at: string | null
  added_to_playlist_at: string | null
  fetch_status: 'pending' | 'completed' | 'unavailable' | 'failed' | null
  channel_title: string | null
  youtube_url: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: number
  video_id: number
  name: string
  created_at: string
}

export interface Comment {
  id: number
  video_id: number
  content: string
  created_at: string
  updated_at: string
}

export interface VideoState {
  video_id: number
  state: 'feed' | 'inbox' | 'archive'
  updated_at: string
}

export interface OAuthSession {
  id: number
  user_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

// Video operations
export const videoQueries = {
  getAll: (
    state?: string,
    search?: string,
    sortBy?: 'published_at' | 'added_to_playlist_at',
    sortOrder?: 'asc' | 'desc',
    channels?: string[]
  ) => {
    // Build WHERE clause conditions
    const conditions: string[] = []
    const params: any[] = []

    // State filter
    if (state) {
      conditions.push('vs.state = ?')
      params.push(state)
    }

    // Search filter (case-insensitive search on title and description)
    if (search && search.trim()) {
      conditions.push('(LOWER(v.title) LIKE ? OR LOWER(v.description) LIKE ?)')
      const searchTerm = `%${search.trim().toLowerCase()}%`
      params.push(searchTerm, searchTerm)
    }

    // Channel filter
    if (channels && channels.length > 0) {
      const placeholders = channels.map(() => '?').join(',')
      conditions.push(`v.channel_title IN (${placeholders})`)
      params.push(...channels)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build ORDER BY clause
    let orderBy = 'ORDER BY v.added_to_playlist_at ASC' // Default sort
    if (sortBy && (sortBy === 'published_at' || sortBy === 'added_to_playlist_at')) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
      // Handle NULL values - put them at the end
      orderBy = `ORDER BY 
        CASE WHEN v.${sortBy} IS NULL THEN 1 ELSE 0 END,
        v.${sortBy} ${order}`
    }

    const query = `
      SELECT v.*, vs.state 
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      ${whereClause}
      ${orderBy}
    `

    return db.prepare(query).all(...params) as (Video & { state: string | null })[]
  },

  getById: (id: number) => {
    return db.prepare(`
      SELECT v.*, vs.state 
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      WHERE v.id = ?
    `).get(id) as (Video & { state: string | null }) | undefined
  },

  getByYoutubeId: (youtubeId: string) => {
    return db.prepare('SELECT * FROM videos WHERE youtube_id = ?').get(youtubeId) as Video | undefined
  },

  create: (video: Omit<Video, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO videos (youtube_id, title, description, thumbnail_url, duration, published_at, added_to_playlist_at, fetch_status, channel_title, youtube_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      video.youtube_id,
      video.title,
      video.description,
      video.thumbnail_url,
      video.duration,
      video.published_at,
      video.added_to_playlist_at,
      video.fetch_status || 'pending',
      video.channel_title,
      video.youtube_url
    )
    return result.lastInsertRowid as number
  },

  update: (id: number, video: Partial<Omit<Video, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(video).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM videos WHERE id = ?').run(id).changes
  },

  getPendingFetch: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM videos 
      WHERE fetch_status = 'pending' OR fetch_status IS NULL
      ORDER BY created_at ASC
      LIMIT ?
    `).all(limit) as Video[]
  },

  getVideosNeedingFetch: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM videos 
      WHERE fetch_status = 'pending' OR fetch_status IS NULL
      ORDER BY created_at ASC
      LIMIT ?
    `).all(limit) as Video[]
  },

  countPendingFetch: () => {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM videos 
      WHERE fetch_status = 'pending' OR fetch_status IS NULL
    `).get() as { count: number }
    return result.count
  },

  deleteAll: () => {
    // Delete all videos - cascading deletes will handle tags, comments, and video_states
    return db.prepare('DELETE FROM videos').run().changes
  },

  getAllUniqueChannels: () => {
    return db.prepare(`
      SELECT DISTINCT channel_title 
      FROM videos 
      WHERE channel_title IS NOT NULL AND channel_title != ''
      ORDER BY channel_title ASC
    `).all() as { channel_title: string }[]
  },
}

// Tag operations
export const tagQueries = {
  getByVideoId: (videoId: number) => {
    return db.prepare('SELECT * FROM tags WHERE video_id = ?').all(videoId) as Tag[]
  },

  create: (videoId: number, name: string) => {
    const stmt = db.prepare('INSERT INTO tags (video_id, name) VALUES (?, ?)')
    try {
      const result = stmt.run(videoId, name)
      return result.lastInsertRowid as number
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return null // Tag already exists
      }
      throw error
    }
  },

  delete: (videoId: number, tagId: number) => {
    return db.prepare('DELETE FROM tags WHERE id = ? AND video_id = ?').run(tagId, videoId).changes
  },

  deleteByVideoId: (videoId: number) => {
    return db.prepare('DELETE FROM tags WHERE video_id = ?').run(videoId).changes
  },

  getAllUnique: () => {
    return db.prepare('SELECT DISTINCT name FROM tags ORDER BY name').all() as { name: string }[]
  },
}

// Comment operations
export const commentQueries = {
  getByVideoId: (videoId: number) => {
    return db.prepare('SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC').all(videoId) as Comment[]
  },

  create: (videoId: number, content: string) => {
    const stmt = db.prepare('INSERT INTO comments (video_id, content) VALUES (?, ?)')
    const result = stmt.run(videoId, content)
    return result.lastInsertRowid as number
  },

  update: (commentId: number, videoId: number, content: string) => {
    const stmt = db.prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND video_id = ?')
    return stmt.run(content, commentId, videoId).changes
  },

  delete: (commentId: number, videoId: number) => {
    return db.prepare('DELETE FROM comments WHERE id = ? AND video_id = ?').run(commentId, videoId).changes
  },
}

// Video state operations
export const videoStateQueries = {
  getByVideoId: (videoId: number) => {
    return db.prepare('SELECT * FROM video_states WHERE video_id = ?').get(videoId) as VideoState | undefined
  },

  setState: (videoId: number, state: 'feed' | 'inbox' | 'archive') => {
    const stmt = db.prepare(`
      INSERT INTO video_states (video_id, state, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(video_id) DO UPDATE SET
        state = excluded.state,
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run(videoId, state).changes
  },

  getByState: (state: 'feed' | 'inbox' | 'archive') => {
    return db.prepare('SELECT * FROM video_states WHERE state = ?').all(state) as VideoState[]
  },
}

// OAuth session operations
export const oauthQueries = {
  getLatest: () => {
    return db.prepare('SELECT * FROM oauth_sessions ORDER BY created_at DESC LIMIT 1').get() as OAuthSession | undefined
  },

  create: (session: Omit<OAuthSession, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO oauth_sessions (user_id, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(
      session.user_id,
      session.access_token,
      session.refresh_token,
      session.expires_at
    )
    return result.lastInsertRowid as number
  },

  update: (id: number, session: Partial<Omit<OAuthSession, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(session).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE oauth_sessions SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM oauth_sessions WHERE id = ?').run(id).changes
  },
}

// Parse human-readable duration string (e.g., "1h 23m 45s") to seconds
function parseDurationToSeconds(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0
  
  let totalSeconds = 0
  const hourMatch = duration.match(/(\d+)h/)
  const minuteMatch = duration.match(/(\d+)m/)
  const secondMatch = duration.match(/(\d+)s/)
  
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600
  if (minuteMatch) totalSeconds += parseInt(minuteMatch[1], 10) * 60
  if (secondMatch) totalSeconds += parseInt(secondMatch[1], 10)
  
  return totalSeconds
}

// Stats operations
export const statsQueries = {
  getChannelRankings: () => {
    return db.prepare(`
      SELECT 
        channel_title,
        COUNT(*) as count
      FROM videos
      WHERE channel_title IS NOT NULL AND channel_title != ''
      GROUP BY channel_title
      ORDER BY count DESC, channel_title ASC
    `).all() as Array<{ channel_title: string; count: number }>
  },

  getTimeStats: () => {
    // Get hour breakdown (0-23)
    const hourStats = db.prepare(`
      SELECT 
        CAST(strftime('%H', added_to_playlist_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM videos
      WHERE added_to_playlist_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour ASC
    `).all() as Array<{ hour: number; count: number }>

    // Get day of week breakdown (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeekStats = db.prepare(`
      SELECT 
        CAST(strftime('%w', added_to_playlist_at) AS INTEGER) as day_of_week,
        COUNT(*) as count
      FROM videos
      WHERE added_to_playlist_at IS NOT NULL
      GROUP BY day_of_week
      ORDER BY day_of_week ASC
    `).all() as Array<{ day_of_week: number; count: number }>

    // Get month breakdown (1-12)
    const monthStats = db.prepare(`
      SELECT 
        CAST(strftime('%m', added_to_playlist_at) AS INTEGER) as month,
        COUNT(*) as count
      FROM videos
      WHERE added_to_playlist_at IS NOT NULL
      GROUP BY month
      ORDER BY month ASC
    `).all() as Array<{ month: number; count: number }>

    return {
      byHour: hourStats,
      byDayOfWeek: dayOfWeekStats,
      byMonth: monthStats,
    }
  },

  getChannelList: () => {
    return db.prepare(`
      SELECT DISTINCT channel_title
      FROM videos
      WHERE channel_title IS NOT NULL AND channel_title != ''
      ORDER BY channel_title ASC
    `).all() as Array<{ channel_title: string }>
  },

  getTotalDuration: () => {
    // Get all durations (excluding null)
    const videos = db.prepare(`
      SELECT duration
      FROM videos
      WHERE duration IS NOT NULL AND duration != ''
    `).all() as Array<{ duration: string }>

    let totalSeconds = 0
    for (const video of videos) {
      totalSeconds += parseDurationToSeconds(video.duration)
    }

    return totalSeconds
  },
}

