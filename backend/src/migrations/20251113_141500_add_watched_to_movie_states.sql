-- Migration: Add is_watched field to movie_states table
-- This migration adds watched status tracking to movies

-- Add is_watched column
ALTER TABLE movie_states ADD COLUMN is_watched INTEGER DEFAULT 0 CHECK(is_watched IN (0, 1));

-- Add watched_at column
ALTER TABLE movie_states ADD COLUMN watched_at DATETIME;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_movie_states_is_watched ON movie_states(is_watched);

