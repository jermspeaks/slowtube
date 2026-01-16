-- Migration: Create unified media_states table
-- This migration creates a unified state management table for all media types

CREATE TABLE IF NOT EXISTS media_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL CHECK(media_type IN ('video', 'movie', 'tv_show', 'episode')),
  media_id INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('feed', 'inbox', 'archive', 'watched', 'started', 'starred')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(media_type, media_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_states_media ON media_states(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_media_states_state ON media_states(state);
CREATE INDEX IF NOT EXISTS idx_media_states_updated_at ON media_states(updated_at);
