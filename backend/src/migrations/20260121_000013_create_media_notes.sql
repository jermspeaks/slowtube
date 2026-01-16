-- Migration: Create media_notes table
-- This table allows users to add personal notes, quotes, reviews, and ratings to media

CREATE TABLE IF NOT EXISTS media_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL CHECK(media_type IN ('video', 'movie', 'tv_show', 'episode')),
  media_id INTEGER NOT NULL,
  note_type TEXT CHECK(note_type IN ('note', 'quote', 'review', 'rating')),
  content TEXT NOT NULL,
  timestamp_seconds REAL, -- For video notes at specific timestamps
  rating INTEGER CHECK(rating BETWEEN 1 AND 10), -- 1-10 rating scale
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_notes_media ON media_notes(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_media_notes_note_type ON media_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_media_notes_rating ON media_notes(rating);
