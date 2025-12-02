-- Add added_to_latest_at column to videos table
-- This tracks when videos were fetched via the latest endpoint
-- Videos with this timestamp set and no state are considered "latest" videos
ALTER TABLE videos ADD COLUMN added_to_latest_at DATETIME NULL;

