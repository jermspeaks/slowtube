-- Migration: Add display_on_home column to movie_playlists table
-- This migration adds a column to track which movie playlists should be displayed on the dashboard

-- Add display_on_home column
ALTER TABLE movie_playlists ADD COLUMN display_on_home INTEGER DEFAULT 0 CHECK(display_on_home IN (0, 1));

-- Create index for better query performance when filtering by display_on_home
CREATE INDEX IF NOT EXISTS idx_movie_playlists_display_on_home ON movie_playlists(display_on_home);
