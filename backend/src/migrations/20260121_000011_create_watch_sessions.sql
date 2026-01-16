-- Migration: Create watch_sessions table
-- This table tracks actual viewing behavior for analytics and resume functionality

CREATE TABLE IF NOT EXISTS watch_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL CHECK(media_type IN ('video', 'movie', 'episode')),
  media_id INTEGER NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  progress_seconds REAL DEFAULT 0,
  completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_watch_sessions_media ON watch_sessions(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_started_at ON watch_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_completed ON watch_sessions(completed);
