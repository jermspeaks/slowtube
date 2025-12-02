-- Migration: Create channel lists tables
-- This migration creates tables for storing channel lists and list items

-- Channel Lists table
CREATE TABLE IF NOT EXISTS channel_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Channel List Items table
CREATE TABLE IF NOT EXISTS channel_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  youtube_channel_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES channel_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (youtube_channel_id) REFERENCES channels(youtube_channel_id) ON DELETE CASCADE,
  UNIQUE(list_id, youtube_channel_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_channel_list_items_list_id ON channel_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_channel_list_items_youtube_channel_id ON channel_list_items(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_list_items_position ON channel_list_items(list_id, position);

