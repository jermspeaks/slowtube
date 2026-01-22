-- Migration: Create channel_states table
-- This migration creates a table for storing channel states (archived)

-- Channel States table
CREATE TABLE IF NOT EXISTS channel_states (
  youtube_channel_id TEXT NOT NULL PRIMARY KEY,
  is_archived INTEGER DEFAULT 0 CHECK(is_archived IN (0, 1)),
  archived_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (youtube_channel_id) REFERENCES channels(youtube_channel_id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_channel_states_is_archived ON channel_states(is_archived);
