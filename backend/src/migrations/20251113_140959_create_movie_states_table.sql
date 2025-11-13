-- Migration: Create movie_states table
-- This migration creates a table for storing movie states (archived, starred)

-- Movie States table
CREATE TABLE IF NOT EXISTS movie_states (
  movie_id INTEGER NOT NULL PRIMARY KEY,
  is_archived INTEGER DEFAULT 0 CHECK(is_archived IN (0, 1)),
  is_starred INTEGER DEFAULT 0 CHECK(is_starred IN (0, 1)),
  archived_at DATETIME,
  starred_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_movie_states_is_archived ON movie_states(is_archived);
CREATE INDEX IF NOT EXISTS idx_movie_states_is_starred ON movie_states(is_starred);

