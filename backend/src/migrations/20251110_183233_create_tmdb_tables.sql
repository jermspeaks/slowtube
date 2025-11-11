-- Migration: Create TMDB tables (tv_shows, movies, episodes, tv_show_states)
-- This migration creates tables for storing TV shows, movies, and episodes from TMDB

-- TV Shows table
CREATE TABLE IF NOT EXISTS tv_shows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date TEXT,
  last_air_date TEXT,
  status TEXT,
  saved_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL UNIQUE,
  imdb_id TEXT,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  saved_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tv_show_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  air_date TEXT,
  runtime INTEGER,
  still_path TEXT,
  is_watched INTEGER DEFAULT 0 CHECK(is_watched IN (0, 1)),
  watched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tv_show_id) REFERENCES tv_shows(id) ON DELETE CASCADE,
  UNIQUE(tv_show_id, season_number, episode_number)
);

-- TV Show States table
CREATE TABLE IF NOT EXISTS tv_show_states (
  tv_show_id INTEGER NOT NULL PRIMARY KEY,
  is_archived INTEGER DEFAULT 0 CHECK(is_archived IN (0, 1)),
  archived_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tv_show_id) REFERENCES tv_shows(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tv_shows_tmdb_id ON tv_shows(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tv_shows_status ON tv_shows(status);
CREATE INDEX IF NOT EXISTS idx_tv_shows_first_air_date ON tv_shows(first_air_date);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX IF NOT EXISTS idx_episodes_tv_show_id ON episodes(tv_show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);
CREATE INDEX IF NOT EXISTS idx_episodes_is_watched ON episodes(is_watched);
CREATE INDEX IF NOT EXISTS idx_tv_show_states_is_archived ON tv_show_states(is_archived);

