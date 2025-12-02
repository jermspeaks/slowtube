-- Migration: Backfill video created_at timestamps
-- This migration ensures all videos have a created_at timestamp for displaying "added to feed" dates
-- For videos with NULL created_at, we use updated_at as a fallback, or current timestamp if both are NULL

-- Update videos where created_at is NULL
-- Use updated_at if available, otherwise use current timestamp
UPDATE videos
SET created_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL;

