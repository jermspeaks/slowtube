-- Migration: Standardize date column types
-- Convert internal date columns from TEXT to DATETIME
-- Keep external API dates (published_at, air_date, release_date) as TEXT

-- Note: SQLite doesn't support ALTER COLUMN, so we need to recreate tables
-- This is complex, so we'll do it table by table

-- Step 1: Videos table - convert added_to_playlist_at and added_to_latest_at
-- Create new videos table with DATETIME columns
CREATE TABLE IF NOT EXISTS videos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TEXT, -- Keep as TEXT (external API date)
  added_to_playlist_at DATETIME, -- Convert to DATETIME
  added_to_latest_at DATETIME, -- Convert to DATETIME
  fetch_status TEXT CHECK(fetch_status IN ('pending', 'completed', 'unavailable', 'failed')) DEFAULT 'pending',
  youtube_channel_id TEXT,
  channel_id INTEGER,
  youtube_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data, converting TEXT dates to DATETIME where possible
INSERT INTO videos_new (
  id, youtube_id, title, description, thumbnail_url, duration, published_at,
  added_to_playlist_at, added_to_latest_at, fetch_status, youtube_channel_id,
  channel_id, youtube_url, created_at, updated_at
)
SELECT 
  id, youtube_id, title, description, thumbnail_url, duration, published_at,
  CASE 
    WHEN added_to_playlist_at IS NOT NULL AND added_to_playlist_at != '' 
    THEN datetime(added_to_playlist_at) 
    ELSE NULL 
  END as added_to_playlist_at,
  CASE 
    WHEN added_to_latest_at IS NOT NULL AND added_to_latest_at != '' 
    THEN datetime(added_to_latest_at) 
    ELSE NULL 
  END as added_to_latest_at,
  fetch_status, youtube_channel_id, channel_id, youtube_url, created_at, updated_at
FROM videos;

-- Drop old table and rename
DROP TABLE videos;
ALTER TABLE videos_new RENAME TO videos;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_fetch_status ON videos(fetch_status);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_channel_id ON videos(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);

-- Step 2: TV Shows table - convert saved_at
CREATE TABLE IF NOT EXISTS tv_shows_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date TEXT, -- Keep as TEXT (external API date)
  last_air_date TEXT, -- Keep as TEXT (external API date)
  status TEXT,
  saved_at DATETIME, -- Convert to DATETIME
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tv_shows_new (
  id, tmdb_id, title, overview, poster_path, backdrop_path, first_air_date,
  last_air_date, status, saved_at, created_at, updated_at
)
SELECT 
  id, tmdb_id, title, overview, poster_path, backdrop_path, first_air_date,
  last_air_date, status,
  CASE 
    WHEN saved_at IS NOT NULL AND saved_at != '' 
    THEN datetime(saved_at) 
    ELSE NULL 
  END as saved_at,
  created_at, updated_at
FROM tv_shows;

DROP TABLE tv_shows;
ALTER TABLE tv_shows_new RENAME TO tv_shows;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tv_shows_tmdb_id ON tv_shows(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tv_shows_status ON tv_shows(status);
CREATE INDEX IF NOT EXISTS idx_tv_shows_first_air_date ON tv_shows(first_air_date);

-- Step 3: Movies table - convert saved_at
CREATE TABLE IF NOT EXISTS movies_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL UNIQUE,
  imdb_id TEXT,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT, -- Keep as TEXT (external API date)
  saved_at DATETIME, -- Convert to DATETIME
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO movies_new (
  id, tmdb_id, imdb_id, title, overview, poster_path, backdrop_path,
  release_date, saved_at, created_at, updated_at
)
SELECT 
  id, tmdb_id, imdb_id, title, overview, poster_path, backdrop_path,
  release_date,
  CASE 
    WHEN saved_at IS NOT NULL AND saved_at != '' 
    THEN datetime(saved_at) 
    ELSE NULL 
  END as saved_at,
  created_at, updated_at
FROM movies;

DROP TABLE movies;
ALTER TABLE movies_new RENAME TO movies;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);
