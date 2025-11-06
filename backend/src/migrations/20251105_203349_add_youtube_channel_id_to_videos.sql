-- Migration: Add youtube_channel_id to videos table
-- This migration adds the youtube_channel_id column to the videos table
-- It's safe to run multiple times (idempotent) - migration runner checks for existing columns

-- Add youtube_channel_id column to videos table
ALTER TABLE videos ADD COLUMN youtube_channel_id TEXT;

-- Create index on youtube_channel_id for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_youtube_channel_id ON videos(youtube_channel_id);

