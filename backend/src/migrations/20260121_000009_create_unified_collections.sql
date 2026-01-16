-- Migration: Create unified collections and collection_items tables
-- This replaces separate channel_lists and movie_playlists with a unified model

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  collection_type TEXT CHECK(collection_type IN ('channel_list', 'movie_playlist', 'mixed')),
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  display_on_home INTEGER DEFAULT 0 CHECK(display_on_home IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK(media_type IN ('channel', 'movie', 'video', 'tv_show')),
  media_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_id, media_type, media_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collections_collection_type ON collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_collections_display_on_home ON collections(display_on_home);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_media ON collection_items(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_position ON collection_items(collection_id, position);
