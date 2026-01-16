-- Migration: Set added_to_playlist_at from added_to_latest_at
-- This migration backfills added_to_playlist_at for videos that have added_to_latest_at
-- but NULL added_to_playlist_at. This ensures videos added via "Refresh Group" show
-- the correct "Added" date in the Feed tab.

-- Update videos where added_to_latest_at is set but added_to_playlist_at is NULL
UPDATE videos
SET added_to_playlist_at = added_to_latest_at
WHERE added_to_latest_at IS NOT NULL
  AND added_to_playlist_at IS NULL;
