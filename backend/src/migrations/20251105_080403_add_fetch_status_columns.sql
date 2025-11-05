-- Migration: Add fetch_status columns and related fields
-- This migration adds columns for YouTube API fetch functionality
-- It's safe to run multiple times (idempotent) - migration runner checks for existing columns

-- Add added_to_playlist_at column
ALTER TABLE videos ADD COLUMN added_to_playlist_at TEXT;

-- Add fetch_status column with default value
ALTER TABLE videos ADD COLUMN fetch_status TEXT DEFAULT 'pending';

-- Add channel_title column
ALTER TABLE videos ADD COLUMN channel_title TEXT;

-- Add youtube_url column
ALTER TABLE videos ADD COLUMN youtube_url TEXT;

-- Create index on fetch_status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_videos_fetch_status ON videos(fetch_status);

