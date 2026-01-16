-- Migration: Add channel_id foreign key to videos table
-- This migration adds a channel_id column to videos and populates it by matching youtube_channel_id

-- Step 1: Add channel_id column (nullable initially)
ALTER TABLE videos ADD COLUMN channel_id INTEGER;

-- Step 2: Populate channel_id by matching youtube_channel_id
UPDATE videos
SET channel_id = (
  SELECT id FROM channels 
  WHERE channels.youtube_channel_id = videos.youtube_channel_id
)
WHERE youtube_channel_id IS NOT NULL;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);

-- Note: Foreign key constraint will be added in a later migration after ensuring data integrity
-- SQLite requires table recreation to add foreign keys, which is complex and risky
-- For now, we rely on application-level referential integrity
