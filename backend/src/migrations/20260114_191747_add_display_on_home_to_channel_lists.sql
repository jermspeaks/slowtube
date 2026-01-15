-- Migration: Add display_on_home column to channel_lists table
-- This migration adds a column to track which channel groups should be displayed on the dashboard

-- Add display_on_home column
ALTER TABLE channel_lists ADD COLUMN display_on_home INTEGER DEFAULT 0 CHECK(display_on_home IN (0, 1));

-- Create index for better query performance when filtering by display_on_home
CREATE INDEX IF NOT EXISTS idx_channel_lists_display_on_home ON channel_lists(display_on_home);
