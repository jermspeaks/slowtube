-- Migration: Migrate existing state data to unified media_states table
-- This migration moves all state data from separate tables to the unified media_states table

-- Step 1: Migrate video_states to media_states
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'video', video_id, state, updated_at
FROM video_states;

-- Step 2: Migrate tv_show_states.is_archived to media_states
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'tv_show', tv_show_id, 'archive', updated_at
FROM tv_show_states
WHERE is_archived = 1;

-- Step 3: Migrate tv_show_states.is_started to media_states
-- First insert, then update if exists
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'tv_show', tv_show_id, 'started', COALESCE(started_at, updated_at)
FROM tv_show_states
WHERE is_started = 1;
UPDATE media_states SET state = 'started', updated_at = COALESCE((SELECT started_at FROM tv_show_states WHERE tv_show_states.tv_show_id = media_states.media_id), media_states.updated_at)
WHERE media_type = 'tv_show' AND media_id IN (SELECT tv_show_id FROM tv_show_states WHERE is_started = 1);

-- Step 4: Migrate movie_states.is_archived to media_states
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'movie', movie_id, 'archive', updated_at
FROM movie_states
WHERE is_archived = 1;

-- Step 5: Migrate movie_states.is_starred to media_states
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'movie', movie_id, 'starred', COALESCE(starred_at, updated_at)
FROM movie_states
WHERE is_starred = 1;
UPDATE media_states SET state = 'starred', updated_at = COALESCE((SELECT starred_at FROM movie_states WHERE movie_states.movie_id = media_states.media_id), media_states.updated_at)
WHERE media_type = 'movie' AND media_id IN (SELECT movie_id FROM movie_states WHERE is_starred = 1);

-- Step 6: Migrate movie_states.is_watched to media_states
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'movie', movie_id, 'watched', COALESCE(watched_at, updated_at)
FROM movie_states
WHERE is_watched = 1;
UPDATE media_states SET state = 'watched', updated_at = COALESCE((SELECT watched_at FROM movie_states WHERE movie_states.movie_id = media_states.media_id), media_states.updated_at)
WHERE media_type = 'movie' AND media_id IN (SELECT movie_id FROM movie_states WHERE is_watched = 1);

-- Step 7: Migrate episodes.is_watched to media_states
INSERT OR IGNORE INTO media_states (media_type, media_id, state, updated_at)
SELECT 'episode', id, 'watched', COALESCE(watched_at, updated_at)
FROM episodes
WHERE is_watched = 1;

-- Note: Old state tables are kept for backward compatibility during transition
-- They will be removed in a later migration after all code is updated
