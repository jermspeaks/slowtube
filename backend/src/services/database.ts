import db from '../config/db.js'
import { parseDurationToSeconds, isShortVideo } from '../utils/duration.js'

export interface Video {
  id: number
  youtube_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  duration: string | null
  published_at: string | null
  added_to_playlist_at: string | null
  added_to_latest_at: string | null
  fetch_status: 'pending' | 'completed' | 'unavailable' | 'failed' | null
  channel_title: string | null
  youtube_channel_id: string | null
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

export interface Channel {
  id: number
  youtube_channel_id: string
  channel_title: string | null
  description: string | null
  thumbnail_url: string | null
  subscriber_count: number | null
  is_subscribed: number // 0 or 1 (boolean as integer in SQLite)
  custom_tags: string | null // JSON array as string
  created_at: string
  updated_at: string
}

// Video operations
export const videoQueries = {
  getAll: (
    state?: string,
    search?: string,
    sortBy?: 'published_at' | 'added_to_playlist_at' | 'archived_at',
    sortOrder?: 'asc' | 'desc',
    channels?: string[],
    limit?: number,
    offset?: number,
    dateField?: 'published_at' | 'added_to_playlist_at',
    startDate?: string,
    endDate?: string
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

    // Date range filter
    if (dateField && (dateField === 'published_at' || dateField === 'added_to_playlist_at')) {
      if (startDate || endDate) {
        const dateConditions: string[] = []
        if (startDate) {
          dateConditions.push(`DATE(v.${dateField}) >= DATE(?)`)
          params.push(startDate)
        }
        if (endDate) {
          dateConditions.push(`DATE(v.${dateField}) <= DATE(?)`)
          params.push(endDate)
        }
        if (dateConditions.length > 0) {
          conditions.push(`(${dateConditions.join(' AND ')})`)
        }
      }
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
    } else if (sortBy === 'archived_at') {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
      // Handle NULL values - put them at the end
      // archived_at comes from vs.updated_at when state is 'archive'
      orderBy = `ORDER BY 
        CASE WHEN vs.updated_at IS NULL THEN 1 ELSE 0 END,
        vs.updated_at ${order}`
    }

    // Build LIMIT and OFFSET clauses
    let limitClause = ''
    if (limit !== undefined) {
      limitClause = `LIMIT ?`
      params.push(limit)
      if (offset !== undefined) {
        limitClause += ` OFFSET ?`
        params.push(offset)
      }
    }

    const query = `
      SELECT v.*, vs.state, vs.updated_at as archived_at
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      ${whereClause}
      ${orderBy}
      ${limitClause}
    `

    return db.prepare(query).all(...params) as (Video & { state: string | null })[]
  },

  getCount: (
    state?: string,
    search?: string,
    channels?: string[],
    dateField?: 'published_at' | 'added_to_playlist_at',
    startDate?: string,
    endDate?: string
  ) => {
    // Build WHERE clause conditions (same as getAll)
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

    // Date range filter
    if (dateField && (dateField === 'published_at' || dateField === 'added_to_playlist_at')) {
      if (startDate || endDate) {
        const dateConditions: string[] = []
        if (startDate) {
          dateConditions.push(`DATE(v.${dateField}) >= DATE(?)`)
          params.push(startDate)
        }
        if (endDate) {
          dateConditions.push(`DATE(v.${dateField}) <= DATE(?)`)
          params.push(endDate)
        }
        if (dateConditions.length > 0) {
          conditions.push(`(${dateConditions.join(' AND ')})`)
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT COUNT(*) as count
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      ${whereClause}
    `

    const result = db.prepare(query).get(...params) as { count: number }
    return result.count
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
      INSERT INTO videos (youtube_id, title, description, thumbnail_url, duration, published_at, added_to_playlist_at, added_to_latest_at, fetch_status, channel_title, youtube_channel_id, youtube_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      video.youtube_id,
      video.title,
      video.description,
      video.thumbnail_url,
      video.duration,
      video.published_at,
      video.added_to_playlist_at,
      video.added_to_latest_at || null,
      video.fetch_status || 'pending',
      video.channel_title,
      video.youtube_channel_id || null,
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

  getVideosNeedingFetch: (limit: number = 5) => {
    return db.prepare(`
      SELECT * FROM videos 
      WHERE (
        -- Videos that haven't been fetched yet (exclude 'unavailable' - those are known private/deleted)
        (fetch_status = 'pending' OR fetch_status IS NULL OR fetch_status = 'failed')
        OR
        -- Videos marked as completed but missing ESSENTIAL metadata (only check critical fields)
        -- Note: description, duration, published_at can be NULL even after successful fetch
        (
          fetch_status = 'completed' 
          AND youtube_id IS NOT NULL
          AND (
            title = 'Untitled Video' 
            OR channel_title IS NULL
          )
        )
      )
      ORDER BY created_at ASC
      LIMIT ?
    `).all(limit) as Video[]
  },

  countPendingFetch: () => {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM videos 
      WHERE (
        -- Videos that haven't been fetched yet (exclude 'unavailable' - those are known private/deleted)
        (fetch_status = 'pending' OR fetch_status IS NULL OR fetch_status = 'failed')
        OR
        -- Videos marked as completed but missing ESSENTIAL metadata (only check critical fields)
        -- Note: description, duration, published_at can be NULL even after successful fetch
        (
          fetch_status = 'completed' 
          AND youtube_id IS NOT NULL
          AND (
            title = 'Untitled Video' 
            OR channel_title IS NULL
          )
        )
      )
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

  getWatchLaterVideosByChannel: (channelId: string) => {
    return db.prepare(`
      SELECT v.*, vs.state 
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      WHERE v.youtube_channel_id = ?
      ORDER BY v.added_to_playlist_at DESC
    `).all(channelId) as (Video & { state: string | null })[]
  },

  getVideosNeedingChannelIdBackfill: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM videos 
      WHERE fetch_status = 'completed' 
        AND youtube_channel_id IS NULL
        AND youtube_id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT ?
    `).all(limit) as Video[]
  },

  countVideosNeedingChannelIdBackfill: () => {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM videos 
      WHERE fetch_status = 'completed' 
        AND youtube_channel_id IS NULL
        AND youtube_id IS NOT NULL
    `).get() as { count: number }
    return result.count
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

// Stats operations
export const statsQueries = {
  getChannelRankings: (
    dateField?: 'published_at' | 'added_to_playlist_at',
    startDate?: string,
    endDate?: string
  ) => {
    const conditions: string[] = ['channel_title IS NOT NULL AND channel_title != \'\'']
    const params: any[] = []

    // Date range filter
    if (dateField && (dateField === 'published_at' || dateField === 'added_to_playlist_at')) {
      if (startDate || endDate) {
        const dateConditions: string[] = []
        if (startDate) {
          dateConditions.push(`DATE(${dateField}) >= DATE(?)`)
          params.push(startDate)
        }
        if (endDate) {
          dateConditions.push(`DATE(${dateField}) <= DATE(?)`)
          params.push(endDate)
        }
        if (dateConditions.length > 0) {
          conditions.push(`(${dateConditions.join(' AND ')})`)
        }
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    return db.prepare(`
      SELECT 
        channel_title,
        COUNT(*) as count
      FROM videos
      ${whereClause}
      GROUP BY channel_title
      ORDER BY count DESC, channel_title ASC
    `).all(...params) as Array<{ channel_title: string; count: number }>
  },

  getTimeStats: (
    dateField?: 'published_at' | 'added_to_playlist_at',
    startDate?: string,
    endDate?: string
  ) => {
    // Use added_to_playlist_at as default if no dateField specified
    const field = dateField || 'added_to_playlist_at'
    
    // Build date range conditions
    const dateConditions: string[] = [`${field} IS NOT NULL`]
    const params: any[] = []

    // Apply date range filter if dates are provided
    if (startDate || endDate) {
      if (startDate) {
        dateConditions.push(`DATE(${field}) >= DATE(?)`)
        params.push(startDate)
      }
      if (endDate) {
        dateConditions.push(`DATE(${field}) <= DATE(?)`)
        params.push(endDate)
      }
    }

    const whereClause = `WHERE ${dateConditions.join(' AND ')}`

    // Get hour breakdown (0-23)
    const hourStats = db.prepare(`
      SELECT 
        CAST(strftime('%H', ${field}) AS INTEGER) as hour,
        COUNT(*) as count
      FROM videos
      ${whereClause}
      GROUP BY hour
      ORDER BY hour ASC
    `).all(...params) as Array<{ hour: number; count: number }>

    // Get day of week breakdown (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeekStats = db.prepare(`
      SELECT 
        CAST(strftime('%w', ${field}) AS INTEGER) as day_of_week,
        COUNT(*) as count
      FROM videos
      ${whereClause}
      GROUP BY day_of_week
      ORDER BY day_of_week ASC
    `).all(...params) as Array<{ day_of_week: number; count: number }>

    // Get month breakdown (1-12)
    const monthStats = db.prepare(`
      SELECT 
        CAST(strftime('%m', ${field}) AS INTEGER) as month,
        COUNT(*) as count
      FROM videos
      ${whereClause}
      GROUP BY month
      ORDER BY month ASC
    `).all(...params) as Array<{ month: number; count: number }>

    return {
      byHour: hourStats,
      byDayOfWeek: dayOfWeekStats,
      byMonth: monthStats,
    }
  },

  getChannelList: (
    dateField?: 'published_at' | 'added_to_playlist_at',
    startDate?: string,
    endDate?: string
  ) => {
    const conditions: string[] = ['channel_title IS NOT NULL AND channel_title != \'\'']
    const params: any[] = []

    // Date range filter
    if (dateField && (dateField === 'published_at' || dateField === 'added_to_playlist_at')) {
      if (startDate || endDate) {
        const dateConditions: string[] = []
        if (startDate) {
          dateConditions.push(`DATE(${dateField}) >= DATE(?)`)
          params.push(startDate)
        }
        if (endDate) {
          dateConditions.push(`DATE(${dateField}) <= DATE(?)`)
          params.push(endDate)
        }
        if (dateConditions.length > 0) {
          conditions.push(`(${dateConditions.join(' AND ')})`)
        }
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    return db.prepare(`
      SELECT DISTINCT channel_title
      FROM videos
      ${whereClause}
      ORDER BY channel_title ASC
    `).all(...params) as Array<{ channel_title: string }>
  },

  getTotalDuration: (
    dateField?: 'published_at' | 'added_to_playlist_at',
    startDate?: string,
    endDate?: string
  ) => {
    const conditions: string[] = ['duration IS NOT NULL AND duration != \'\'']
    const params: any[] = []

    // Date range filter
    if (dateField && (dateField === 'published_at' || dateField === 'added_to_playlist_at')) {
      if (startDate || endDate) {
        const dateConditions: string[] = []
        if (startDate) {
          dateConditions.push(`DATE(${dateField}) >= DATE(?)`)
          params.push(startDate)
        }
        if (endDate) {
          dateConditions.push(`DATE(${dateField}) <= DATE(?)`)
          params.push(endDate)
        }
        if (dateConditions.length > 0) {
          conditions.push(`(${dateConditions.join(' AND ')})`)
        }
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    // Get all durations (excluding null)
    const videos = db.prepare(`
      SELECT duration
      FROM videos
      ${whereClause}
    `).all(...params) as Array<{ duration: string }>

    let totalSeconds = 0
    for (const video of videos) {
      totalSeconds += parseDurationToSeconds(video.duration)
    }

    return totalSeconds
  },
}

// Channel operations
export const channelQueries = {
  getAll: (filterType?: 'subscribed' | 'watch_later', limit?: number, offset?: number, sortBy?: 'channel_title' | 'updated_at', sortOrder?: 'asc' | 'desc', notInAnyList?: boolean) => {
    let query = ''
    const params: any[] = []

    // Validate and set default sort values
    const validSortBy = (sortBy === 'channel_title' || sortBy === 'updated_at') ? sortBy : 'channel_title'
    const validSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'asc'
    const orderBy = `${validSortBy} ${validSortOrder}`

    if (filterType === 'subscribed') {
      if (notInAnyList) {
        // Get subscribed channels that are not in any list
        query = `
          SELECT c.*
          FROM channels c
          LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
          WHERE c.is_subscribed = 1 AND cli.id IS NULL
          ORDER BY c.${orderBy}`
      } else {
        query = `SELECT * FROM channels WHERE is_subscribed = 1 ORDER BY ${orderBy}`
      }
      // Apply pagination only for subscribed filter
      if (limit !== undefined && offset !== undefined) {
        query += ' LIMIT ? OFFSET ?'
        params.push(limit, offset)
      }
    } else if (filterType === 'watch_later') {
      // Get channels that have videos in watch later
      if (notInAnyList) {
        query = `
          SELECT DISTINCT c.*
          FROM channels c
          INNER JOIN videos v ON c.youtube_channel_id = v.youtube_channel_id
          LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
          WHERE v.youtube_channel_id IS NOT NULL AND cli.id IS NULL
          ORDER BY c.${orderBy}
        `
      } else {
        query = `
          SELECT DISTINCT c.*
          FROM channels c
          INNER JOIN videos v ON c.youtube_channel_id = v.youtube_channel_id
          WHERE v.youtube_channel_id IS NOT NULL
          ORDER BY c.${orderBy}
        `
      }
    } else {
      if (notInAnyList) {
        query = `
          SELECT c.*
          FROM channels c
          LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
          WHERE cli.id IS NULL
          ORDER BY c.${orderBy}
        `
      } else {
        query = `SELECT * FROM channels ORDER BY ${orderBy}`
      }
    }

    return db.prepare(query).all(...params) as Channel[]
  },

  getAllCount: (filterType?: 'subscribed' | 'watch_later', notInAnyList?: boolean) => {
    let query = ''
    const params: any[] = []

    if (filterType === 'subscribed') {
      if (notInAnyList) {
        query = `
          SELECT COUNT(*) as count
          FROM channels c
          LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
          WHERE c.is_subscribed = 1 AND cli.id IS NULL
        `
      } else {
        query = 'SELECT COUNT(*) as count FROM channels WHERE is_subscribed = 1'
      }
    } else if (filterType === 'watch_later') {
      if (notInAnyList) {
        query = `
          SELECT COUNT(DISTINCT c.youtube_channel_id) as count
          FROM channels c
          INNER JOIN videos v ON c.youtube_channel_id = v.youtube_channel_id
          LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
          WHERE v.youtube_channel_id IS NOT NULL AND cli.id IS NULL
        `
      } else {
        query = `
          SELECT COUNT(DISTINCT c.youtube_channel_id) as count
          FROM channels c
          INNER JOIN videos v ON c.youtube_channel_id = v.youtube_channel_id
          WHERE v.youtube_channel_id IS NOT NULL
        `
      }
    } else {
      if (notInAnyList) {
        query = `
          SELECT COUNT(*) as count
          FROM channels c
          LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
          WHERE cli.id IS NULL
        `
      } else {
        query = 'SELECT COUNT(*) as count FROM channels'
      }
    }

    const result = db.prepare(query).get(...params) as { count: number }
    return result.count
  },

  getByChannelId: (youtubeChannelId: string) => {
    return db.prepare('SELECT * FROM channels WHERE youtube_channel_id = ?').get(youtubeChannelId) as Channel | undefined
  },

  create: (channel: Omit<Channel, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO channels (youtube_channel_id, channel_title, description, thumbnail_url, subscriber_count, is_subscribed, custom_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      channel.youtube_channel_id,
      channel.channel_title,
      channel.description,
      channel.thumbnail_url,
      channel.subscriber_count,
      channel.is_subscribed || 0,
      channel.custom_tags
    )
    return result.lastInsertRowid as number
  },

  update: (id: number, channel: Partial<Omit<Channel, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(channel).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  updateByChannelId: (youtubeChannelId: string, channel: Partial<Omit<Channel, 'id' | 'youtube_channel_id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(channel).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(youtubeChannelId)

    const stmt = db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE youtube_channel_id = ?`)
    return stmt.run(...values).changes
  },

  getChannelsWithWatchLaterCount: (sortBy?: 'channel_title' | 'updated_at' | 'last_video_date', sortOrder?: 'asc' | 'desc', notInAnyList?: boolean) => {
    // Validate and set default sort values
    const validSortBy = (sortBy === 'channel_title' || sortBy === 'updated_at' || sortBy === 'last_video_date') ? sortBy : 'channel_title'
    const validSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'asc'
    
    // Map sortBy to actual column name in query
    let orderByColumn = 'c.channel_title'
    if (validSortBy === 'updated_at') {
      orderByColumn = 'c.updated_at'
    } else if (validSortBy === 'last_video_date') {
      orderByColumn = 'last_video_date' // Use the alias from SELECT clause
    } else {
      orderByColumn = 'c.channel_title'
    }
    
    const orderBy = `${orderByColumn} ${validSortOrder}`
    
    if (notInAnyList) {
      return db.prepare(`
        SELECT 
          c.*,
          COUNT(v.id) as watch_later_count,
          MAX(v.added_to_playlist_at) as last_video_date
        FROM channels c
        INNER JOIN videos v ON c.youtube_channel_id = v.youtube_channel_id
        LEFT JOIN channel_list_items cli ON c.youtube_channel_id = cli.youtube_channel_id
        WHERE v.youtube_channel_id IS NOT NULL AND cli.id IS NULL
        GROUP BY c.youtube_channel_id
        ORDER BY ${orderBy}
      `).all() as (Channel & { watch_later_count: number; last_video_date: string | null })[]
    } else {
      return db.prepare(`
        SELECT 
          c.*,
          COUNT(v.id) as watch_later_count,
          MAX(v.added_to_playlist_at) as last_video_date
        FROM channels c
        INNER JOIN videos v ON c.youtube_channel_id = v.youtube_channel_id
        WHERE v.youtube_channel_id IS NOT NULL
        GROUP BY c.youtube_channel_id
        ORDER BY ${orderBy}
      `).all() as (Channel & { watch_later_count: number; last_video_date: string | null })[]
    }
  },

  getWatchLaterVideosByChannel: (channelId: string) => {
    return db.prepare(`
      SELECT v.*, vs.state 
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      WHERE v.youtube_channel_id = ?
      ORDER BY v.added_to_playlist_at DESC
    `).all(channelId) as (Video & { state: string | null })[]
  },

  getLatestVideosByChannel: (channelId: string, sortBy?: 'title' | 'added_to_latest_at' | 'published_at', sortOrder?: 'asc' | 'desc') => {
    // Build ORDER BY clause
    let orderBy = 'ORDER BY v.added_to_latest_at DESC' // Default sort
    if (sortBy && (sortBy === 'title' || sortBy === 'added_to_latest_at' || sortBy === 'published_at')) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
      // Handle NULL values - put them at the end
      if (sortBy === 'title') {
        orderBy = `ORDER BY 
          CASE WHEN v.title IS NULL THEN 1 ELSE 0 END,
          v.title ${order}`
      } else {
        orderBy = `ORDER BY 
          CASE WHEN v.${sortBy} IS NULL THEN 1 ELSE 0 END,
          v.${sortBy} ${order}`
      }
    }

    return db.prepare(`
      SELECT v.*, vs.state 
      FROM videos v
      LEFT JOIN video_states vs ON v.id = vs.video_id
      WHERE v.youtube_channel_id = ?
        AND v.added_to_latest_at IS NOT NULL
        AND (vs.state IS NULL OR vs.state = 'feed')
      ${orderBy}
    `).all(channelId) as (Video & { state: string | null })[]
  },

  subscribe: (youtubeChannelId: string) => {
    const stmt = db.prepare('UPDATE channels SET is_subscribed = 1, updated_at = CURRENT_TIMESTAMP WHERE youtube_channel_id = ?')
    return stmt.run(youtubeChannelId).changes
  },

  unsubscribe: (youtubeChannelId: string) => {
    const stmt = db.prepare('UPDATE channels SET is_subscribed = 0, updated_at = CURRENT_TIMESTAMP WHERE youtube_channel_id = ?')
    return stmt.run(youtubeChannelId).changes
  },
}

// TV Show interfaces
export interface TVShow {
  id: number
  tmdb_id: number
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  last_air_date: string | null
  status: string | null
  saved_at: string | null
  created_at: string
  updated_at: string
}

export interface Movie {
  id: number
  tmdb_id: number
  imdb_id: string | null
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  saved_at: string | null
  created_at: string
  updated_at: string
}

export interface Episode {
  id: number
  tv_show_id: number
  season_number: number
  episode_number: number
  name: string | null
  overview: string | null
  air_date: string | null
  runtime: number | null
  still_path: string | null
  is_watched: number // 0 or 1 (boolean as integer in SQLite)
  watched_at: string | null
  created_at: string
  updated_at: string
}

export interface TVShowState {
  tv_show_id: number
  is_archived: number // 0 or 1 (boolean as integer in SQLite)
  archived_at: string | null
  is_started: number // 0 or 1 (boolean as integer in SQLite)
  started_at: string | null
  updated_at: string
}

export interface MovieState {
  movie_id: number
  is_archived: number // 0 or 1 (boolean as integer in SQLite)
  is_starred: number // 0 or 1 (boolean as integer in SQLite)
  is_watched: number // 0 or 1 (boolean as integer in SQLite)
  archived_at: string | null
  starred_at: string | null
  watched_at: string | null
  updated_at: string
}

// TV Show operations
export const tvShowQueries = {
  getAll: (
    includeArchived: boolean = true,
    search?: string,
    sortBy?: 'title' | 'first_air_date' | 'created_at' | 'next_episode_date' | 'last_episode_date',
    sortOrder?: 'asc' | 'desc',
    limit?: number,
    offset?: number,
    statusFilter?: string,
    archiveFilter?: 'all' | 'archived' | 'unarchived',
    completionFilter?: 'all' | 'hideCompleted' | 'startedOnly' | 'newOnly'
  ) => {
    const conditions: string[] = []
    const params: any[] = []

    // Archived filter - use archiveFilter if provided, otherwise fall back to includeArchived
    if (archiveFilter === 'archived') {
      conditions.push('tss.is_archived = 1')
    } else if (archiveFilter === 'unarchived') {
      conditions.push('(tss.is_archived = 0 OR tss.is_archived IS NULL)')
    } else if (!includeArchived) {
      // Legacy behavior: if includeArchived is false and no archiveFilter, exclude archived
      conditions.push('(tss.is_archived = 0 OR tss.is_archived IS NULL)')
    }

    // Status filter
    if (statusFilter && statusFilter.trim()) {
      conditions.push('ts.status = ?')
      params.push(statusFilter.trim())
    }

    // Search filter (case-insensitive search on title and overview)
    if (search && search.trim()) {
      conditions.push('(LOWER(ts.title) LIKE ? OR LOWER(ts.overview) LIKE ?)')
      const searchTerm = `%${search.trim().toLowerCase()}%`
      params.push(searchTerm, searchTerm)
    }

    // Build ORDER BY clause
    let orderBy = 'ORDER BY ts.title ASC' // Default sort
    if (sortBy) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
      
      if (sortBy === 'next_episode_date') {
        // Sort by next unwatched episode with future air_date
        orderBy = `ORDER BY 
          CASE WHEN next_ep.air_date IS NULL THEN 1 ELSE 0 END,
          next_ep.air_date ${order}`
      } else if (sortBy === 'last_episode_date') {
        // Sort by last episode aired date
        orderBy = `ORDER BY 
          CASE WHEN last_ep.air_date IS NULL THEN 1 ELSE 0 END,
          last_ep.air_date ${order}`
      } else if (sortBy === 'title' || sortBy === 'first_air_date' || sortBy === 'created_at') {
        // Handle NULL values - put them at the end
        orderBy = `ORDER BY 
          CASE WHEN ts.${sortBy} IS NULL THEN 1 ELSE 0 END,
          ts.${sortBy} ${order}`
      }
    }

    // Build LIMIT and OFFSET clauses
    let limitClause = ''
    if (limit !== undefined) {
      limitClause = `LIMIT ?`
      params.push(limit)
      if (offset !== undefined) {
        limitClause += ` OFFSET ?`
        params.push(offset)
      }
    }

    // Subquery for next episode date (first unwatched episode with future air_date)
    // Extract date part from ISO datetime string for proper comparison
    const nextEpisodeSubquery = `
      SELECT MIN(e.air_date) as air_date, e.tv_show_id
      FROM episodes e
      WHERE e.is_watched = 0 
        AND e.air_date IS NOT NULL
        AND date(substr(e.air_date, 1, 10)) > date('now')
      GROUP BY e.tv_show_id
    `

    // Subquery for last episode aired date (latest air_date from episodes that have already aired)
    // Extract date part from ISO datetime string for proper comparison
    const lastEpisodeSubquery = `
      SELECT MAX(e.air_date) as air_date, e.tv_show_id
      FROM episodes e
      WHERE e.air_date IS NOT NULL
        AND date(substr(e.air_date, 1, 10)) <= date('now')
      GROUP BY e.tv_show_id
    `

    // Subqueries for watched progress
    const watchedProgressSubquery = `
      SELECT 
        tv_show_id,
        COUNT(*) as total_episodes,
        SUM(is_watched) as watched_count
      FROM episodes
      GROUP BY tv_show_id
    `

    // Completion status filter
    // Apply filter based on watched progress after the watched progress subquery is joined
    if (completionFilter && completionFilter !== 'all') {
      if (completionFilter === 'hideCompleted') {
        // Hide completed: Exclude shows where watched_count = total_episodes AND total_episodes > 0
        conditions.push(`(
          COALESCE(wp.total_episodes, 0) = 0 
          OR COALESCE(wp.watched_count, 0) < COALESCE(wp.total_episodes, 0)
          OR wp.total_episodes IS NULL
        )`)
      } else if (completionFilter === 'startedOnly') {
        // Started only: Show only shows where watched_count > 0 AND watched_count < total_episodes
        conditions.push(`(
          COALESCE(wp.watched_count, 0) > 0 
          AND COALESCE(wp.watched_count, 0) < COALESCE(wp.total_episodes, 0)
          AND COALESCE(wp.total_episodes, 0) > 0
        )`)
      } else if (completionFilter === 'newOnly') {
        // New only: Show only shows where watched_count = 0 OR total_episodes = 0
        conditions.push(`(
          COALESCE(wp.watched_count, 0) = 0 
          OR COALESCE(wp.total_episodes, 0) = 0 
          OR wp.watched_count IS NULL
        )`)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT 
        ts.*,
        next_ep.air_date as next_episode_date,
        last_ep.air_date as last_episode_date,
        COALESCE(wp.watched_count, 0) as watched_count,
        COALESCE(wp.total_episodes, 0) as total_episodes,
        COALESCE(tss.is_started, 0) as is_started
      FROM tv_shows ts
      LEFT JOIN tv_show_states tss ON ts.id = tss.tv_show_id
      LEFT JOIN (${nextEpisodeSubquery}) next_ep ON ts.id = next_ep.tv_show_id
      LEFT JOIN (${lastEpisodeSubquery}) last_ep ON ts.id = last_ep.tv_show_id
      LEFT JOIN (${watchedProgressSubquery}) wp ON ts.id = wp.tv_show_id
      ${whereClause}
      ${orderBy}
      ${limitClause}
    `

    const results = db.prepare(query).all(...params) as (TVShow & { 
      next_episode_date: string | null
      last_episode_date: string | null
      watched_count: number
      total_episodes: number
      is_started: number
    })[]
    
    // Convert to TVShow format with additional fields
    return results.map(r => ({
      ...r,
      next_episode_date: r.next_episode_date || null,
      last_episode_date: r.last_episode_date || null,
      watched_count: r.watched_count || 0,
      total_episodes: r.total_episodes || 0,
      is_started: r.is_started === 1,
    })) as any[]
  },

  getCount: (includeArchived: boolean = true, search?: string, statusFilter?: string, archiveFilter?: 'all' | 'archived' | 'unarchived', completionFilter?: 'all' | 'hideCompleted' | 'startedOnly' | 'newOnly') => {
    const conditions: string[] = []
    const params: any[] = []

    // Archived filter - use archiveFilter if provided, otherwise fall back to includeArchived
    if (archiveFilter === 'archived') {
      conditions.push('tss.is_archived = 1')
    } else if (archiveFilter === 'unarchived') {
      conditions.push('(tss.is_archived = 0 OR tss.is_archived IS NULL)')
    } else if (!includeArchived) {
      // Legacy behavior: if includeArchived is false and no archiveFilter, exclude archived
      conditions.push('(tss.is_archived = 0 OR tss.is_archived IS NULL)')
    }

    // Status filter
    if (statusFilter && statusFilter.trim()) {
      conditions.push('ts.status = ?')
      params.push(statusFilter.trim())
    }

    // Search filter (case-insensitive search on title and overview)
    if (search && search.trim()) {
      conditions.push('(LOWER(ts.title) LIKE ? OR LOWER(ts.overview) LIKE ?)')
      const searchTerm = `%${search.trim().toLowerCase()}%`
      params.push(searchTerm, searchTerm)
    }

    // Subquery for watched progress (same as in getAll)
    const watchedProgressSubquery = `
      SELECT 
        tv_show_id,
        COUNT(*) as total_episodes,
        SUM(is_watched) as watched_count
      FROM episodes
      GROUP BY tv_show_id
    `

    // Completion status filter
    // Apply filter based on watched progress after the watched progress subquery is joined
    if (completionFilter && completionFilter !== 'all') {
      if (completionFilter === 'hideCompleted') {
        // Hide completed: Exclude shows where watched_count = total_episodes AND total_episodes > 0
        conditions.push(`(
          COALESCE(wp.total_episodes, 0) = 0 
          OR COALESCE(wp.watched_count, 0) < COALESCE(wp.total_episodes, 0)
          OR wp.total_episodes IS NULL
        )`)
      } else if (completionFilter === 'startedOnly') {
        // Started only: Show only shows where watched_count > 0 AND watched_count < total_episodes
        conditions.push(`(
          COALESCE(wp.watched_count, 0) > 0 
          AND COALESCE(wp.watched_count, 0) < COALESCE(wp.total_episodes, 0)
          AND COALESCE(wp.total_episodes, 0) > 0
        )`)
      } else if (completionFilter === 'newOnly') {
        // New only: Show only shows where watched_count = 0 OR total_episodes = 0
        conditions.push(`(
          COALESCE(wp.watched_count, 0) = 0 
          OR COALESCE(wp.total_episodes, 0) = 0 
          OR wp.watched_count IS NULL
        )`)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT COUNT(*) as count
      FROM tv_shows ts
      LEFT JOIN tv_show_states tss ON ts.id = tss.tv_show_id
      LEFT JOIN (${watchedProgressSubquery}) wp ON ts.id = wp.tv_show_id
      ${whereClause}
    `
    const result = db.prepare(query).get(...params) as { count: number }
    return result.count
  },

  getUniqueStatuses: () => {
    return db.prepare(`
      SELECT DISTINCT status 
      FROM tv_shows 
      WHERE status IS NOT NULL AND status != ''
      ORDER BY status ASC
    `).all() as { status: string }[]
  },

  getById: (id: number) => {
    const tvShow = db.prepare('SELECT * FROM tv_shows WHERE id = ?').get(id) as TVShow | undefined
    if (!tvShow) return undefined
    
    const state = tvShowStateQueries.getByTVShowId(id)
    return {
      ...tvShow,
      is_started: state?.is_started === 1 || false,
    } as TVShow & { is_started: boolean }
  },

  getByTmdbId: (tmdbId: number) => {
    return db.prepare('SELECT * FROM tv_shows WHERE tmdb_id = ?').get(tmdbId) as TVShow | undefined
  },

  create: (tvShow: Omit<TVShow, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO tv_shows (tmdb_id, title, overview, poster_path, backdrop_path, first_air_date, last_air_date, status, saved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      tvShow.tmdb_id,
      tvShow.title,
      tvShow.overview,
      tvShow.poster_path,
      tvShow.backdrop_path,
      tvShow.first_air_date,
      tvShow.last_air_date,
      tvShow.status,
      tvShow.saved_at
    )
    return result.lastInsertRowid as number
  },

  update: (id: number, tvShow: Partial<Omit<TVShow, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(tvShow).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE tv_shows SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM tv_shows WHERE id = ?').run(id).changes
  },

  deleteAll: () => {
    // Delete all TV shows - cascading deletes will handle episodes and tv_show_states
    return db.prepare('DELETE FROM tv_shows').run().changes
  },
}

// Movie operations
export const movieQueries = {
  getAll: (
    search?: string,
    sortBy?: 'title' | 'release_date' | 'created_at',
    sortOrder?: 'asc' | 'desc',
    limit?: number,
    offset?: number,
    archiveFilter?: 'all' | 'archived' | 'unarchived',
    starredFilter?: 'all' | 'starred' | 'unstarred',
    watchedFilter?: 'all' | 'watched' | 'unwatched',
    playlistFilter?: 'all' | 'in_playlist' | 'not_in_playlist'
  ) => {
    const conditions: string[] = []
    const params: any[] = []

    // Archived filter
    if (archiveFilter === 'archived') {
      conditions.push('ms.is_archived = 1')
    } else if (archiveFilter === 'unarchived') {
      conditions.push('(ms.is_archived = 0 OR ms.is_archived IS NULL)')
    }

    // Starred filter
    if (starredFilter === 'starred') {
      // Use COALESCE to handle NULL values from LEFT JOIN (though setStarred should create the row)
      conditions.push('COALESCE(ms.is_starred, 0) = 1')
    } else if (starredFilter === 'unstarred') {
      conditions.push('(ms.is_starred = 0 OR ms.is_starred IS NULL)')
    }

    // Watched filter
    if (watchedFilter === 'watched') {
      conditions.push('ms.is_watched = 1')
    } else if (watchedFilter === 'unwatched') {
      conditions.push('(ms.is_watched = 0 OR ms.is_watched IS NULL)')
    }

    // Playlist filter
    if (playlistFilter === 'in_playlist') {
      conditions.push('EXISTS (SELECT 1 FROM movie_playlist_items WHERE movie_id = m.id)')
    } else if (playlistFilter === 'not_in_playlist') {
      conditions.push('NOT EXISTS (SELECT 1 FROM movie_playlist_items WHERE movie_id = m.id)')
    }

    // Search filter (case-insensitive search on title and overview)
    if (search && search.trim()) {
      conditions.push('(LOWER(m.title) LIKE ? OR LOWER(m.overview) LIKE ?)')
      const searchTerm = `%${search.trim().toLowerCase()}%`
      params.push(searchTerm, searchTerm)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build ORDER BY clause
    let orderBy = 'ORDER BY m.title ASC' // Default sort
    if (sortBy && (sortBy === 'title' || sortBy === 'release_date' || sortBy === 'created_at')) {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
      // Handle NULL values - put them at the end
      orderBy = `ORDER BY 
        CASE WHEN m.${sortBy} IS NULL THEN 1 ELSE 0 END,
        m.${sortBy} ${order}`
    }

    // Build LIMIT and OFFSET clauses
    let limitClause = ''
    if (limit !== undefined) {
      limitClause = `LIMIT ?`
      params.push(limit)
      if (offset !== undefined) {
        limitClause += ` OFFSET ?`
        params.push(offset)
      }
    }

    const query = `
      SELECT 
        m.*,
        COALESCE(ms.is_archived, 0) as is_archived,
        COALESCE(ms.is_starred, 0) as is_starred,
        COALESCE(ms.is_watched, 0) as is_watched
      FROM movies m
      LEFT JOIN movie_states ms ON m.id = ms.movie_id
      ${whereClause}
      ${orderBy}
      ${limitClause}
    `

    const results = db.prepare(query).all(...params) as (Movie & {
      is_archived: number
      is_starred: number
      is_watched: number
    })[]

    // Convert to Movie format with boolean fields
    return results.map(r => ({
      ...r,
      is_archived: r.is_archived === 1,
      is_starred: r.is_starred === 1,
      is_watched: r.is_watched === 1,
    })) as any[]
  },

  getCount: (
    search?: string,
    archiveFilter?: 'all' | 'archived' | 'unarchived',
    starredFilter?: 'all' | 'starred' | 'unstarred',
    watchedFilter?: 'all' | 'watched' | 'unwatched',
    playlistFilter?: 'all' | 'in_playlist' | 'not_in_playlist'
  ) => {
    const conditions: string[] = []
    const params: any[] = []

    // Archived filter
    if (archiveFilter === 'archived') {
      conditions.push('ms.is_archived = 1')
    } else if (archiveFilter === 'unarchived') {
      conditions.push('(ms.is_archived = 0 OR ms.is_archived IS NULL)')
    }

    // Starred filter
    if (starredFilter === 'starred') {
      // Use COALESCE to handle NULL values from LEFT JOIN (though setStarred should create the row)
      conditions.push('COALESCE(ms.is_starred, 0) = 1')
    } else if (starredFilter === 'unstarred') {
      conditions.push('(ms.is_starred = 0 OR ms.is_starred IS NULL)')
    }

    // Watched filter
    if (watchedFilter === 'watched') {
      conditions.push('ms.is_watched = 1')
    } else if (watchedFilter === 'unwatched') {
      conditions.push('(ms.is_watched = 0 OR ms.is_watched IS NULL)')
    }

    // Playlist filter
    if (playlistFilter === 'in_playlist') {
      conditions.push('EXISTS (SELECT 1 FROM movie_playlist_items WHERE movie_id = m.id)')
    } else if (playlistFilter === 'not_in_playlist') {
      conditions.push('NOT EXISTS (SELECT 1 FROM movie_playlist_items WHERE movie_id = m.id)')
    }

    // Search filter (case-insensitive search on title and overview)
    if (search && search.trim()) {
      conditions.push('(LOWER(m.title) LIKE ? OR LOWER(m.overview) LIKE ?)')
      const searchTerm = `%${search.trim().toLowerCase()}%`
      params.push(searchTerm, searchTerm)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT COUNT(*) as count 
      FROM movies m
      LEFT JOIN movie_states ms ON m.id = ms.movie_id
      ${whereClause}
    `
    const result = db.prepare(query).get(...params) as { count: number }
    return result.count
  },

  getById: (id: number) => {
    const result = db.prepare(`
      SELECT 
        m.*,
        COALESCE(ms.is_archived, 0) as is_archived,
        COALESCE(ms.is_starred, 0) as is_starred,
        COALESCE(ms.is_watched, 0) as is_watched
      FROM movies m
      LEFT JOIN movie_states ms ON m.id = ms.movie_id
      WHERE m.id = ?
    `).get(id) as (Movie & {
      is_archived: number
      is_starred: number
      is_watched: number
    }) | undefined

    if (!result) return undefined

    return {
      ...result,
      is_archived: result.is_archived === 1,
      is_starred: result.is_starred === 1,
      is_watched: result.is_watched === 1,
    } as any
  },

  getByTmdbId: (tmdbId: number) => {
    return db.prepare('SELECT * FROM movies WHERE tmdb_id = ?').get(tmdbId) as Movie | undefined
  },

  getByImdbId: (imdbId: string) => {
    return db.prepare('SELECT * FROM movies WHERE imdb_id = ?').get(imdbId) as Movie | undefined
  },

  create: (movie: Omit<Movie, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO movies (tmdb_id, imdb_id, title, overview, poster_path, backdrop_path, release_date, saved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      movie.tmdb_id,
      movie.imdb_id,
      movie.title,
      movie.overview,
      movie.poster_path,
      movie.backdrop_path,
      movie.release_date,
      movie.saved_at
    )
    return result.lastInsertRowid as number
  },

  update: (id: number, movie: Partial<Omit<Movie, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(movie).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE movies SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM movies WHERE id = ?').run(id).changes
  },

  deleteAll: () => {
    return db.prepare('DELETE FROM movies').run().changes
  },
}

// Movie State operations
export const movieStateQueries = {
  getState: (movieId: number) => {
    return db.prepare('SELECT * FROM movie_states WHERE movie_id = ?').get(movieId) as MovieState | undefined
  },

  setArchived: (movieId: number, isArchived: boolean) => {
    const stmt = db.prepare(`
      INSERT INTO movie_states (movie_id, is_archived, archived_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(movie_id) DO UPDATE SET
        is_archived = excluded.is_archived,
        archived_at = excluded.archived_at,
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run(movieId, isArchived ? 1 : 0, isArchived ? new Date().toISOString() : null).changes
  },

  setStarred: (movieId: number, isStarred: boolean) => {
    const stmt = db.prepare(`
      INSERT INTO movie_states (movie_id, is_starred, starred_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(movie_id) DO UPDATE SET
        is_starred = excluded.is_starred,
        starred_at = excluded.starred_at,
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run(movieId, isStarred ? 1 : 0, isStarred ? new Date().toISOString() : null).changes
  },

  setWatched: (movieId: number, isWatched: boolean) => {
    const stmt = db.prepare(`
      INSERT INTO movie_states (movie_id, is_watched, watched_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(movie_id) DO UPDATE SET
        is_watched = excluded.is_watched,
        watched_at = excluded.watched_at,
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run(movieId, isWatched ? 1 : 0, isWatched ? new Date().toISOString() : null).changes
  },
}

// Episode operations
export const episodeQueries = {
  getByTVShowId: (tvShowId: number) => {
    return db.prepare(`
      SELECT * FROM episodes 
      WHERE tv_show_id = ? 
      ORDER BY season_number ASC, episode_number ASC
    `).all(tvShowId) as Episode[]
  },

  getByTVShowIdAndSeason: (tvShowId: number, seasonNumber: number) => {
    return db.prepare(`
      SELECT * FROM episodes 
      WHERE tv_show_id = ? AND season_number = ?
      ORDER BY episode_number ASC
    `).all(tvShowId, seasonNumber) as Episode[]
  },

  getById: (id: number) => {
    return db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Episode | undefined
  },

  getByDateRange: (startDate: string, endDate: string, hideArchived: boolean = false) => {
    if (hideArchived) {
      return db.prepare(`
        SELECT e.*, ts.title as tv_show_title, ts.poster_path as tv_show_poster
        FROM episodes e
        INNER JOIN tv_shows ts ON e.tv_show_id = ts.id
        LEFT JOIN tv_show_states tss ON ts.id = tss.tv_show_id
        WHERE e.air_date >= ? AND e.air_date <= ?
          AND (tss.is_archived = 0 OR tss.is_archived IS NULL)
        ORDER BY e.air_date ASC, ts.title ASC, e.season_number ASC, e.episode_number ASC
      `).all(startDate, endDate) as (Episode & { tv_show_title: string; tv_show_poster: string | null })[]
    } else {
      return db.prepare(`
        SELECT e.*, ts.title as tv_show_title, ts.poster_path as tv_show_poster
        FROM episodes e
        INNER JOIN tv_shows ts ON e.tv_show_id = ts.id
        WHERE e.air_date >= ? AND e.air_date <= ?
        ORDER BY e.air_date ASC, ts.title ASC, e.season_number ASC, e.episode_number ASC
      `).all(startDate, endDate) as (Episode & { tv_show_title: string; tv_show_poster: string | null })[]
    }
  },

  create: (episode: Omit<Episode, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO episodes (tv_show_id, season_number, episode_number, name, overview, air_date, runtime, still_path, is_watched, watched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tv_show_id, season_number, episode_number) DO UPDATE SET
        name = excluded.name,
        overview = excluded.overview,
        air_date = excluded.air_date,
        runtime = excluded.runtime,
        still_path = excluded.still_path,
        updated_at = CURRENT_TIMESTAMP
    `)
    const result = stmt.run(
      episode.tv_show_id,
      episode.season_number,
      episode.episode_number,
      episode.name,
      episode.overview,
      episode.air_date,
      episode.runtime,
      episode.still_path,
      episode.is_watched || 0,
      episode.watched_at
    )
    return result.lastInsertRowid as number
  },

  update: (id: number, episode: Partial<Omit<Episode, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(episode).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE episodes SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  markAsWatched: (id: number) => {
    return db.prepare(`
      UPDATE episodes 
      SET is_watched = 1, watched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id).changes
  },

  markAllAsWatched: (tvShowId: number) => {
    return db.prepare(`
      UPDATE episodes 
      SET is_watched = 1, watched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE tv_show_id = ?
    `).run(tvShowId).changes
  },

  markAllEpisodesAsWatched: () => {
    return db.prepare(`
      UPDATE episodes 
      SET is_watched = 1, watched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE is_watched = 0
    `).run().changes
  },

  markAsUnwatched: (id: number) => {
    return db.prepare(`
      UPDATE episodes 
      SET is_watched = 0, watched_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id).changes
  },

  markSeasonAsWatched: (tvShowId: number, seasonNumber: number) => {
    return db.prepare(`
      UPDATE episodes 
      SET is_watched = 1, watched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE tv_show_id = ? AND season_number = ?
    `).run(tvShowId, seasonNumber).changes
  },

  getWatchedCount: (tvShowId: number): number => {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM episodes 
      WHERE tv_show_id = ? AND is_watched = 1
    `).get(tvShowId) as { count: number } | undefined
    return result?.count || 0
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM episodes WHERE id = ?').run(id).changes
  },
}

// TV Show State operations
export const tvShowStateQueries = {
  getByTVShowId: (tvShowId: number) => {
    return db.prepare('SELECT * FROM tv_show_states WHERE tv_show_id = ?').get(tvShowId) as TVShowState | undefined
  },

  setArchived: (tvShowId: number, isArchived: boolean) => {
    const stmt = db.prepare(`
      INSERT INTO tv_show_states (tv_show_id, is_archived, archived_at, is_started, started_at, updated_at)
      VALUES (?, ?, ?, COALESCE((SELECT is_started FROM tv_show_states WHERE tv_show_id = ?), 0), 
              COALESCE((SELECT started_at FROM tv_show_states WHERE tv_show_id = ?), NULL), CURRENT_TIMESTAMP)
      ON CONFLICT(tv_show_id) DO UPDATE SET
        is_archived = excluded.is_archived,
        archived_at = excluded.archived_at,
        is_started = COALESCE(excluded.is_started, (SELECT is_started FROM tv_show_states WHERE tv_show_id = excluded.tv_show_id), 0),
        started_at = COALESCE(excluded.started_at, (SELECT started_at FROM tv_show_states WHERE tv_show_id = excluded.tv_show_id), NULL),
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run(tvShowId, isArchived ? 1 : 0, isArchived ? new Date().toISOString() : null, tvShowId, tvShowId).changes
  },

  isArchived: (tvShowId: number): boolean => {
    const state = db.prepare('SELECT is_archived FROM tv_show_states WHERE tv_show_id = ?').get(tvShowId) as { is_archived: number } | undefined
    return state?.is_archived === 1
  },

  setStarted: (tvShowId: number, isStarted: boolean) => {
    const stmt = db.prepare(`
      INSERT INTO tv_show_states (tv_show_id, is_archived, archived_at, is_started, started_at, updated_at)
      VALUES (?, COALESCE((SELECT is_archived FROM tv_show_states WHERE tv_show_id = ?), 0),
              COALESCE((SELECT archived_at FROM tv_show_states WHERE tv_show_id = ?), NULL), ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(tv_show_id) DO UPDATE SET
        is_started = excluded.is_started,
        started_at = excluded.started_at,
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run(
      tvShowId, 
      tvShowId, 
      tvShowId, 
      isStarted ? 1 : 0, 
      isStarted ? new Date().toISOString() : null
    ).changes
  },

  isStarted: (tvShowId: number): boolean => {
    const state = db.prepare('SELECT is_started FROM tv_show_states WHERE tv_show_id = ?').get(tvShowId) as { is_started: number } | undefined
    return state?.is_started === 1
  },
}

// Settings operations
export interface Setting {
  id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

export const settingsQueries = {
  getSetting: (key: string): string | null => {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return result?.value || null
  },

  setSetting: (key: string, value: string): void => {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `)
    stmt.run(key, value)
  },
}

// Movie Playlist interfaces
export interface MoviePlaylist {
  id: number
  name: string
  description: string | null
  color: string | null
  sort_order: number
  display_on_home?: number
  created_at: string
  updated_at: string
}

export interface MoviePlaylistItem {
  id: number
  playlist_id: number
  movie_id: number
  position: number
  added_at: string
}

export interface MoviePlaylistWithMovies extends MoviePlaylist {
  movies: (Movie & { position: number; added_at: string })[]
  movie_count: number
}

// Movie Playlist operations
export const moviePlaylistQueries = {
  create: (name: string, description?: string | null, color?: string | null, display_on_home?: number): number => {
    const stmt = db.prepare(`
      INSERT INTO movie_playlists (name, description, color, sort_order, display_on_home, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    const result = stmt.run(name, description || null, color || null, display_on_home ?? 0)
    return result.lastInsertRowid as number
  },

  getAll: (displayOnHome?: boolean): (MoviePlaylist & { movie_count: number })[] => {
    let whereClause = ''
    if (displayOnHome !== undefined) {
      whereClause = `WHERE mp.display_on_home = ${displayOnHome ? 1 : 0}`
    }
    const query = `
      SELECT 
        mp.*,
        COUNT(mpi.id) as movie_count
      FROM movie_playlists mp
      LEFT JOIN movie_playlist_items mpi ON mp.id = mpi.playlist_id
      ${whereClause}
      GROUP BY mp.id
      ORDER BY mp.sort_order ASC, mp.created_at ASC
    `
    return db.prepare(query).all() as (MoviePlaylist & { movie_count: number })[]
  },

  getById: (id: number): MoviePlaylistWithMovies | undefined => {
    const playlist = db.prepare('SELECT * FROM movie_playlists WHERE id = ?').get(id) as MoviePlaylist | undefined
    if (!playlist) return undefined

    const movies = db.prepare(`
      SELECT 
        m.*,
        mpi.position,
        mpi.added_at,
        COALESCE(ms.is_archived, 0) as is_archived,
        COALESCE(ms.is_starred, 0) as is_starred,
        COALESCE(ms.is_watched, 0) as is_watched
      FROM movie_playlist_items mpi
      INNER JOIN movies m ON mpi.movie_id = m.id
      LEFT JOIN movie_states ms ON m.id = ms.movie_id
      WHERE mpi.playlist_id = ?
      ORDER BY mpi.position ASC, mpi.added_at ASC
    `).all(id) as (Movie & { position: number; added_at: string; is_archived: number; is_starred: number; is_watched: number })[]

    // Convert to Movie format with boolean fields
    const moviesWithBooleans = movies.map(m => ({
      ...m,
      is_archived: m.is_archived === 1,
      is_starred: m.is_starred === 1,
      is_watched: m.is_watched === 1,
    })) as (Movie & { position: number; added_at: string; is_archived: boolean; is_starred: boolean; is_watched: boolean })[]

    return {
      ...playlist,
      movies: moviesWithBooleans,
      movie_count: movies.length,
    }
  },

  update: (id: number, updates: { name?: string; description?: string | null; color?: string | null; display_on_home?: number }): number => {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.color !== undefined) {
      fields.push('color = ?')
      values.push(updates.color)
    }
    if (updates.display_on_home !== undefined) {
      fields.push('display_on_home = ?')
      values.push(updates.display_on_home)
    }

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE movie_playlists SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  delete: (id: number): number => {
    return db.prepare('DELETE FROM movie_playlists WHERE id = ?').run(id).changes
  },

  addMovie: (playlistId: number, movieId: number): number => {
    // Get the current max position for this playlist
    const maxPosition = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos
      FROM movie_playlist_items
      WHERE playlist_id = ?
    `).get(playlistId) as { max_pos: number } | undefined

    const nextPosition = (maxPosition?.max_pos ?? -1) + 1

    const stmt = db.prepare(`
      INSERT INTO movie_playlist_items (playlist_id, movie_id, position, added_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(playlist_id, movie_id) DO NOTHING
    `)
    const result = stmt.run(playlistId, movieId, nextPosition)
    return result.lastInsertRowid as number
  },

  addMovies: (playlistId: number, movieIds: number[]): number => {
    if (movieIds.length === 0) return 0

    // Get the current max position for this playlist
    const maxPosition = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos
      FROM movie_playlist_items
      WHERE playlist_id = ?
    `).get(playlistId) as { max_pos: number } | undefined

    let currentPosition = (maxPosition?.max_pos ?? -1) + 1
    let addedCount = 0

    const stmt = db.prepare(`
      INSERT INTO movie_playlist_items (playlist_id, movie_id, position, added_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(playlist_id, movie_id) DO NOTHING
    `)

    for (const movieId of movieIds) {
      const result = stmt.run(playlistId, movieId, currentPosition)
      if (result.changes > 0) {
        addedCount++
        currentPosition++
      }
    }

    return addedCount
  },

  removeMovie: (playlistId: number, movieId: number): number => {
    const stmt = db.prepare('DELETE FROM movie_playlist_items WHERE playlist_id = ? AND movie_id = ?')
    return stmt.run(playlistId, movieId).changes
  },

  removeMovies: (playlistId: number, movieIds: number[]): number => {
    if (movieIds.length === 0) return 0

    const placeholders = movieIds.map(() => '?').join(',')
    const stmt = db.prepare(`
      DELETE FROM movie_playlist_items 
      WHERE playlist_id = ? AND movie_id IN (${placeholders})
    `)
    return stmt.run(playlistId, ...movieIds).changes
  },

  reorderMovies: (playlistId: number, movieIds: number[]): void => {
    // Use a transaction to ensure atomicity
    const transaction = db.transaction((playlistId: number, movieIds: number[]) => {
      // First, remove all items for this playlist
      db.prepare('DELETE FROM movie_playlist_items WHERE playlist_id = ?').run(playlistId)

      // Then, re-insert them in the new order
      const stmt = db.prepare(`
        INSERT INTO movie_playlist_items (playlist_id, movie_id, position, added_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `)

      movieIds.forEach((movieId, index) => {
        stmt.run(playlistId, movieId, index)
      })
    })

    transaction(playlistId, movieIds)
  },

  getMovieCount: (playlistId: number): number => {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM movie_playlist_items
      WHERE playlist_id = ?
    `).get(playlistId) as { count: number } | undefined
    return result?.count ?? 0
  },

  updateDisplayOnHome: (id: number, displayOnHome: boolean): number => {
    const stmt = db.prepare(`
      UPDATE movie_playlists 
      SET display_on_home = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    return stmt.run(displayOnHome ? 1 : 0, id).changes
  },

  reorderPlaylists: (playlistIds: number[]): void => {
    // Use a transaction to ensure atomicity
    const transaction = db.transaction((playlistIds: number[]) => {
      const stmt = db.prepare(`
        UPDATE movie_playlists 
        SET sort_order = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)

      playlistIds.forEach((playlistId, index) => {
        stmt.run(index, playlistId)
      })
    })

    transaction(playlistIds)
  },
}

// Channel Group interfaces
export interface ChannelList {
  id: number
  name: string
  description: string | null
  color: string | null
  sort_order: number
  display_on_home?: number
  created_at: string
  updated_at: string
}

export interface ChannelListItem {
  id: number
  list_id: number
  youtube_channel_id: string
  position: number
  added_at: string
}

export interface ChannelListWithChannels extends ChannelList {
  channels: (Channel & { position: number; added_at: string })[]
  channel_count: number
}

// Channel Group operations
export const channelListQueries = {
  create: (name: string, description?: string | null, color?: string | null, display_on_home?: number): number => {
    const stmt = db.prepare(`
      INSERT INTO channel_lists (name, description, color, sort_order, display_on_home, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    const result = stmt.run(name, description || null, color || null, display_on_home ?? 0)
    return result.lastInsertRowid as number
  },

  getAll: (displayOnHome?: boolean): (ChannelList & { channel_count: number })[] => {
    let whereClause = ''
    if (displayOnHome !== undefined) {
      whereClause = `WHERE cl.display_on_home = ${displayOnHome ? 1 : 0}`
    }
    const query = `
      SELECT 
        cl.*,
        COUNT(cli.id) as channel_count
      FROM channel_lists cl
      LEFT JOIN channel_list_items cli ON cl.id = cli.list_id
      ${whereClause}
      GROUP BY cl.id
      ORDER BY cl.sort_order ASC, cl.name ASC
    `
    return db.prepare(query).all() as (ChannelList & { channel_count: number })[]
  },

  getById: (id: number): ChannelListWithChannels | undefined => {
    const list = db.prepare('SELECT * FROM channel_lists WHERE id = ?').get(id) as ChannelList | undefined
    if (!list) return undefined

    const channels = db.prepare(`
      SELECT 
        c.*,
        cli.position,
        cli.added_at
      FROM channel_list_items cli
      INNER JOIN channels c ON cli.youtube_channel_id = c.youtube_channel_id
      WHERE cli.list_id = ?
      ORDER BY cli.position ASC, cli.added_at ASC
    `).all(id) as (Channel & { position: number; added_at: string })[]

    return {
      ...list,
      channels,
      channel_count: channels.length,
    }
  },

  update: (id: number, updates: { name?: string; description?: string | null; color?: string | null; display_on_home?: number }): number => {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.color !== undefined) {
      fields.push('color = ?')
      values.push(updates.color)
    }
    if (updates.display_on_home !== undefined) {
      fields.push('display_on_home = ?')
      values.push(updates.display_on_home)
    }

    if (fields.length === 0) return 0

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE channel_lists SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values).changes
  },

  updateDisplayOnHome: (id: number, displayOnHome: boolean): number => {
    const stmt = db.prepare(`
      UPDATE channel_lists 
      SET display_on_home = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    return stmt.run(displayOnHome ? 1 : 0, id).changes
  },

  reorderChannelGroups: (groupIds: number[]): void => {
    // Use a transaction to ensure atomicity
    const transaction = db.transaction((groupIds: number[]) => {
      const stmt = db.prepare(`
        UPDATE channel_lists 
        SET sort_order = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)

      groupIds.forEach((groupId, index) => {
        stmt.run(index, groupId)
      })
    })

    transaction(groupIds)
  },

  delete: (id: number): number => {
    return db.prepare('DELETE FROM channel_lists WHERE id = ?').run(id).changes
  },

  addChannel: (listId: number, youtubeChannelId: string): number => {
    // Get the current max position for this list
    const maxPosition = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos
      FROM channel_list_items
      WHERE list_id = ?
    `).get(listId) as { max_pos: number } | undefined

    const nextPosition = (maxPosition?.max_pos ?? -1) + 1

    const stmt = db.prepare(`
      INSERT INTO channel_list_items (list_id, youtube_channel_id, position, added_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(list_id, youtube_channel_id) DO NOTHING
    `)
    const result = stmt.run(listId, youtubeChannelId, nextPosition)
    return result.changes
  },

  addChannels: (listId: number, youtubeChannelIds: string[]): number => {
    if (youtubeChannelIds.length === 0) return 0

    // Get the current max position for this list
    const maxPosition = db.prepare(`
      SELECT COALESCE(MAX(position), -1) as max_pos
      FROM channel_list_items
      WHERE list_id = ?
    `).get(listId) as { max_pos: number } | undefined

    let currentPosition = (maxPosition?.max_pos ?? -1) + 1
    let addedCount = 0

    const stmt = db.prepare(`
      INSERT INTO channel_list_items (list_id, youtube_channel_id, position, added_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(list_id, youtube_channel_id) DO NOTHING
    `)

    for (const youtubeChannelId of youtubeChannelIds) {
      const result = stmt.run(listId, youtubeChannelId, currentPosition)
      if (result.changes > 0) {
        addedCount++
        currentPosition++
      }
    }

    return addedCount
  },

  removeChannel: (listId: number, youtubeChannelId: string): number => {
    const stmt = db.prepare('DELETE FROM channel_list_items WHERE list_id = ? AND youtube_channel_id = ?')
    return stmt.run(listId, youtubeChannelId).changes
  },

  getChannelsInList: (listId: number): Channel[] => {
    return db.prepare(`
      SELECT c.*
      FROM channel_list_items cli
      INNER JOIN channels c ON cli.youtube_channel_id = c.youtube_channel_id
      WHERE cli.list_id = ?
      ORDER BY cli.position ASC, cli.added_at ASC
    `).all(listId) as Channel[]
  },

  getVideosForList: (listId: number, type: 'watch_later' | 'latest' | 'liked', sortBy?: 'title' | 'added_to_latest_at' | 'published_at' | 'added_to_playlist_at', sortOrder?: 'asc' | 'desc', stateFilter?: 'all' | 'exclude_archived' | 'feed' | 'inbox' | 'archive', shortsFilter?: 'all' | 'exclude' | 'only'): (Video & { state: string | null })[] => {
    // Get channel IDs in this list
    const channelIds = db.prepare(`
      SELECT youtube_channel_id
      FROM channel_list_items
      WHERE list_id = ?
    `).all(listId) as { youtube_channel_id: string }[]

    if (channelIds.length === 0) {
      return []
    }

    const placeholders = channelIds.map(() => '?').join(',')
    const channelIdValues = channelIds.map(c => c.youtube_channel_id)

    if (type === 'watch_later') {
      // Build state filter condition
      let stateCondition = ''
      if (stateFilter === 'exclude_archived') {
        // Default: show videos with no state, feed, or inbox (exclude archived)
        stateCondition = 'AND (vs.state IS NULL OR vs.state IN (\'feed\', \'inbox\'))'
      } else if (stateFilter === 'feed') {
        stateCondition = 'AND vs.state = \'feed\''
      } else if (stateFilter === 'inbox') {
        stateCondition = 'AND vs.state = \'inbox\''
      } else if (stateFilter === 'archive') {
        stateCondition = 'AND vs.state = \'archive\''
      }
      // If stateFilter is 'all' or undefined, show all videos (no state condition)

      // Build ORDER BY clause for watch later videos
      let orderBy = 'ORDER BY v.added_to_playlist_at DESC' // Default sort
      if (sortBy && (sortBy === 'title' || sortBy === 'added_to_playlist_at' || sortBy === 'published_at')) {
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
        // Handle NULL values - put them at the end
        if (sortBy === 'title') {
          orderBy = `ORDER BY 
            CASE WHEN v.title IS NULL THEN 1 ELSE 0 END,
            v.title ${order}`
        } else if (sortBy === 'published_at') {
          // Cast published_at to datetime for proper chronological sorting
          orderBy = `ORDER BY 
            CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END,
            datetime(v.published_at) ${order}`
        } else {
          orderBy = `ORDER BY 
            CASE WHEN v.${sortBy} IS NULL THEN 1 ELSE 0 END,
            v.${sortBy} ${order}`
        }
      }

      // Get videos from channels in the list (watch later videos) with optional state filtering
      let videos = db.prepare(`
        SELECT v.*, vs.state 
        FROM videos v
        LEFT JOIN video_states vs ON v.id = vs.video_id
        WHERE v.youtube_channel_id IN (${placeholders})
        ${stateCondition}
        ${orderBy}
      `).all(...channelIdValues) as (Video & { state: string | null })[]

      // Apply shorts filter if specified
      if (shortsFilter === 'exclude') {
        videos = videos.filter(v => !isShortVideo(v.duration))
      } else if (shortsFilter === 'only') {
        videos = videos.filter(v => isShortVideo(v.duration))
      }
      // If shortsFilter is 'all' or undefined, show all videos

      return videos
    } else if (type === 'latest') {
      // Build ORDER BY clause for latest videos
      let orderBy = 'ORDER BY v.added_to_latest_at DESC' // Default sort
      if (sortBy && (sortBy === 'title' || sortBy === 'added_to_latest_at' || sortBy === 'published_at')) {
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC'
        // Handle NULL values - put them at the end
        if (sortBy === 'title') {
          orderBy = `ORDER BY 
            CASE WHEN v.title IS NULL THEN 1 ELSE 0 END,
            v.title ${order}`
        } else if (sortBy === 'published_at') {
          // Cast published_at to datetime for proper chronological sorting
          orderBy = `ORDER BY 
            CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END,
            datetime(v.published_at) ${order}`
        } else {
          orderBy = `ORDER BY 
            CASE WHEN v.${sortBy} IS NULL THEN 1 ELSE 0 END,
            v.${sortBy} ${order}`
        }
      }
      
      // Get latest videos (with added_to_latest_at and feed state or no state)
      let videos = db.prepare(`
        SELECT v.*, vs.state 
        FROM videos v
        LEFT JOIN video_states vs ON v.id = vs.video_id
        WHERE v.youtube_channel_id IN (${placeholders})
          AND v.added_to_latest_at IS NOT NULL
          AND (vs.state IS NULL OR vs.state = 'feed')
        ${orderBy}
      `).all(...channelIdValues) as (Video & { state: string | null })[]

      // Apply shorts filter if specified
      if (shortsFilter === 'exclude') {
        videos = videos.filter(v => !isShortVideo(v.duration))
      } else if (shortsFilter === 'only') {
        videos = videos.filter(v => isShortVideo(v.duration))
      }
      // If shortsFilter is 'all' or undefined, show all videos

      return videos
    } else {
      // Liked videos - placeholder for future implementation
      return []
    }
  },
}

