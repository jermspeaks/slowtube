-- Migration: Migrate channel_lists and movie_playlists to unified collections
-- This migration moves all existing data to the new unified model

-- Step 1: Migrate channel_lists to collections
INSERT OR IGNORE INTO collections (id, name, description, collection_type, color, sort_order, display_on_home, created_at, updated_at)
SELECT id, name, description, 'channel_list', color, sort_order, display_on_home, created_at, updated_at
FROM channel_lists;

-- Step 2: Migrate channel_list_items to collection_items
INSERT OR IGNORE INTO collection_items (collection_id, media_type, media_id, position, added_at)
SELECT list_id, 'channel', 
  (SELECT id FROM channels WHERE youtube_channel_id = cli.youtube_channel_id LIMIT 1),
  position, added_at
FROM channel_list_items cli
WHERE EXISTS (SELECT 1 FROM channels WHERE youtube_channel_id = cli.youtube_channel_id);

-- Step 3: Migrate movie_playlists to collections
-- Use a high offset for IDs to avoid conflicts (assuming channel_lists won't exceed 10000)
INSERT OR IGNORE INTO collections (id, name, description, collection_type, color, sort_order, display_on_home, created_at, updated_at)
SELECT id + 10000, name, description, 'movie_playlist', color, sort_order, display_on_home, created_at, updated_at
FROM movie_playlists;

-- Step 4: Migrate movie_playlist_items to collection_items
INSERT OR IGNORE INTO collection_items (collection_id, media_type, media_id, position, added_at)
SELECT playlist_id + 10000, 'movie', movie_id, position, added_at
FROM movie_playlist_items;

-- Note: Old tables are kept for backward compatibility during transition
-- They will be removed in a later migration after all code is updated
