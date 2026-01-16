-- Migration: Create recommendations table
-- This table stores content recommendations from various sources

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL CHECK(media_type IN ('video', 'movie', 'tv_show')),
  media_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('tmdb', 'youtube', 'manual', 'algorithm')),
  source_id TEXT,
  score REAL,
  reason TEXT,
  dismissed BOOLEAN DEFAULT 0,
  dismissed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recommendations_media ON recommendations(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_source ON recommendations(source_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_dismissed ON recommendations(dismissed);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score);
