-- Migration: Create media_relationships table
-- This table allows linking related content across different media types

CREATE TABLE IF NOT EXISTS media_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK(source_type IN ('video', 'movie', 'tv_show', 'episode')),
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('video', 'movie', 'tv_show', 'episode')),
  target_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('related', 'based_on', 'remake', 'sequel', 'prequel')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_relationships_source ON media_relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_media_relationships_target ON media_relationships(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_media_relationships_type ON media_relationships(relationship_type);
