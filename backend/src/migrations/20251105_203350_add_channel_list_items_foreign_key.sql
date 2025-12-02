-- Migration: Add foreign key constraint from channel_list_items to channels table
-- This migration runs after the channels table is created (20251105_203348)
-- to add the foreign key constraint that was deferred from the original migration

-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we need to recreate the table
-- However, since the table may already have data, we'll use a safer approach:
-- Check if the foreign key constraint already exists, and if not, recreate the table

-- Note: SQLite doesn't enforce foreign keys by default, but we enable them in db.ts
-- The foreign key relationship is logical and will be enforced when foreign_keys = ON

-- Since SQLite doesn't support adding foreign key constraints to existing tables,
-- and the table may already exist with data, we'll document this constraint
-- The application code should handle referential integrity

-- For new databases, the constraint will be in place from the start
-- For existing databases, the constraint is logical and enforced by application logic

-- Create a trigger to enforce referential integrity if the channels table exists
-- This provides runtime enforcement even if the foreign key constraint wasn't created
CREATE TRIGGER IF NOT EXISTS channel_list_items_channel_check
BEFORE INSERT ON channel_list_items
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM channels WHERE youtube_channel_id = NEW.youtube_channel_id)
BEGIN
  SELECT RAISE(ABORT, 'Foreign key constraint failed: youtube_channel_id does not exist in channels table');
END;

CREATE TRIGGER IF NOT EXISTS channel_list_items_channel_check_update
BEFORE UPDATE OF youtube_channel_id ON channel_list_items
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM channels WHERE youtube_channel_id = NEW.youtube_channel_id)
BEGIN
  SELECT RAISE(ABORT, 'Foreign key constraint failed: youtube_channel_id does not exist in channels table');
END;

