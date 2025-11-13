-- Migration: Create movie playlists tables
-- This migration creates tables for storing movie playlists and playlist items

-- Movie Playlists table
CREATE TABLE IF NOT EXISTS movie_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Movie Playlist Items table
CREATE TABLE IF NOT EXISTS movie_playlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  movie_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES movie_playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  UNIQUE(playlist_id, movie_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_movie_playlist_items_playlist_id ON movie_playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_movie_playlist_items_movie_id ON movie_playlist_items(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_playlist_items_position ON movie_playlist_items(playlist_id, position);

