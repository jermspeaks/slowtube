-- Migration: Remove channel_title from videos table
-- Channel title should be retrieved from channels table via join
-- This migration removes the duplicate channel_title column

-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- This is a complex operation, so we'll do it in steps:

-- Step 1: Create new videos table without channel_title
CREATE TABLE IF NOT EXISTS videos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TEXT,
  added_to_playlist_at TEXT,
  added_to_latest_at TEXT,
  fetch_status TEXT CHECK(fetch_status IN ('pending', 'completed', 'unavailable', 'failed')) DEFAULT 'pending',
  youtube_channel_id TEXT,
  channel_id INTEGER,
  youtube_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table to new table (excluding channel_title)
INSERT INTO videos_new (
  id, youtube_id, title, description, thumbnail_url, duration, published_at,
  added_to_playlist_at, added_to_latest_at, fetch_status, youtube_channel_id,
  channel_id, youtube_url, created_at, updated_at
)
SELECT 
  id, youtube_id, title, description, thumbnail_url, duration, published_at,
  added_to_playlist_at, added_to_latest_at, fetch_status, youtube_channel_id,
  channel_id, youtube_url, created_at, updated_at
FROM videos;

-- Step 3: Drop old table
DROP TABLE videos;

-- Step 4: Rename new table to videos
ALTER TABLE videos_new RENAME TO videos;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_fetch_status ON videos(fetch_status);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_channel_id ON videos(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
