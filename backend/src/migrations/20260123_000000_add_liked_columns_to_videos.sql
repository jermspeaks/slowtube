-- Migration: Add is_liked and liked_at columns to videos table
-- This migration adds support for tracking liked videos

-- Add is_liked column
ALTER TABLE videos ADD COLUMN is_liked INTEGER DEFAULT 0 CHECK(is_liked IN (0, 1));

-- Add liked_at column
ALTER TABLE videos ADD COLUMN liked_at DATETIME;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_videos_is_liked ON videos(is_liked);
