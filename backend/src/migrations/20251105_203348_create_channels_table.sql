-- Migration: Create channels table
-- This migration creates the channels table to store channel information
-- It's safe to run multiple times (idempotent) - migration runner checks for existing table

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_channel_id TEXT NOT NULL UNIQUE,
  channel_title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  subscriber_count INTEGER,
  is_subscribed INTEGER DEFAULT 0 CHECK(is_subscribed IN (0, 1)),
  custom_tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_channels_youtube_channel_id ON channels(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_subscribed ON channels(is_subscribed);

